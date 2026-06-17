#!/bin/bash
# =============================================================================
# backup.sh — PostgreSQL backup for Lumina Finance
# Usage:  ./scripts/backup.sh
# Cron:   0 3 * * * /opt/lumina/scripts/backup.sh >> /var/log/lumina-backup.log 2>&1
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${APP_DIR}/backups"
DATE=$(date '+%Y%m%d_%H%M%S')
FILENAME="backup_${DATE}.sql"
KEEP_DAYS=30

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $*" >&2; exit 1; }

# ─── Load env ─────────────────────────────────────────────────────────────────
[ -f "${APP_DIR}/.env" ] || fail ".env not found"
# shellcheck disable=SC1091
set -a; source "${APP_DIR}/.env"; set +a

: "${POSTGRES_DB:?POSTGRES_DB not set}"
: "${POSTGRES_USER:?POSTGRES_USER not set}"

# ─── Prepare ──────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
log "Starting backup → $FILENAME"

# ─── Run pg_dump inside the postgres container ────────────────────────────────
docker exec lumina_postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-password \
  > "${BACKUP_DIR}/${FILENAME}"

# ─── Compress ─────────────────────────────────────────────────────────────────
gzip "${BACKUP_DIR}/${FILENAME}"
FINAL="${BACKUP_DIR}/${FILENAME}.gz"
SIZE=$(du -sh "$FINAL" | cut -f1)
ok "Backup saved: $FINAL ($SIZE)"

# ─── Purge old backups ────────────────────────────────────────────────────────
log "Removing backups older than ${KEEP_DAYS} days..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
REMAINING=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)
ok "Retention: $REMAINING backup(s) kept."
