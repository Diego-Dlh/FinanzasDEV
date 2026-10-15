import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { addDaysISO, dateOnlyToUTC } from '@/lib/dates';
import { api } from '@/lib/http';
import { NOT_CARD_PAYMENT } from '@/lib/finance';

async function handleGet(request: Request) {
  const userId = await authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from   = searchParams.get('from');
  const to     = searchParams.get('to');
  const type   = searchParams.get('type') ?? 'ALL';
  const catId  = searchParams.get('categoryId') ?? '';

  // from/to are calendar dates ('YYYY-MM-DD'), stored as UTC midnight; `to` is inclusive
  const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  if ((from && !isYmd(from)) || (to && !isYmd(to))) {
    return NextResponse.json({ error: 'Fechas inválidas (formato AAAA-MM-DD)' }, { status: 400 });
  }
  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = dateOnlyToUTC(from);
  if (to)   dateFilter.lt  = dateOnlyToUTC(addDaysISO(to, 1));

  const catFilter = catId ? { categoryId: catId } : {};

  try {
    const dateWhere = from || to ? { date: dateFilter } : {};
    const [incomes, expenses, purchases] = await Promise.all([
      type !== 'EXPENSE'
        ? prisma.income.findMany({
            where: { userId, ...(from || to ? { date: dateFilter } : {}), ...catFilter },
            include: { category: true, account: true },
            orderBy: { date: 'desc' },
          })
        : [],
      type !== 'INCOME'
        ? prisma.expense.findMany({
            // Card payments (abonos) only move money to the card debt; the purchase already counted
            where: { userId, ...dateWhere, ...catFilter, ...NOT_CARD_PAYMENT },
            include: { category: true, account: true },
            orderBy: { date: 'desc' },
          })
        : [],
      // A card purchase is spending on its own date and category
      type !== 'INCOME'
        ? prisma.cardPurchase.findMany({
            where: { userId, ...dateWhere, ...catFilter },
            include: { category: true, card: { select: { name: true } } },
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
        source: 'account' as const,
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
        source: 'account' as const,
      })),
      ...purchases.map((p) => ({
        id: p.id,
        type: 'EXPENSE' as const,
        label: p.description,
        amount: p.totalAmount,
        category: p.category.name,
        categoryId: p.categoryId,
        account: `Tarjeta ${p.card.name}`,
        date: p.date.toISOString(),
        source: 'card' as const,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIncome   = incomes.reduce((s, i) => s + i.amount, 0);
    // Spending = expenses + card purchases, as one list so the totals and charts agree
    const spending = [
      ...expenses.map((e) => ({ date: e.date, amount: e.amount, categoryId: e.categoryId, categoryName: e.category.name })),
      ...purchases.map((p) => ({ date: p.date, amount: p.totalAmount, categoryId: p.categoryId, categoryName: p.category.name })),
    ];
    const totalExpenses = spending.reduce((s, e) => s + e.amount, 0);

    const monthMap = new Map<string, { income: number; expense: number }>();
    incomes.forEach((i) => {
      const k = i.date.toISOString().slice(0, 7);
      const cur = monthMap.get(k) ?? { income: 0, expense: 0 };
      monthMap.set(k, { ...cur, income: cur.income + i.amount });
    });
    spending.forEach((e) => {
      const k = e.date.toISOString().slice(0, 7);
      const cur = monthMap.get(k) ?? { income: 0, expense: 0 };
      monthMap.set(k, { ...cur, expense: cur.expense + e.amount });
    });
    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({ month, income: d.income, expense: d.expense }));

    const catMap = new Map<string, { name: string; amount: number; count: number }>();
    spending.forEach((e) => {
      const cur = catMap.get(e.categoryId) ?? { name: e.categoryName, amount: 0, count: 0 };
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

export const GET = api(handleGet);
