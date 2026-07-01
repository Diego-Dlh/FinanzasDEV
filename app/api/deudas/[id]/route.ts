import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { debtSchema } from '@/lib/validators';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.debt.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const parse = debtSchema.partial().safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const debt = await prisma.debt.update({
    where: { id },
    data: {
      name:         parse.data.name         ?? existing.name,
      entity:       parse.data.entity       ?? existing.entity,
      balance:      parse.data.balance      ?? existing.balance,
      interestRate: parse.data.interestRate ?? existing.interestRate,
      minPayment:   parse.data.minPayment   ?? existing.minPayment,
      dueDate:      parse.data.dueDate      ? new Date(parse.data.dueDate) : existing.dueDate,
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

  await prisma.$transaction(async (tx) => {
    const payments = await tx.payment.findMany({ where: { debtId: id } });

    for (const payment of payments) {
      if (payment.accountId) {
        await tx.account.update({ where: { id: payment.accountId }, data: { balance: { increment: payment.amount } } });
      }
      if (payment.expenseId) {
        const expense = await tx.expense.findUnique({ where: { id: payment.expenseId } });
        if (expense) await tx.expense.delete({ where: { id: payment.expenseId } });
      }
      await tx.payment.delete({ where: { id: payment.id } });
    }

    await tx.debt.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
