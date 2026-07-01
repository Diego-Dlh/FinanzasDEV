import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { paymentSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
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

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const parse = paymentSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { debtId, amount, accountId } = parse.data;

  const debt = await prisma.debt.findFirst({ where: { id: debtId, userId } });
  if (!debt) return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });

  if (amount > debt.balance) {
    return NextResponse.json(
      { error: `El pago no puede superar el saldo de la deuda (${debt.balance.toLocaleString('es-CO')} COP)` },
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

  const newBalance = Math.max(0, debt.balance - amount);

  const payment = await prisma.$transaction(async (tx) => {
    let expenseId: string | null = null;

    if (account && accountId) {
      const cat = await tx.category.upsert({
        where: { name: 'Pago de Deuda' },
        create: { name: 'Pago de Deuda', type: 'EXPENSE' },
        update: {},
      });
      const expense = await tx.expense.create({
        data: {
          userId,
          accountId,
          categoryId: cat.id,
          description: `Pago: ${debt.name} (${debt.entity})`,
          amount,
          date: new Date(),
          frequency: 'ONE_TIME',
        },
      });
      expenseId = expense.id;
      await tx.account.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
    }

    const payment = await tx.payment.create({
      data: { userId, debtId, amount, accountId: accountId ?? null, expenseId },
    });
    await tx.debt.update({ where: { id: debtId }, data: { balance: newBalance } });

    return payment;
  });

  return NextResponse.json({ payment, newBalance }, { status: 201 });
}
