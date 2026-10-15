#!/bin/bash
# =============================================================================
# auto-deploy.sh — Lumina Finance auto-deploy on new commits
# Cron: */2 * * * * /ruta/a/FinanzasDEV/scripts/auto-deploy.sh
# Opcional: LUMINA_LOG_FILE=/var/log/lumina-autodeploy.log (por defecto logs/ del repo)
# =============================================================================
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${LUMINA_LOG_FILE:-$APP_DIR/logs/autodeploy.log}"
LOCK_FILE="/tmp/lumina-deploy.lock"

cd "$APP_DIR" || exit 1
mkdir -p "$(dirname "$LOG_FILE")"

# Evita deploys simultáneos (flock libera el lock aunque el proceso muera)
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

LOCAL=$(git rev-parse HEAD 2>/dev/null)
git fetch origin main --quiet 2>/dev/null
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "" >> "$LOG_FILE"
    echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Nuevo commit detectado: $LOCAL → $REMOTE ===" >> "$LOG_FILE"
    bash "$APP_DIR/scripts/deploy.sh" >> "$LOG_FILE" 2>&1
    echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Deploy finalizado (exit $?) ===" >> "$LOG_FILE"
fi
