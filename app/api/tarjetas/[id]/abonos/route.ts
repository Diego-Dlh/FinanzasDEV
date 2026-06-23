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

  if (amount > card.usedBalance) {
    return NextResponse.json(
      { error: `El abono no puede superar el saldo de la tarjeta (${card.usedBalance.toLocaleString('es-CO')} COP)` },
      { status: 400 }
    );
  }

  const accountId = body.accountId as string | undefined;
  let account = null;
  if (accountId) {
    account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    if (amount > account.balance) {
      return NextResponse.json(
        { error: `Saldo insuficiente en la cuenta seleccionada (${account.balance.toLocaleString('es-CO')} COP disponibles)` },
        { status: 400 }
      );
    }
  }

  const newBalance = Math.max(0, card.usedBalance - amount);

  const ops: Parameters<typeof prisma.$transaction>[0] = [
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
  ];

  if (account && accountId) {
    ops.push(
      prisma.account.update({ where: { id: accountId }, data: { balance: { decrement: amount } } })
    );
  }

  const [payment] = await prisma.$transaction(ops);

  return NextResponse.json({ payment }, { status: 201 });
}
