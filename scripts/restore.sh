#!/bin/bash
# =============================================================================
# restore.sh — Restore a PostgreSQL backup for Lumina Finance
# Usage: ./scripts/restore.sh backups/backup_20260617_030000.sql.gz
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $*" >&2; exit 1; }

BACKUP_FILE="${1:-}"
[ -n "$BACKUP_FILE" ] || fail "Usage: $0 <backup_file.sql.gz>"
[ -f "$BACKUP_FILE" ] || fail "Backup file not found: $BACKUP_FILE"

# ─── Load env ─────────────────────────────────────────────────────────────────
[ -f "${APP_DIR}/.env" ] || fail ".env not found"
# shellcheck disable=SC1091
set -a; source "${APP_DIR}/.env"; set +a

: "${POSTGRES_DB:?POSTGRES_DB not set}"
: "${POSTGRES_USER:?POSTGRES_USER not set}"

# ─── Confirm ──────────────────────────────────────────────────────────────────
echo ""
echo "  ⚠️  WARNING: This will REPLACE all data in database '${POSTGRES_DB}'."
echo "     Backup file: $BACKUP_FILE"
echo ""
read -r -p "  Type 'yes' to confirm: " CONFIRM
[ "$CONFIRM" = "yes" ] || fail "Restore cancelled."

log "Starting restore from: $BACKUP_FILE"

# ─── Restore ──────────────────────────────────────────────────────────────────
log "Dropping and recreating database..."
docker exec lumina_postgres \
  psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" postgres

docker exec lumina_postgres \
  psql -U "$POSTGRES_USER" -c "CREATE DATABASE ${POSTGRES_DB};" postgres

log "Restoring data..."
gunzip -c "$BACKUP_FILE" | docker exec -i lumina_postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --quiet

ok "Restore complete. Database '${POSTGRES_DB}' is ready."
log "Restart the app to reconnect: docker restart lumina_app"
