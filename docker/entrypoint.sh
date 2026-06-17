#!/bin/sh
set -e

echo "[lumina] Waiting for database..."
until npx prisma db execute --stdin <<'SQL' 2>/dev/null
SELECT 1;
SQL
do
  echo "[lumina] Database not ready — retrying in 2s..."
  sleep 2
done

echo "[lumina] Running migrations..."
npx prisma migrate deploy

echo "[lumina] Starting Next.js..."
exec npm start
