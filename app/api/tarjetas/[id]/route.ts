import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { creditCardSchema } from '@/lib/validators';
import { api, errorResponse, readJson } from '@/lib/http';

interface Params { params: Promise<{ id: string }> }

async function handleGet(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const card = await prisma.creditCard.findFirst({
    where: { id, userId },
    include: {
      purchases: {
        include: { category: true },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ card });
}

async function handlePut(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.creditCard.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  try {
    const body = await readJson(request);
    const parse = creditCardSchema.partial().safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    const data = parse.data;
    // The schema's default for `currency` must not overwrite it when the field wasn't sent
    const sentCurrency = typeof body === 'object' && body !== null && 'currency' in body;

    const card = await prisma.creditCard.update({
      where: { id },
      data: {
        name:         data.name         ?? existing.name,
        bank:         data.bank         ?? existing.bank,
        creditLimit:  data.creditLimit  ?? existing.creditLimit,
        interestRate: data.interestRate ?? existing.interestRate,
        dueDay:       data.dueDay       ?? existing.dueDay,
        cutDay:       data.cutDay       ?? existing.cutDay,
        currency:     sentCurrency ? (data.currency ?? existing.currency) : existing.currency,
      },
    });

    return NextResponse.json({ card });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleDelete(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cerrar = searchParams.get('modo') === 'cerrar';

  const existing = await prisma.creditCard.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const abonos = await tx.cardPayment.findMany({ where: { cardId: id } });

    for (const abono of abonos) {
      if (!cerrar) {
        // Eliminar: revertir todo
        if (abono.accountId) {
          await tx.account.update({ where: { id: abono.accountId }, data: { balance: { increment: abono.amount } } });
        }
        if (abono.expenseId) {
          const expense = await tx.expense.findUnique({ where: { id: abono.expenseId } });
          if (expense) await tx.expense.delete({ where: { id: abono.expenseId } });
        }
      }
      await tx.cardPayment.delete({ where: { id: abono.id } });
    }

    await tx.cardPurchase.deleteMany({ where: { cardId: id } });
    await tx.creditCard.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}

export const GET = api(handleGet);
export const PUT = api(handlePut);
export const DELETE = api(handleDelete);
