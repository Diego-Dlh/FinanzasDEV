#!/bin/bash
# =============================================================================
# homelab-init.sh — Primer arranque de Lumina Finance en el homelab
#   1. Valida el .env (sin valores CHANGE_ME, secretos con longitud mínima)
#   2. Construye y levanta el stack (las migraciones corren en el entrypoint)
#   3. Crea las categorías y el usuario administrador
#   4. Muestra la clave de registro para invitar usuarios
#
# Uso: ./scripts/homelab-init.sh
# Es idempotente: se puede volver a ejecutar sin duplicar datos.
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

# ─── 1. Validar .env ──────────────────────────────────────────────────────────
[ -f .env ] || fail "No existe .env. Ejecuta: cp .env.homelab.example .env y complétalo."
# shellcheck source=scripts/lib-env.sh
source "$APP_DIR/scripts/lib-env.sh"
load_env .env

if grep -qE '=CHANGE_ME' .env; then
  fail "Hay valores CHANGE_ME sin reemplazar en .env: $(grep -E '=CHANGE_ME' .env | cut -d= -f1 | tr '\n' ' ')"
fi

for var in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD JWT_SECRET SEED_KEY \
           ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD TUNNEL_TOKEN; do
  [ -n "${!var:-}" ] || fail "Falta $var en .env"
done

[ "${#JWT_SECRET}" -ge 32 ]      || fail "JWT_SECRET debe tener al menos 32 caracteres."
[ "${#SEED_KEY}" -ge 16 ]        || fail "SEED_KEY debe tener al menos 16 caracteres."
[ "${#ADMIN_PASSWORD}" -ge 10 ]  || fail "ADMIN_PASSWORD debe tener al menos 10 caracteres."
[[ "$POSTGRES_PASSWORD" =~ ^[A-Za-z0-9]+$ ]] \
  || fail "POSTGRES_PASSWORD solo puede tener letras y números (va dentro de DATABASE_URL)."
[ "${COMPOSE_FILE:-}" = "docker-compose.homelab.yml" ] \
  || fail "COMPOSE_FILE debe ser docker-compose.homelab.yml en .env."

command -v docker >/dev/null 2>&1 || fail "Docker no está instalado."
docker compose version >/dev/null 2>&1 || fail "Falta el plugin 'docker compose' (v2)."
ok ".env válido."

# ─── 2. Levantar el stack ─────────────────────────────────────────────────────
log "Construyendo imagen y levantando servicios (puede tardar varios minutos)..."
docker compose up -d --build

log "Esperando a que la app esté healthy (hasta 3 min)..."
for i in $(seq 1 36); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' lumina_app 2>/dev/null || echo "starting")
  [ "$STATUS" = "healthy" ] && break
  [ "$i" -eq 36 ] && fail "La app no quedó healthy. Revisa: docker logs lumina_app"
  sleep 5
done
ok "App healthy (migraciones aplicadas)."

# ─── 3. Categorías y administrador ───────────────────────────────────────────
# Se llama desde dentro del contenedor: la SEED_KEY nunca pasa por Cloudflare.
call_internal() {
  docker exec lumina_app wget -qO- "http://localhost:3000$1?key=${SEED_KEY}"
}

log "Creando categorías..."
call_internal /api/seed/categorias >/dev/null || fail "Falló /api/seed/categorias"
ok "Categorías listas."

log "Creando administrador ${ADMIN_EMAIL}..."
SETUP_JSON=$(call_internal /api/admin/setup) || fail "Falló /api/admin/setup"
REG_KEY=$(echo "$SETUP_JSON" | sed -n 's/.*"regKey":"\([^"]*\)".*/\1/p')
ok "Administrador listo."

# ─── 4. Resumen ───────────────────────────────────────────────────────────────
TUNNEL_STATE=$(docker inspect --format='{{.State.Status}}' lumina_cloudflared 2>/dev/null || echo "desconocido")
echo ""
echo "  Lumina Finance está corriendo."
echo "  ─────────────────────────────────────────────"
echo "  Admin:              ${ADMIN_EMAIL} (contraseña: la de ADMIN_PASSWORD)"
echo "  Clave de registro:  ${REG_KEY:-ver panel /admin}"
echo "  Túnel cloudflared:  ${TUNNEL_STATE}  (logs: docker logs lumina_cloudflared)"
echo ""
echo "  Abre tu dominio de Cloudflare e inicia sesión con el admin."
echo "  Siguiente paso recomendado: programar backups (docs/HOMELAB.md §6)."
