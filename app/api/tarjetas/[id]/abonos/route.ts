import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { cardPaymentSchema } from '@/lib/validators';
import { dateOnlyToUTC } from '@/lib/dates';
import { HttpError, errorResponse, formatCOP, readJson } from '@/lib/http';
import { systemCategoryId } from '@/lib/categories';

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

  try {
    const parse = cardPaymentSchema.safeParse(await readJson(request));
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    const { amount, note, paidAt, accountId } = parse.data;

    // Friendly pre-checks. The guarded updates below re-check at write time,
    // which is what protects against concurrent requests (double click).
    if (amount > card.usedBalance) {
      throw new HttpError(400, `El abono no puede superar el saldo de la tarjeta (${formatCOP(card.usedBalance)})`);
    }

    if (accountId) {
      const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
      if (amount > account.balance) {
        throw new HttpError(400, `Saldo insuficiente en la cuenta seleccionada (${formatCOP(account.balance)} disponibles)`);
      }
    }

    const paymentDate = dateOnlyToUTC(paidAt);

    const payment = await prisma.$transaction(async (tx) => {
      const cardUpdate = await tx.creditCard.updateMany({
        where: { id: cardId, userId, usedBalance: { gte: amount } },
        data: { usedBalance: { decrement: amount } },
      });
      if (cardUpdate.count !== 1) {
        throw new HttpError(400, 'El abono supera el saldo actual de la tarjeta. Actualiza la página e intenta de nuevo.');
      }

      let expenseId: string | null = null;
      if (accountId) {
        const accountUpdate = await tx.account.updateMany({
          where: { id: accountId, userId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (accountUpdate.count !== 1) {
          throw new HttpError(400, 'Saldo insuficiente en la cuenta seleccionada');
        }
        const expense = await tx.expense.create({
          data: {
            userId,
            accountId,
            categoryId: await systemCategoryId(tx, 'cardPayment'),
            description: `Abono: ${card.name} (${card.bank})`,
            amount,
            date: paymentDate,
            frequency: 'ONE_TIME',
          },
        });
        expenseId = expense.id;
      }

      return tx.cardPayment.create({
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
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
