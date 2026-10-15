import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { SYSTEM_CATEGORY_LIST } from '@/lib/categories';
import { api } from '@/lib/http';

interface Params { params: Promise<{ id: string }> }

async function handlePut(request: Request, { params }: Params) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  if (current.isSystem) {
    return NextResponse.json({ error: 'Es una categoría del sistema y no se puede renombrar' }, { status: 409 });
  }

  if (SYSTEM_CATEGORY_LIST.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Ese nombre está reservado por el sistema' }, { status: 409 });
  }

  const existing = await prisma.category.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (existing) return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });

  const category = await prisma.category.update({
    where: { id },
    data: { name: name.trim() },
    include: { _count: { select: { incomes: true, expenses: true, cardPurchases: true, budgets: true } } },
  });

  return NextResponse.json({ category });
}

async function handleDelete(request: Request, { params }: Params) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { incomes: true, expenses: true, cardPurchases: true, budgets: true } } },
  });
  if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  if (category.isSystem) {
    return NextResponse.json({ error: 'Es una categoría del sistema y no se puede eliminar' }, { status: 409 });
  }

  const totalUsage = category._count.incomes + category._count.expenses + category._count.cardPurchases + category._count.budgets;
  if (totalUsage > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: la categoría está en uso en ${totalUsage} registro(s)` },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PUT = api(handlePut);
export const DELETE = api(handleDelete);
