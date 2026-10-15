#!/bin/bash
# =============================================================================
# restore.sh — Restore a PostgreSQL backup for Lumina Finance
# Usage: ./scripts/restore.sh backups/backup_20260617_030000.sql.gz
#
# Safe by construction:
#   1. stops the app (a connected app would block replacing the database)
#   2. takes a backup of the CURRENT data first (backups/backup_*.sql.gz)
#   3. loads the backup into a temporary database and checks it
#   4. only then swaps it in. If the backup is corrupt, the live database is untouched.
# The app is started again when the script ends, whether the restore worked or not.
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $*" >&2; exit 1; }

BACKUP_FILE="${1:-}"
[ -n "$BACKUP_FILE" ] || fail "Usage: $0 <backup_file.sql.gz>"
[ -f "$BACKUP_FILE" ] || fail "Backup file not found: $BACKUP_FILE"
gzip -t "$BACKUP_FILE" 2>/dev/null || fail "$BACKUP_FILE is not a valid .gz file."

# ─── Load env ─────────────────────────────────────────────────────────────────
cd "$APP_DIR"
[ -f .env ] || fail ".env not found"
# shellcheck source=scripts/lib-env.sh
source "$APP_DIR/scripts/lib-env.sh"
load_env .env

: "${POSTGRES_DB:?POSTGRES_DB not set}"
: "${POSTGRES_USER:?POSTGRES_USER not set}"

# Same stack selection as deploy.sh: COMPOSE_FILE from .env (homelab) or the VPS stack
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }
psql_admin() { docker exec lumina_postgres psql -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 -d postgres "$@"; }

DB="$POSTGRES_DB"
TMP_DB="${DB}_restore"
OLD_DB="${DB}_old"

# ─── Confirm ──────────────────────────────────────────────────────────────────
echo ""
echo "  ⚠️  WARNING: This will REPLACE all data in database '${DB}'."
echo "     Backup file: $BACKUP_FILE"
echo "     (a backup of the current data is taken first)"
echo ""
read -r -p "  Type 'yes' to confirm: " CONFIRM
[ "$CONFIRM" = "yes" ] || fail "Restore cancelled."

# ─── Stop the app; always bring it back ───────────────────────────────────────
APP_STOPPED=0
cleanup() {
  psql_admin -qc "DROP DATABASE IF EXISTS \"${TMP_DB}\" WITH (FORCE);" >/dev/null 2>&1 || true
  if [ "$APP_STOPPED" = 1 ]; then
    log "Starting the app again..."
    compose start app >/dev/null 2>&1 || log "Could not start the app automatically: docker compose -f $COMPOSE_FILE start app"
  fi
}
trap cleanup EXIT

log "Stopping the app..."
compose stop app >/dev/null 2>&1 && APP_STOPPED=1 || log "(could not stop the app via docker compose — make sure nothing is connected to the database)"

log "Backing up the current database first..."
bash "$APP_DIR/scripts/backup.sh" || fail "Safety backup failed; nothing was changed."

# ─── Load into a temporary database and check it ──────────────────────────────
log "Loading the backup into a temporary database..."
psql_admin -qc "DROP DATABASE IF EXISTS \"${TMP_DB}\" WITH (FORCE);"
psql_admin -qc "CREATE DATABASE \"${TMP_DB}\";"
if ! gunzip -c "$BACKUP_FILE" | docker exec -i lumina_postgres \
     psql -U "$POSTGRES_USER" -d "$TMP_DB" -v ON_ERROR_STOP=1 --quiet >/dev/null; then
  fail "The backup could not be loaded (corrupt or incomplete). The live database was NOT touched."
fi
TABLES=$(docker exec lumina_postgres psql -U "$POSTGRES_USER" -d "$TMP_DB" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
[ "${TABLES:-0}" -gt 0 ] || fail "The backup loaded but contains no tables. The live database was NOT touched."
ok "Backup is valid (${TABLES} tables)."

# ─── Swap ─────────────────────────────────────────────────────────────────────
log "Replacing the database..."
psql_admin -qc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('${DB}', '${TMP_DB}') AND pid <> pg_backend_pid();" >/dev/null
psql_admin -qc "DROP DATABASE IF EXISTS \"${OLD_DB}\" WITH (FORCE);"
psql_admin -qc "ALTER DATABASE \"${DB}\" RENAME TO \"${OLD_DB}\";"
psql_admin -qc "ALTER DATABASE \"${TMP_DB}\" RENAME TO \"${DB}\";"
psql_admin -qc "DROP DATABASE \"${OLD_DB}\" WITH (FORCE);"

ok "Restore complete. Database '${DB}' is ready."
log "Pending migrations (if the backup is older than the code) are applied when the app starts."
