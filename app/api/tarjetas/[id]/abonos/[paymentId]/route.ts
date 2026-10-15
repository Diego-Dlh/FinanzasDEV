import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { HttpError, errorResponse } from '@/lib/http';

interface Params { params: Promise<{ id: string; paymentId: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId, paymentId } = await params;

  const payment = await prisma.cardPayment.findFirst({
    where: { id: paymentId, cardId, userId },
  });
  if (!payment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Deleting first makes the reversal happen exactly once, even on a double click
      const deleted = await tx.cardPayment.deleteMany({ where: { id: paymentId, userId } });
      if (deleted.count !== 1) throw new HttpError(404, 'No encontrado');

      // No clamping to the credit limit: what was paid comes back in full
      await tx.creditCard.update({
        where: { id: cardId },
        data: { usedBalance: { increment: payment.amount } },
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
