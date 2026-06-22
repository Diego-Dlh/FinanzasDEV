import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateKey } from '@/lib/adminAuth';

// POST /api/admin/setup?key=SEED_KEY
// Body: { email: string, password: string, name?: string }
// Creates/updates the admin user and ensures an active registration key exists.
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key || key !== process.env.SEED_KEY) {
    return NextResponse.json({ error: 'Clave inválida' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, name } = body as { email: string; password: string; name?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'email y password son requeridos' }, { status: 400 });
  }

  const hashed = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { email },
      data: { password: hashed, isAdmin: true, name: name ?? existing.name },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name ?? 'Admin',
        isAdmin: true,
        settings: { create: { darkMode: false, notifications: true } },
        accounts: {
          create: [{ name: 'Cuenta Principal', type: 'BANK', balance: 0, currency: 'COP' }],
        },
      },
    });
  }

  // Create initial registration key if none exists
  const activeKey = await prisma.registrationKey.findFirst({ where: { active: true } });
  let regKey = activeKey;
  if (!activeKey) {
    regKey = await prisma.registrationKey.create({ data: { code: generateKey(), active: true } });
  }

  return NextResponse.json({ ok: true, userId: user.id, email: user.email, regKey });
}
