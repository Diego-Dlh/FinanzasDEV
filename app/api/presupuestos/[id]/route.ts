import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const budget = await prisma.budget.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      allocated: body.allocated !== undefined ? Number(body.allocated) : existing.allocated,
      spent: body.spent !== undefined ? Number(body.spent) : existing.spent,
    },
  });
  return NextResponse.json({ budget });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.budget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
