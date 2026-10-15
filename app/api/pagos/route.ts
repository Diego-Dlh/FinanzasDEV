import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { paymentSchema } from '@/lib/validators';
import { dateOnlyToUTC, todayISO } from '@/lib/dates';
import { api, HttpError, errorResponse, formatCOP, readJson } from '@/lib/http';
import { systemCategoryId } from '@/lib/categories';

async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const debtId = searchParams.get('debtId');

  const payments = await prisma.payment.findMany({
    where: { userId, ...(debtId ? { debtId } : {}) },
    orderBy: { paidAt: 'desc' },
    include: { debt: { select: { name: true, entity: true } } },
  });
  return NextResponse.json({ payments });
}

async function handlePost(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const parse = paymentSchema.safeParse(await readJson(request));
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    const { debtId, amount, accountId } = parse.data;

    // Friendly pre-checks. The guarded updates below re-check at write time,
    // which is what protects against concurrent requests (double click).
    const debt = await prisma.debt.findFirst({ where: { id: debtId, userId } });
    if (!debt) return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });
    if (amount > debt.balance) {
      throw new HttpError(400, `El pago no puede superar el saldo de la deuda (${formatCOP(debt.balance)})`);
    }

    if (accountId) {
      const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
      if (amount > account.balance) {
        throw new HttpError(400, `Saldo insuficiente en la cuenta seleccionada (${formatCOP(account.balance)} disponibles)`);
      }
    }

    const { payment, newBalance } = await prisma.$transaction(async (tx) => {
      const debtUpdate = await tx.debt.updateMany({
        where: { id: debtId, userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debtUpdate.count !== 1) {
        throw new HttpError(400, 'El pago supera el saldo actual de la deuda. Actualiza la página e intenta de nuevo.');
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
            categoryId: await systemCategoryId(tx, 'debtPayment'),
            description: `Pago: ${debt.name} (${debt.entity})`,
            amount,
            date: dateOnlyToUTC(todayISO()), // calendar date, like user-entered expenses
            frequency: 'ONE_TIME',
          },
        });
        expenseId = expense.id;
      }

      const payment = await tx.payment.create({
        data: { userId, debtId, amount, accountId: accountId ?? null, expenseId },
      });
      const updatedDebt = await tx.debt.findUniqueOrThrow({ where: { id: debtId } });
      return { payment, newBalance: updatedDebt.balance };
    });

    return NextResponse.json({ payment, newBalance }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = api(handleGet);
export const POST = api(handlePost);
