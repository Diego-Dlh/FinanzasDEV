import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const accounts = await prisma.account.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { incomes: true, expenses: true } },
    },
  });

  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { userId, name, type, balance, currency } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  if (!type) return NextResponse.json({ error: 'Tipo requerido' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const account = await prisma.account.create({
    data: {
      userId,
      name: name.trim(),
      type,
      balance: Number(balance) || 0,
      currency: currency || 'COP',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { incomes: true, expenses: true } },
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
