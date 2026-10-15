import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { HttpError, errorResponse } from '@/lib/http';

interface Params { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const payment = await prisma.payment.findFirst({ where: { id, userId } });
  if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  const debt = await prisma.debt.findFirst({ where: { id: payment.debtId, userId } });
  if (!debt) return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Deleting first makes the reversal happen exactly once, even on a double click
      const deleted = await tx.payment.deleteMany({ where: { id, userId } });
      if (deleted.count !== 1) throw new HttpError(404, 'Pago no encontrado');

      await tx.debt.update({
        where: { id: payment.debtId },
        data: { balance: { increment: payment.amount } },
      });

      if (payment.accountId) {
        await tx.account.updateMany({
          where: { id: payment.accountId, userId },
          data: { balance: { increment: payment.amount } },
        });
      }

      if (payment.expenseId) {
        await tx.expense.deleteMany({ where: { id: payment.expenseId, userId } });
      }
    });
  } catch (error) {
    return errorResponse(error);
  }

  return NextResponse.json({ ok: true });
}
