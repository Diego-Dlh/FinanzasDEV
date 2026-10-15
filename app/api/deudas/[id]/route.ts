import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { debtUpdateSchema } from '@/lib/validators';
import { dateOnlyToUTC } from '@/lib/dates';
import { api, parseBody } from '@/lib/http';

interface Params { params: Promise<{ id: string }> }

async function handlePut(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.debt.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // The balance may be set to 0 here (debt paid off)
  const data = await parseBody(request, debtUpdateSchema);

  const debt = await prisma.debt.update({
    where: { id },
    data: {
      name:         data.name         ?? existing.name,
      entity:       data.entity       ?? existing.entity,
      balance:      data.balance      ?? existing.balance,
      interestRate: data.interestRate ?? existing.interestRate,
      minPayment:   data.minPayment   ?? existing.minPayment,
      dueDate:      data.dueDate      ? dateOnlyToUTC(data.dueDate) : existing.dueDate,
    },
  });
  return NextResponse.json({ debt });
}

async function handleDelete(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cerrar = searchParams.get('modo') === 'cerrar';

  const existing = await prisma.debt.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const payments = await tx.payment.findMany({ where: { debtId: id } });

    for (const payment of payments) {
      if (!cerrar) {
        // Eliminar: revertir todo
        if (payment.accountId) {
          await tx.account.update({ where: { id: payment.accountId }, data: { balance: { increment: payment.amount } } });
        }
        if (payment.expenseId) {
          const expense = await tx.expense.findUnique({ where: { id: payment.expenseId } });
          if (expense) await tx.expense.delete({ where: { id: payment.expenseId } });
        }
      }
      await tx.payment.delete({ where: { id: payment.id } });
    }

    await tx.debt.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}

export const PUT = api(handlePut);
export const DELETE = api(handleDelete);
