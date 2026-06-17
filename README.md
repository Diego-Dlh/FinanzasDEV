# Lumina Finance

Plataforma de finanzas personales premium. Dashboard, ingresos, gastos, deudas, presupuestos, metas y asesor IA.

**Stack:** Next.js 15 · TypeScript · PostgreSQL · Prisma · Tailwind CSS v4 · Docker

---

## Instalación Local (desarrollo)

### Requisitos
- Node.js 20+
- Docker Desktop

```bash
git clone https://github.com/tu-usuario/lumina-finance.git
cd lumina-finance
cp .env.example .env       # editar con tus valores
npm install
docker compose up -d       # levanta PostgreSQL en puerto 5433
npx prisma migrate dev
npm run dev                # http://localhost:3000
```

### Seed (datos de prueba)
```bash
node -e "require('ts-node').register({transpileOnly:true}); require('./prisma/seed.ts')"
```

**Credenciales demo:**
| Usuario | Email | Contraseña |
|---|---|---|
| Alex Sterling (demo) | alex@finanzasdev.com | test1234 |
| Diego De la hoz | diego@finanzasdev.com | 1004360 |
| Melissa Perez | melissa@finanzasdev.com | 108283 |

---

## Docker — Producción (VPS)

### 1. Clonar en el servidor

```bash
git clone https://github.com/tu-usuario/lumina-finance.git /opt/lumina
cd /opt/lumina
cp .env.example .env
```

### 2. Configurar `.env`

```env
POSTGRES_DB=finanzasdev
POSTGRES_USER=lumina_user
POSTGRES_PASSWORD=<contraseña_fuerte>
DATABASE_URL=postgresql://lumina_user:<password>@postgres:5432/finanzasdev
JWT_SECRET=$(openssl rand -base64 64)
SEED_KEY=<clave_para_seed>
```

### 3. Certificado SSL temporal (primer arranque)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/self-signed.key \
  -out nginx/ssl/self-signed.crt \
  -subj "/CN=localhost"
```

### 4. Configurar dominio

```bash
# En nginx/conf.d/app.conf cambiar:
server_name YOUR_DOMAIN;
# Por:
server_name tudominio.com;
```

### 5. Levantar

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 6. Inicializar BD (primera vez)

```bash
curl https://tudominio.com/api/seed?key=TU_SEED_KEY
```

---

## Configuración VPS Hostinger

```bash
# Ubuntu 24.04 — preparar servidor
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
apt install certbot -y
mkdir -p /opt/lumina
```

---

## Configuración Dominio y Cloudflare

| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| A | @ | IP_DEL_VPS | ✅ Proxied |
| A | www | IP_DEL_VPS | ✅ Proxied |

**Cloudflare SSL/TLS:** modo `Full (strict)`

El nginx está configurado con `set_real_ip_from` para todos los rangos de IP de Cloudflare y lee el header `CF-Connecting-IP`.

---

## SSL con Let's Encrypt

```bash
# Detener nginx temporalmente
docker stop lumina_nginx

# Obtener certificado
certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# Copiar al proyecto
cp /etc/letsencrypt/live/tudominio.com/fullchain.pem /opt/lumina/nginx/ssl/
cp /etc/letsencrypt/live/tudominio.com/privkey.pem   /opt/lumina/nginx/ssl/

# En nginx/conf.d/app.conf:
# - Descomentar las líneas de Let's Encrypt
# - Comentar las de self-signed

docker start lumina_nginx
```

### Renovación automática (cron)

```bash
0 3 1 * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/tudominio.com/fullchain.pem /opt/lumina/nginx/ssl/ && \
  cp /etc/letsencrypt/live/tudominio.com/privkey.pem /opt/lumina/nginx/ssl/ && \
  docker exec lumina_nginx nginx -s reload
```

---

## Backups

```bash
# Manual
./scripts/backup.sh

# Automático (cron diario 3am)
# 0 3 * * * /opt/lumina/scripts/backup.sh >> /var/log/lumina-backup.log 2>&1
```

## Restore

```bash
./scripts/restore.sh backups/backup_20260617_030000.sql.gz
```

---

## Actualización

```bash
./scripts/deploy.sh
```

Hace `git pull`, reconstruye imagen, reinicia servicios y verifica healthcheck.

---

## Monitoreo

```bash
# Logs
docker logs -f lumina_app
docker logs -f lumina_nginx

# Health
curl https://tudominio.com/api/health
# → { "status": "ok", "database": "connected", "timestamp": "..." }
```

**Uptime Kuma:** monitorear `https://tudominio.com/api/health` cada 60s, keyword `"status":"ok"`

---

## Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL | ✅ |
| `POSTGRES_DB` | Nombre de la base de datos | ✅ |
| `POSTGRES_USER` | Usuario PostgreSQL | ✅ |
| `POSTGRES_PASSWORD` | Contraseña PostgreSQL | ✅ |
| `JWT_SECRET` | Secret para JWT (mín. 32 chars) | ✅ |
| `SEED_KEY` | Clave para `/api/seed` | Recomendada |

---

## Estructura

```
├── app/api/health/     → GET /api/health (Docker healthcheck)
├── app/api/seed/       → GET /api/seed?key=... (inicialización BD)
├── docker/entrypoint.sh
├── docker-compose.prod.yml
├── nginx/
│   ├── nginx.conf
│   └── conf.d/app.conf
└── scripts/
    ├── deploy.sh
    ├── backup.sh
    └── restore.sh
```
