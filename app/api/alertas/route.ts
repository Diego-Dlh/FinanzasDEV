import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { api } from '@/lib/http';

async function handleGet(request: Request) {
  const userId = await authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where: { userId },
    orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
  });

  const unreadCount = alerts.filter((a) => !a.read).length;
  return NextResponse.json({ alerts, unreadCount });
}

async function handlePut(request: Request) {
  const userId = await authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  if (body.markAllRead) {
    await prisma.alert.updateMany({ where: { userId, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}

export const GET = api(handleGet);
export const PUT = api(handlePut);
