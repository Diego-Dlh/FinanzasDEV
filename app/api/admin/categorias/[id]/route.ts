import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

  const existing = await prisma.category.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (existing) return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });

  const category = await prisma.category.update({
    where: { id },
    data: { name: name.trim() },
    include: { _count: { select: { incomes: true, expenses: true, cardPurchases: true } } },
  });

  return NextResponse.json({ category });
}

export async function DELETE(request: Request, { params }: Params) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { incomes: true, expenses: true, cardPurchases: true } } },
  });
  if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

  const totalUsage = category._count.incomes + category._count.expenses + category._count.cardPurchases;
  if (totalUsage > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: la categoría está en uso en ${totalUsage} registro(s)` },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
