import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { SYSTEM_CATEGORY_LIST } from '@/lib/categories';
import { api } from '@/lib/http';

async function handleGet(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { incomes: true, expenses: true, cardPurchases: true, budgets: true } },
    },
  });

  return NextResponse.json({ categories });
}

async function handlePost(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { name, type } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  if (type !== 'INCOME' && type !== 'EXPENSE') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  const reserved = SYSTEM_CATEGORY_LIST.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  if (reserved) return NextResponse.json({ error: 'Ese nombre está reservado por el sistema' }, { status: 409 });

  const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });

  const category = await prisma.category.create({
    data: { name: name.trim(), type },
    include: { _count: { select: { incomes: true, expenses: true, cardPurchases: true, budgets: true } } },
  });

  return NextResponse.json({ category }, { status: 201 });
}

export const GET = api(handleGet);
export const POST = api(handlePost);
