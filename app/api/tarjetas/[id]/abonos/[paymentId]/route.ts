import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

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

  await prisma.$transaction([
    prisma.cardPayment.delete({ where: { id: paymentId } }),
    prisma.creditCard.update({
      where: { id: cardId },
      data: { usedBalance: Math.min(card.creditLimit, card.usedBalance + payment.amount) },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
