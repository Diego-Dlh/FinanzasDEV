#!/bin/bash
# =============================================================================
# deploy.sh — Lumina Finance VPS deployment script
# Usage: ./scripts/deploy.sh
# =============================================================================
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

cd "$APP_DIR"

# ─── Preconditions ────────────────────────────────────────────────────────────
[ -f ".env" ] || fail ".env file not found. Copy .env.example and fill in values."
[ -f "$COMPOSE_FILE" ] || fail "$COMPOSE_FILE not found."

command -v docker >/dev/null 2>&1   || fail "Docker not installed."
command -v git    >/dev/null 2>&1   || fail "Git not installed."

log "Starting Lumina Finance deployment..."

# ─── Pull latest code ─────────────────────────────────────────────────────────
log "Pulling latest changes from git..."
git pull origin main || fail "git pull failed."
ok "Code updated."

# ─── Build new image ──────────────────────────────────────────────────────────
log "Building Docker image..."
docker compose -f "$COMPOSE_FILE" build --no-cache app
ok "Image built."

# ─── Rolling restart (zero downtime) ──────────────────────────────────────────
log "Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
ok "Services restarted."

# ─── Health check ─────────────────────────────────────────────────────────────
log "Waiting for app to be healthy (up to 120s)..."
for i in $(seq 1 24); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' lumina_app 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    ok "App is healthy!"
    break
  fi
  if [ "$i" -eq 24 ]; then
    fail "App did not become healthy in time. Check: docker logs lumina_app"
  fi
  log "  Status: $STATUS — waiting 5s... ($i/24)"
  sleep 5
done

# ─── Cleanup old images ───────────────────────────────────────────────────────
log "Cleaning up unused Docker images..."
docker image prune -f

ok "Deployment complete. App is running."
echo ""
echo "  Logs:   docker logs -f lumina_app"
echo "  Status: docker compose -f $COMPOSE_FILE ps"
