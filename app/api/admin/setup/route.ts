import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateKey } from '@/lib/adminAuth';

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@luminafi.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Dlh2026';
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? 'Admin Lumina';

// GET /api/admin/setup?key=SEED_KEY
// Idempotent — safe to call on every deploy.
// Creates or updates admin@luminafi.com with isAdmin:true and ensures an active registration key.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key || key !== process.env.SEED_KEY) {
    return NextResponse.json({ error: 'Clave inválida' }, { status: 403 });
  }

  const hashed   = await hashPassword(ADMIN_PASSWORD);
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { isAdmin: true, password: hashed },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email:    ADMIN_EMAIL,
        password: hashed,
        name:     ADMIN_NAME,
        isAdmin:  true,
        settings: { create: { darkMode: false, notifications: true } },
        accounts: {
          create: [
            { name: 'Cuenta Principal', type: 'BANK', balance: 0, currency: 'COP' },
            { name: 'Efectivo',          type: 'CASH', balance: 0, currency: 'COP' },
          ],
        },
        alerts: {
          create: { message: `Panel de admin listo. Accede en /admin`, type: 'SPENDING_ALERT' },
        },
      },
    });
  }

  // Ensure at least one active registration key exists
  const activeKey = await prisma.registrationKey.findFirst({ where: { active: true } });
  const regKey    = activeKey ?? await prisma.registrationKey.create({ data: { code: generateKey(), active: true } });

  return NextResponse.json({
    ok:    true,
    admin: { id: user.id, email: user.email, isAdmin: user.isAdmin },
    regKey: regKey.code,
    created: !existing,
  });
}
