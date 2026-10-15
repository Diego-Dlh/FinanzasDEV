import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { goalUpdateSchema } from '@/lib/validators';
import { dateOnlyToUTC } from '@/lib/dates';
import { api, parseBody } from '@/lib/http';

interface Params { params: Promise<{ id: string }> }

async function handlePut(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const data = await parseBody(request, goalUpdateSchema);
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      targetAmount: data.targetAmount ?? existing.targetAmount,
      currentAmount: data.currentAmount ?? existing.currentAmount,
      targetDate: data.targetDate ? dateOnlyToUTC(data.targetDate) : existing.targetDate,
    },
  });
  return NextResponse.json({ goal });
}

async function handleDelete(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PUT = api(handlePut);
export const DELETE = api(handleDelete);
