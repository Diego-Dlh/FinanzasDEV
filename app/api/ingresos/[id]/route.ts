import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { incomeSchema } from '@/lib/validators';
import { api, HttpError, parseBody } from '@/lib/http';
import { validateCategory } from '@/lib/categories';
import { lockIncome } from '@/lib/rowLocks';

interface Params { params: Promise<{ id: string }> }

async function handlePut(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const data = await parseBody(request, incomeSchema.partial());
  if (data.categoryId && data.categoryId !== existing.categoryId) {
    await validateCategory(data.categoryId, 'INCOME');
  }

  const income = await prisma.$transaction(async (tx) => {
    // Lock, then re-read: the balance difference must be computed from the current row
    await lockIncome(tx, id);
    const current = await tx.income.findFirst({ where: { id, userId } });
    if (!current) throw new HttpError(404, 'No encontrado');

    const newAmount    = data.amount    ?? current.amount;
    const newAccountId = data.accountId ?? current.accountId;
    const accountChanged = newAccountId !== current.accountId;

    if (accountChanged) {
      const account = await tx.account.findFirst({ where: { id: newAccountId, userId } });
      if (!account) throw new HttpError(404, 'Cuenta no encontrada');
    }

    const updated = await tx.income.update({
      where: { id },
      data: {
        name:       data.name       ?? current.name,
        amount:     newAmount,
        categoryId: data.categoryId ?? current.categoryId,
        accountId:  newAccountId,
        date:       data.date       ? new Date(data.date) : current.date,
        frequency:  data.frequency  ?? current.frequency,
      },
    });

    if (accountChanged) {
      await tx.account.update({ where: { id: current.accountId }, data: { balance: { decrement: current.amount } } });
      await tx.account.update({ where: { id: newAccountId },      data: { balance: { increment: newAmount } } });
    } else if (newAmount !== current.amount) {
      await tx.account.update({ where: { id: current.accountId }, data: { balance: { increment: newAmount - current.amount } } });
    }
    return updated;
  });

  return NextResponse.json({ income });
}

async function handleDelete(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  await prisma.$transaction(async (tx) => {
    // Lock, then re-read: concurrent deletes must reverse the balance exactly once
    await lockIncome(tx, id);
    const current = await tx.income.findFirst({ where: { id, userId } });
    if (!current) throw new HttpError(404, 'No encontrado');

    await tx.income.delete({ where: { id } });
    await tx.account.update({
      where: { id: current.accountId },
      data: { balance: { decrement: current.amount } },
    });
  });

  return NextResponse.json({ ok: true });
}

export const PUT = api(handlePut);
export const DELETE = api(handleDelete);
