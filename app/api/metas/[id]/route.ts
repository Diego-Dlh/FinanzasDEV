import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      targetAmount: body.targetAmount !== undefined ? Number(body.targetAmount) : existing.targetAmount,
      currentAmount: body.currentAmount !== undefined ? Number(body.currentAmount) : existing.currentAmount,
      targetDate: body.targetDate ? new Date(body.targetDate) : existing.targetDate,
    },
  });
  return NextResponse.json({ goal });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
