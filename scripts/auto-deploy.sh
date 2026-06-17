#!/bin/bash
# =============================================================================
# auto-deploy.sh — Lumina Finance auto-deploy on new commits
# Cron: */2 * * * * /opt/lumina/scripts/auto-deploy.sh
# =============================================================================
APP_DIR="/opt/lumina"
LOG_FILE="/var/log/lumina-autodeploy.log"
LOCK_FILE="/tmp/lumina-deploy.lock"

cd "$APP_DIR" || exit 1

# Evita deploys simultáneos
if [ -f "$LOCK_FILE" ]; then
    exit 0
fi
touch "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

LOCAL=$(git rev-parse HEAD 2>/dev/null)
git fetch origin main --quiet 2>/dev/null
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "" >> "$LOG_FILE"
    echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Nuevo commit detectado: $LOCAL → $REMOTE ===" >> "$LOG_FILE"
    bash "$APP_DIR/scripts/deploy.sh" >> "$LOG_FILE" 2>&1
    echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Deploy finalizado ===" >> "$LOG_FILE"
fi
