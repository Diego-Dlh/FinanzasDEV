import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { api } from '@/lib/http';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/admin/conciliacion[?userId=...]   (read-only)
 *
 * Compares each account's stored balance with the sum of its movements
 * (incomes − expenses, which includes debt payments and card payments because they
 * debit the account). `adjustment` = balance − movements: what the balance holds that
 * no movement explains, i.e. an opening balance or a manual edit of the balance.
 *
 * For an account that has only ever been changed through movements, adjustment is 0;
 * anything else is either a legitimate opening balance or drift worth investigating.
 * Nothing is corrected automatically: the app doesn't store opening balances, so
 * recomputing would erase deliberate adjustments.
 */
async function handleGet(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const userId = new URL(request.url).searchParams.get('userId');
  const accounts = await prisma.account.findMany({
    where: userId ? { userId } : undefined,
    orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const where = { accountId: { in: accounts.map((a) => a.id) } };
  const [incomes, expenses] = await Promise.all([
    prisma.income.groupBy({ by: ['accountId'], where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ['accountId'], where, _sum: { amount: true } }),
  ]);
  const incomeOf  = new Map(incomes.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const expenseOf = new Map(expenses.map((r) => [r.accountId, r._sum.amount ?? 0]));

  const report = accounts.map((a) => {
    const income = incomeOf.get(a.id) ?? 0;
    const expense = expenseOf.get(a.id) ?? 0;
    const movements = income - expense;
    return {
      accountId: a.id,
      account: a.name,
      user: a.user,
      balance: a.balance,
      incomes: income,
      expenses: expense,
      movements,
      adjustment: round2(a.balance - movements),
    };
  });

  return NextResponse.json({
    accounts: report,
    withAdjustment: report.filter((r) => r.adjustment !== 0).length,
  });
}

export const GET = api(handleGet);
