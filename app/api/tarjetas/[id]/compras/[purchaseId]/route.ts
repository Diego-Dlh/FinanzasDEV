import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { api, HttpError, errorResponse, formatCOP } from '@/lib/http';

interface Params { params: Promise<{ id: string; purchaseId: string }> }

async function handleDelete(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId, purchaseId } = await params;

  const purchase = await prisma.cardPurchase.findFirst({
    where: { id: purchaseId, cardId, userId },
  });
  if (!purchase) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.cardPurchase.deleteMany({ where: { id: purchaseId, userId } });
      if (deleted.count !== 1) throw new HttpError(404, 'No encontrado');

      // The card can't owe less than zero: if the remaining balance is smaller than the
      // purchase, payments were already applied to it and must be removed first.
      const cardUpdate = await tx.creditCard.updateMany({
        where: { id: cardId, userId, usedBalance: { gte: purchase.totalAmount } },
        data: { usedBalance: { decrement: purchase.totalAmount } },
      });
      if (cardUpdate.count !== 1) {
        throw new HttpError(
          409,
          `No se puede eliminar esta compra (${formatCOP(purchase.totalAmount)}) porque el saldo de la tarjeta ya es menor: tiene abonos aplicados. Elimina primero los abonos y vuelve a intentarlo.`,
        );
      }
    });
  } catch (error) {
    return errorResponse(error);
  }

  return NextResponse.json({ ok: true });
}

export const DELETE = api(handleDelete);
