import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.debt.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const debt = await prisma.debt.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      entity: body.entity ?? existing.entity,
      balance: body.balance !== undefined ? Number(body.balance) : existing.balance,
      interestRate: body.interestRate !== undefined ? Number(body.interestRate) : existing.interestRate,
      minPayment: body.minPayment !== undefined ? Number(body.minPayment) : existing.minPayment,
      dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
    },
  });
  return NextResponse.json({ debt });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.debt.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.payment.deleteMany({ where: { debtId: id } });
  await prisma.debt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
