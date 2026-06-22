import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, newThisMonth, activeKey] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: start } } }),
    prisma.registrationKey.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  return NextResponse.json({ totalUsers, newThisMonth, activeKey });
}
