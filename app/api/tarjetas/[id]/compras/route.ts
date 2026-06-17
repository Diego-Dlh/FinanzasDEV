import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId } = await params;
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const purchases = await prisma.cardPurchase.findMany({
    where: { cardId },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json({ purchases });
}

export async function POST(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId } = await params;
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const { description, categoryId, totalAmount, installments, date } = body;
  const total = Number(totalAmount);
  const numInstallments = Number(installments) || 1;
  const installmentAmt = total / numInstallments;

  const [purchase] = await prisma.$transaction([
    prisma.cardPurchase.create({
      data: {
        userId,
        cardId,
        categoryId,
        description,
        totalAmount: total,
        installments: numInstallments,
        installmentAmt,
        date: new Date(date),
      },
      include: { category: true },
    }),
    prisma.creditCard.update({
      where: { id: cardId },
      data: { usedBalance: { increment: total } },
    }),
  ]);

  return NextResponse.json({ purchase }, { status: 201 });
}
