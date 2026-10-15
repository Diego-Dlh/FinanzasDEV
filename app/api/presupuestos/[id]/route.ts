import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { budgetSchema } from '@/lib/validators';
import { api, HttpError, parseBody } from '@/lib/http';
import { validateCategory } from '@/lib/categories';

interface Params { params: Promise<{ id: string }> }

async function handlePut(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // `spent` is not accepted: it is computed from the category's spending
  const data = await parseBody(request, budgetSchema.partial());
  if (data.categoryId && data.categoryId !== existing.categoryId) {
    await validateCategory(data.categoryId, 'EXPENSE');
    const duplicate = await prisma.budget.findFirst({ where: { userId, categoryId: data.categoryId, NOT: { id } } });
    if (duplicate) throw new HttpError(409, 'Ya tienes un presupuesto para esa categoría');
  }
  const budget = await prisma.budget.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      allocated: data.allocated ?? existing.allocated,
      categoryId: data.categoryId ?? existing.categoryId,
    },
  });
  return NextResponse.json({ budget });
}

async function handleDelete(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.budget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PUT = api(handlePut);
export const DELETE = api(handleDelete);
