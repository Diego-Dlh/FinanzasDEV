import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const payment = await prisma.payment.findFirst({ where: { id, userId } });
  if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  const debt = await prisma.debt.findFirst({ where: { id: payment.debtId, userId } });
  if (!debt) return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });

    await tx.debt.update({
      where: { id: payment.debtId },
      data: { balance: { increment: payment.amount } },
    });

    if (payment.accountId) {
      await tx.account.update({
        where: { id: payment.accountId },
        data: { balance: { increment: payment.amount } },
      });
    }

    if (payment.expenseId) {
      const expense = await tx.expense.findUnique({ where: { id: payment.expenseId } });
      if (expense) {
        await tx.expense.delete({ where: { id: payment.expenseId } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
