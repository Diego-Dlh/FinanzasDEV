import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from   = searchParams.get('from');
  const to     = searchParams.get('to');
  const type   = searchParams.get('type') ?? 'ALL';
  const catId  = searchParams.get('categoryId') ?? '';

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to)   dateFilter.lte = new Date(to + 'T23:59:59');

  const catFilter = catId ? { categoryId: catId } : {};

  try {
    const [incomes, expenses] = await Promise.all([
      type !== 'EXPENSE'
        ? prisma.income.findMany({
            where: { userId, ...(from || to ? { date: dateFilter } : {}), ...catFilter },
            include: { category: true, account: true },
            orderBy: { date: 'desc' },
          })
        : [],
      type !== 'INCOME'
        ? prisma.expense.findMany({
            where: { userId, ...(from || to ? { date: dateFilter } : {}), ...catFilter },
            include: { category: true, account: true },
            orderBy: { date: 'desc' },
          })
        : [],
    ]);

    const transactions = [
      ...incomes.map((i) => ({
        id: i.id,
        type: 'INCOME' as const,
        label: i.name,
        amount: i.amount,
        category: i.category.name,
        categoryId: i.categoryId,
        account: i.account.name,
        date: i.date.toISOString(),
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'EXPENSE' as const,
        label: e.description,
        amount: e.amount,
        category: e.category.name,
        categoryId: e.categoryId,
        account: e.account.name,
        date: e.date.toISOString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIncome   = incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const monthMap = new Map<string, { income: number; expense: number }>();
    incomes.forEach((i) => {
      const k = i.date.toISOString().slice(0, 7);
      const cur = monthMap.get(k) ?? { income: 0, expense: 0 };
      monthMap.set(k, { ...cur, income: cur.income + i.amount });
    });
    expenses.forEach((e) => {
      const k = e.date.toISOString().slice(0, 7);
      const cur = monthMap.get(k) ?? { income: 0, expense: 0 };
      monthMap.set(k, { ...cur, expense: cur.expense + e.amount });
    });
    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({ month, income: d.income, expense: d.expense }));

    const catMap = new Map<string, { name: string; amount: number; count: number }>();
    expenses.forEach((e) => {
      const cur = catMap.get(e.categoryId) ?? { name: e.category.name, amount: 0, count: 0 };
      catMap.set(e.categoryId, { name: cur.name, amount: cur.amount + e.amount, count: cur.count + 1 });
    });
    const byCategory = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      transactions,
      summary: { totalIncome, totalExpenses, balance: totalIncome - totalExpenses },
      byMonth,
      byCategory,
    });
  } catch {
    return NextResponse.json({
      transactions: [],
      summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },
      byMonth: [],
      byCategory: [],
    });
  }
}
