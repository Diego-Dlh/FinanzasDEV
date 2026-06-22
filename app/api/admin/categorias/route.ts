import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { incomes: true, expenses: true, cardPurchases: true } },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { name, type } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  if (type !== 'INCOME' && type !== 'EXPENSE') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });

  const category = await prisma.category.create({
    data: { name: name.trim(), type },
    include: { _count: { select: { incomes: true, expenses: true, cardPurchases: true } } },
  });

  return NextResponse.json({ category }, { status: 201 });
}
