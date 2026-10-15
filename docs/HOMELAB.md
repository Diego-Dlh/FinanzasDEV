# Despliegue en homelab (Cloudflare Tunnel)

Guía para correr Lumina Finance en un servidor propio x86_64, accesible desde internet mediante **Cloudflare Tunnel**, sin abrir puertos en el router.

```
Internet ──HTTPS──▶ Cloudflare ──túnel (saliente)──▶ cloudflared ──▶ nginx:80 ──▶ app:3000 ──▶ postgres
```

| Servicio | Contenedor | Función |
|----------|-----------|---------|
| `postgres` | `lumina_postgres` | Base de datos (sin puertos publicados) |
| `app` | `lumina_app` | Next.js; aplica migraciones al arrancar |
| `nginx` | `lumina_nginx` | HTTP interno: IP real, rate limiting de login, gzip |
| `cloudflared` | `lumina_cloudflared` | Túnel hacia Cloudflare (HTTPS lo pone Cloudflare) |

Archivos del stack: `docker-compose.homelab.yml`, `nginx/homelab/nginx.conf`, `.env.homelab.example`, `scripts/homelab-init.sh`.

---

## 1. Requisitos

- Linux x86_64 con **Docker Engine** y el plugin **docker compose v2** (`docker compose version`).
- `git`, `openssl` y unos 3 GB libres para la imagen y el build.
- Un dominio gestionado en Cloudflare (DNS en Cloudflare).

## 2. Crear el túnel en Cloudflare

1. Entra a **Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Tipo **Cloudflared**, ponle un nombre (p. ej. `lumina-homelab`).
3. En "Install and run a connector" elige **Docker** y copia **solo el token** (la cadena larga después de `--token`). Va en `TUNNEL_TOKEN`.
4. En **Public Hostname** agrega:
   - Subdominio y dominio: p. ej. `finanzas.tudominio.com`
   - Service: **Type `HTTP`**, URL **`nginx:80`**
5. Guarda. Cloudflare crea el registro DNS automáticamente.

> No hace falta configurar certificados: Cloudflare sirve el HTTPS. En **SSL/TLS → Edge Certificates** activa **Always Use HTTPS**.

## 3. Clonar y configurar

```bash
git clone https://github.com/Diego-Dlh/FinanzasDEV.git
cd FinanzasDEV
cp .env.homelab.example .env
chmod 600 .env
```

Genera los secretos y pégalos en `.env` (reemplaza **todos** los `CHANGE_ME`):

```bash
openssl rand -base64 48 | tr -d '\n/+=' ; echo   # JWT_SECRET
openssl rand -base64 32 | tr -d '\n/+=' ; echo   # SEED_KEY
openssl rand -base64 24 | tr -d '\n/+=' ; echo   # POSTGRES_PASSWORD
```

Completa también `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (mínimo 10 caracteres) y `TUNNEL_TOKEN`.

## 4. Primer arranque

```bash
./scripts/homelab-init.sh
```

El script:
1. Valida el `.env` (sin `CHANGE_ME`, longitudes mínimas).
2. Construye la imagen y levanta el stack; las migraciones de Prisma se aplican solas.
3. Crea las categorías y el usuario administrador **desde dentro del contenedor** (la `SEED_KEY` nunca viaja por internet).
4. Muestra la **clave de registro** para invitar usuarios.

Abre `https://finanzas.tudominio.com` e inicia sesión con el admin.

> Es idempotente: se puede volver a ejecutar sin duplicar datos ni tocar la contraseña del admin si la cambiaste desde la app.
>
> **¿Olvidaste la contraseña del admin?** Restablécela al valor de `ADMIN_PASSWORD` del `.env`:
> ```bash
> docker exec lumina_app wget -qO- "http://localhost:3000/api/admin/setup?key=$(grep ^SEED_KEY= .env | cut -d= -f2-)&resetPassword=1"
> ```

## 5. Operación diaria

```bash
docker compose ps                    # estado (usa COMPOSE_FILE del .env)
docker compose logs -f app           # logs de la app
docker logs -f lumina_cloudflared    # estado del túnel
docker compose restart app
docker exec -it lumina_postgres psql -U lumina_user -d finanzasdev
```

**Actualizar a la última versión de `main`:**

```bash
./scripts/deploy.sh    # git pull + backup + build + restart + healthcheck
```

**Auto-deploy (opcional)** — despliega solo cuando hay commits nuevos en `main`:

```bash
crontab -e
*/5 * * * * /ruta/a/FinanzasDEV/scripts/auto-deploy.sh
```

El log queda en `logs/autodeploy.log`. Ojo: cualquier push a `main` llega a producción sin pasar por tests; considera dejarlo manual hasta tener CI (ver auditoría, I1).

## 6. Backups

`scripts/deploy.sh` ya hace un backup antes de cada despliegue. Para backups diarios:

```bash
crontab -e
0 3 * * * /ruta/a/FinanzasDEV/scripts/backup.sh >> /ruta/a/FinanzasDEV/logs/backup.log 2>&1
```

Los backups quedan en `backups/` (retención 30 días). **Cópialos fuera del servidor** (NAS, disco externo o nube): si el disco del homelab falla, se pierden junto con la base de datos.

Restaurar: `./scripts/restore.sh backups/backup_AAAAMMDD_HHMMSS.sql.gz` (detén antes la app con `docker compose stop app` y luego `docker compose start app`).

## 7. Acceso desde la LAN sin pasar por Cloudflare (opcional)

Descomenta en `docker-compose.homelab.yml`, en el servicio `nginx`:

```yaml
    ports:
      - "8080:80"
```

y entra por `http://IP-DEL-SERVIDOR:8080`. Es HTTP sin cifrar: úsalo solo en una red de confianza.

## 8. Seguridad recomendada en Cloudflare

- **Security → WAF → Rate limiting rules**: una regla para `/api/auth/login` (además del límite de nginx).
- **Zero Trust → Access** (opcional): si la app es solo para ti y tu familia, protege el hostname con una política de Access (login por email) como capa extra.
- Mantén el servidor sin puertos 80/443 abiertos en el router: el túnel no los necesita.

## 9. Solución de problemas

| Síntoma | Causa probable |
|---------|---------------|
| Error 1033 / 502 en el dominio | `cloudflared` caído o el Public Hostname no apunta a `nginx:80` → `docker logs lumina_cloudflared` |
| `homelab-init.sh` dice "La app no quedó healthy" | Revisa `docker logs lumina_app`: suele ser `DATABASE_URL` (contraseña con símbolos) o `JWT_SECRET` faltante |
| 429 Too Many Requests al iniciar sesión | Límite de nginx (5/min por IP con ráfaga de 5); espera un minuto |
| Todos los usuarios comparten el mismo límite | Nginx no recibe `CF-Connecting-IP`; verifica que el tráfico pase por el túnel |

---

**Nota:** los archivos del VPS anterior (`docker-compose.prod.yml`, `nginx/nginx.conf`, `nginx/conf.d/`, `render.yaml`) siguen en el repo pero no los usa el homelab. Se pueden eliminar cuando el VPS y Render se den de baja.
