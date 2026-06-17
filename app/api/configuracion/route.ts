import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const setting = await prisma.setting.upsert({
    where: { userId },
    create: { userId, darkMode: false, notifications: true },
    update: {},
  });

  return NextResponse.json({ setting });
}

export async function PUT(request: Request) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.darkMode    !== undefined) data.darkMode    = Boolean(body.darkMode);
  if (body.notifications !== undefined) data.notifications = Boolean(body.notifications);

  const setting = await prisma.setting.upsert({
    where: { userId },
    create: { userId, darkMode: false, notifications: true, ...data },
    update: data,
  });

  return NextResponse.json({ setting });
}
