#!/bin/sh
set -e

echo "[lumina] Running Prisma migrations..."
npx prisma migrate deploy

echo "[lumina] Starting Next.js..."
exec npm start
