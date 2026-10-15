// Shared helpers for the end-to-end suites. They talk to a RUNNING server over HTTP, so
// they exercise the real routes, validation, transactions and database.
// Configuration comes from environment variables (see tests/README.md).
import pkg from '@prisma/client';

export const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const API = `${BASE}/api`;

function need(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta la variable de entorno ${name} (ver tests/README.md)`);
    process.exit(2);
  }
  return value;
}

export const ADMIN_EMAIL = need('ADMIN_EMAIL');
export const ADMIN_PASSWORD = need('ADMIN_PASSWORD');
export const SEED_KEY = need('SEED_KEY');
// Only the suites that forge tokens need the secret the server signs with
export const jwtSecret = () => need('JWT_SECRET');

/**
 * Makes sure the categories and the admin exist and that the admin has the configured
 * password (a previous aborted run could have changed it). Idempotent.
 */
export async function ensureSeeded() {
  const get = (path) => fetch(`${API}${path}`);
  const cats = await get(`/seed/categorias?key=${encodeURIComponent(SEED_KEY)}`);
  const admin = await get(`/admin/setup?key=${encodeURIComponent(SEED_KEY)}&resetPassword=1`);
  if (!cats.ok || !admin.ok) {
    console.error(`No se pudo preparar el servidor (categorías ${cats.status}, admin ${admin.status}). ¿Está en marcha y con SEED_KEY/ADMIN_* iguales a los de este entorno?`);
    process.exit(2);
  }
}

let prisma;
/** Direct database access for the few checks that need to bypass the API (needs DATABASE_URL). */
export function getPrisma() {
  need('DATABASE_URL');
  prisma ??= new pkg.PrismaClient();
  return prisma;
}
