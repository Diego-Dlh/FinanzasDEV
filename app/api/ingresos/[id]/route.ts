import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const income = await prisma.income.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
      categoryId: body.categoryId ?? existing.categoryId,
      accountId: body.accountId ?? existing.accountId,
      date: body.date ? new Date(body.date) : existing.date,
      frequency: body.frequency ?? existing.frequency,
    },
  });
  return NextResponse.json({ income });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
