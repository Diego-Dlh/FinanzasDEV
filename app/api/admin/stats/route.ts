import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { startOfCurrentMonthInstant } from '@/lib/dates';
import { api } from '@/lib/http';

async function handleGet(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // createdAt is a real timestamp: month boundary in Colombia time
  const start = startOfCurrentMonthInstant();

  const [totalUsers, newThisMonth, activeKey] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: start } } }),
    prisma.registrationKey.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  return NextResponse.json({ totalUsers, newThisMonth, activeKey });
}

export const GET = api(handleGet);
