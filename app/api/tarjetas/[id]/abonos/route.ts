import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId } = await params;
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const payments = await prisma.cardPayment.findMany({
    where: { cardId },
    orderBy: { paidAt: 'desc' },
  });

  return NextResponse.json({ payments });
}

export async function POST(request: Request, { params }: Params) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId } = await params;
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'El monto debe ser positivo' }, { status: 400 });
  }

  const newBalance = Math.max(0, card.usedBalance - amount);

  const [payment] = await prisma.$transaction([
    prisma.cardPayment.create({
      data: {
        userId,
        cardId,
        amount,
        note: body.note ?? null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      },
    }),
    prisma.creditCard.update({
      where: { id: cardId },
      data: { usedBalance: newBalance },
    }),
  ]);

  return NextResponse.json({ payment }, { status: 201 });
}
