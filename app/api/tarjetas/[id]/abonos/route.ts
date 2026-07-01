import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { cardPaymentSchema } from '@/lib/validators';

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
  const parse = cardPaymentSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const { amount, note, paidAt, accountId } = parse.data;

  if (amount > card.usedBalance) {
    return NextResponse.json(
      { error: `El abono no puede superar el saldo de la tarjeta (${card.usedBalance.toLocaleString('es-CO')} COP)` },
      { status: 400 }
    );
  }

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
  const paymentDate = paidAt ? new Date(paidAt) : new Date();

  const payment = await prisma.$transaction(async (tx) => {
    let expenseId: string | null = null;

    if (account && accountId) {
      const cat = await tx.category.upsert({
        where: { name: 'Abono Tarjeta' },
        create: { name: 'Abono Tarjeta', type: 'EXPENSE' },
        update: {},
      });
      const expense = await tx.expense.create({
        data: {
          userId,
          accountId,
          categoryId: cat.id,
          description: `Abono: ${card.name} (${card.bank})`,
          amount,
          date: paymentDate,
          frequency: 'ONE_TIME',
        },
      });
      expenseId = expense.id;
      await tx.account.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
    }

    const payment = await tx.cardPayment.create({
      data: {
        userId,
        cardId,
        amount,
        note: note ?? null,
        paidAt: paymentDate,
        accountId: accountId ?? null,
        expenseId,
      },
    });

    await tx.creditCard.update({ where: { id: cardId }, data: { usedBalance: newBalance } });

    return payment;
  });

  return NextResponse.json({ payment }, { status: 201 });
}
