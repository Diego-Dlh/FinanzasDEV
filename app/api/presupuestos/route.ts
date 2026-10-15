import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { budgetSchema } from '@/lib/validators';
import { api } from '@/lib/http';

async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const budgets = await prisma.budget.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ budgets });
  } catch {
    return NextResponse.json({ budgets: [] });
  }
}

async function handlePost(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const parse = budgetSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const { name, allocated } = parse.data;
  const budget = await prisma.budget.create({ data: { userId, name, allocated, spent: 0 } });
  return NextResponse.json({ budget }, { status: 201 });
}

export const GET = api(handleGet);
export const POST = api(handlePost);
