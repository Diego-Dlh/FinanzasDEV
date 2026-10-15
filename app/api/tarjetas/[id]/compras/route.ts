import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { cardPurchaseSchema } from '@/lib/validators';
import { dateOnlyToUTC } from '@/lib/dates';
import { api, HttpError, errorResponse, formatCOP, readJson } from '@/lib/http';
import { validateCategory } from '@/lib/categories';

interface Params { params: Promise<{ id: string }> }

async function handleGet(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
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

async function handlePost(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cardId } = await params;
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  try {
    const parse = cardPurchaseSchema.safeParse(await readJson(request));
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    const { description, categoryId, totalAmount, installments, date } = parse.data;

    await validateCategory(categoryId, 'EXPENSE');

    const available = Math.max(0, card.creditLimit - card.usedBalance);
    const installmentAmt = totalAmount / installments;

    const purchase = await prisma.$transaction(async (tx) => {
      // Guarded: the limit is re-checked at write time, so concurrent purchases can't exceed it
      const cardUpdate = await tx.creditCard.updateMany({
        where: { id: cardId, userId, usedBalance: { lte: card.creditLimit - totalAmount } },
        data: { usedBalance: { increment: totalAmount } },
      });
      if (cardUpdate.count !== 1) {
        throw new HttpError(400, `La compra supera el cupo disponible de la tarjeta (${formatCOP(available)})`);
      }
      return tx.cardPurchase.create({
        data: {
          userId,
          cardId,
          categoryId,
          description,
          totalAmount,
          installments,
          installmentAmt,
          date: dateOnlyToUTC(date),
        },
        include: { category: true },
      });
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = api(handleGet);
export const POST = api(handlePost);
