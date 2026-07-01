import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const parse = expenseSchema.partial().safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const newAmount    = parse.data.amount    ?? existing.amount;
  const newAccountId = parse.data.accountId ?? existing.accountId;
  const accountChanged = newAccountId !== existing.accountId;
  const amountChanged  = newAmount !== existing.amount;

  const expenseUpdate = prisma.expense.update({
    where: { id },
    data: {
      description: parse.data.description ?? existing.description,
      amount:      newAmount,
      categoryId:  parse.data.categoryId  ?? existing.categoryId,
      accountId:   newAccountId,
      date:        parse.data.date        ? new Date(parse.data.date) : existing.date,
      frequency:   parse.data.frequency   ?? existing.frequency,
    },
  });

  if (accountChanged) {
    const ops = [
      expenseUpdate,
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: existing.amount } } }),
      prisma.account.update({ where: { id: newAccountId },       data: { balance: { decrement: newAmount } } }),
    ] as const;
    const [expense] = await prisma.$transaction([...ops]);
    return NextResponse.json({ expense });
  }

  if (amountChanged) {
    const diff = newAmount - existing.amount;
    const ops = [
      expenseUpdate,
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { decrement: diff } } }),
    ] as const;
    const [expense] = await prisma.$transaction([...ops]);
    return NextResponse.json({ expense });
  }

  const expense = await expenseUpdate;
  return NextResponse.json({ expense });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Si el expense fue creado por un pago de deuda, también restaurar la deuda
    const linkedPayment = await tx.payment.findFirst({ where: { expenseId: id } });
    if (linkedPayment) {
      await tx.debt.update({ where: { id: linkedPayment.debtId }, data: { balance: { increment: linkedPayment.amount } } });
      await tx.payment.delete({ where: { id: linkedPayment.id } });
    }

    // Si el expense fue creado por un abono de tarjeta, también restaurar el saldo de la tarjeta
    const linkedCardPayment = await tx.cardPayment.findFirst({ where: { expenseId: id } });
    if (linkedCardPayment) {
      const card = await tx.creditCard.findUnique({ where: { id: linkedCardPayment.cardId } });
      if (card) {
        await tx.creditCard.update({
          where: { id: linkedCardPayment.cardId },
          data: { usedBalance: Math.min(card.creditLimit, card.usedBalance + linkedCardPayment.amount) },
        });
      }
      await tx.cardPayment.delete({ where: { id: linkedCardPayment.id } });
    }

    await tx.expense.delete({ where: { id } });
    await tx.account.update({ where: { id: existing.accountId }, data: { balance: { increment: existing.amount } } });
  });

  return NextResponse.json({ ok: true });
}
