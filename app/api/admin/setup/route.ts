import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateKey } from '@/lib/adminAuth';
import { api } from '@/lib/http';

const MIN_PASSWORD_LENGTH = 10;

// GET /api/admin/setup?key=SEED_KEY[&resetPassword=1]
// Idempotent. Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
// (or promotes an existing user with that email) and ensures an active
// registration key. An existing admin's password is only overwritten when
// resetPassword=1 is passed — the recovery path if the admin is locked out.
async function handleGet(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!process.env.SEED_KEY || !key || key !== process.env.SEED_KEY) {
    return NextResponse.json({ error: 'Clave inválida' }, { status: 403 });
  }

  const email    = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name     = process.env.ADMIN_NAME?.trim() || 'Administrador';
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Configura ADMIN_EMAIL y ADMIN_PASSWORD en las variables de entorno' },
      { status: 500 },
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
      { status: 500 },
    );
  }

  const resetPassword = searchParams.get('resetPassword') === '1';
  const existing = await prisma.user.findUnique({ where: { email } });

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { email },
      data: {
        isAdmin: true,
        // A reset also signs out every existing session of that account
        ...(resetPassword ? { password: await hashPassword(password), tokenVersion: { increment: 1 } } : {}),
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        password: await hashPassword(password),
        name,
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
    passwordReset: Boolean(existing && resetPassword),
  });
}

export const GET = api(handleGet);
