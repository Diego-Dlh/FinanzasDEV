import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { generateKey } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const key = await prisma.registrationKey.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ key });
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // Deactivate all existing keys and create a new one atomically
  const code = generateKey();
  const [, newKey] = await prisma.$transaction([
    prisma.registrationKey.updateMany({ where: { active: true }, data: { active: false } }),
    prisma.registrationKey.create({ data: { code, active: true } }),
  ]);

  return NextResponse.json({ key: newKey }, { status: 201 });
}
