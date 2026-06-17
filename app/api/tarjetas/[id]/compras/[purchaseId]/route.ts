import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string; purchaseId: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId, purchaseId } = await params;

  const purchase = await prisma.cardPurchase.findFirst({
    where: { id: purchaseId, cardId, userId },
  });
  if (!purchase) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction([
    prisma.cardPurchase.delete({ where: { id: purchaseId } }),
    prisma.creditCard.update({
      where: { id: cardId },
      data: { usedBalance: { decrement: purchase.totalAmount } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
