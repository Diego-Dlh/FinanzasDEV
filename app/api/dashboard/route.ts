import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken, DEMO_USER_ID } from '@/lib/auth';
import { addDaysISO, currentMonthISO, dateOnlyToUTC, monthRangeUTC, todayISO } from '@/lib/dates';
import { api } from '@/lib/http';

function calcHealthScore(
  monthlyIncome: number,
  monthlyExpenses: number,
  totalDebt: number,
  goalsCount: number
): number {
  let score = 70;
  if (monthlyIncome === 0) return 30;

  const savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome;
  if (savingsRate >= 0.3) score += 15;
  else if (savingsRate >= 0.2) score += 10;
  else if (savingsRate >= 0.1) score += 5;
  else if (savingsRate < 0) score -= 20;
  else score -= 5;

  const debtToIncome = totalDebt / (monthlyIncome * 12);
  if (debtToIncome === 0) score += 15;
  else if (debtToIncome < 0.5) score += 5;
  else if (debtToIncome > 3.5) score -= 25;
  else if (debtToIncome > 2) score -= 15;

  if (goalsCount > 0) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function weekdayLabel(ymd: string) {
  return dateOnlyToUTC(ymd).toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'UTC' });
}

function mockDashboard() {
  const today = dateOnlyToUTC(todayISO()).toISOString();
  return {
    totalBalance: 5_500_000,
    monthlyIncome: 5_500_000,
    monthlyExpenses: 2_800_000,
    totalDebt: 1_200_000,
    netWorth: 4_300_000,
    healthScore: 72,
    transactions: [
      { id: '1', title: 'Salario', category: 'Salario', amount: 5_500_000, type: 'income' as const, date: today },
      { id: '2', title: 'Arriendo', category: 'Vivienda', amount: 1_200_000, type: 'expense' as const, date: today },
      { id: '3', title: 'Supermercado', category: 'Alimentación', amount: 450_000, type: 'expense' as const, date: today },
    ],
    cashFlow: Array.from({ length: 7 }, (_, i) => ({
      name: weekdayLabel(addDaysISO(todayISO(), i - 6)),
      income: i === 0 ? 5_500_000 : 0,
      expense: i === 1 ? 1_200_000 : i === 3 ? 450_000 : 0,
    })),
    accountsCount: 3,
  };
}

async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Sample data is only for the demo login; a real user must never see it
  if (userId === DEMO_USER_ID) return NextResponse.json(mockDashboard());

  try {
    // Calendar dates are stored as UTC midnight; "today" is Colombia's
    const today = todayISO();
    const { start: startOfMonth, end: startOfNextMonth } = monthRangeUTC(currentMonthISO());
    const last7Days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i - 6));
    const sevenDaysAgo = dateOnlyToUTC(last7Days[0]);
    const tomorrow     = dateOnlyToUTC(addDaysISO(today, 1));

    const [
      accounts,
      monthlyIncomes,
      monthlyExpenses,
      debts,
      goals,
      recentIncomes,
      recentExpenses,
      cashFlowIncomes,
      cashFlowExpenses,
      cards,
    ] = await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.income.findMany({ where: { userId, date: { gte: startOfMonth, lt: startOfNextMonth } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: startOfMonth, lt: startOfNextMonth } } }),
      prisma.debt.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.income.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 6,
        include: { category: true },
      }),
      prisma.expense.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 6,
        include: { category: true },
      }),
      // Cashflow: all incomes of the last 7 days — no take limit
      prisma.income.findMany({ where: { userId, date: { gte: sevenDaysAgo, lt: tomorrow } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: sevenDaysAgo, lt: tomorrow } } }),
      prisma.creditCard.findMany({ where: { userId } }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalBalance        = (accounts as any[]).filter((a) => !a.hideFromTotal).reduce((s: number, a: any) => s + a.balance, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visibleAccountsCount = (accounts as any[]).filter((a) => !a.hideFromTotal).length;
    const totalMonthlyIncome  = monthlyIncomes.reduce((s, i) => s + i.amount, 0);
    const totalMonthlyExpenses = monthlyExpenses.reduce((s, e) => s + e.amount, 0);
    const cardDebt            = cards.reduce((s, c) => s + c.usedBalance, 0);
    const totalDebt           = debts.reduce((s, d) => s + d.balance, 0) + cardDebt;
    const netWorth            = totalBalance - totalDebt;
    const healthScore         = calcHealthScore(totalMonthlyIncome, totalMonthlyExpenses, totalDebt, goals.length);

    const transactions = [
      ...recentIncomes.map((i) => ({
        id: i.id, title: i.name, category: i.category.name,
        amount: i.amount, type: 'income' as const, date: i.date,
      })),
      ...recentExpenses.map((e) => ({
        id: e.id, title: e.description, category: e.category.name,
        amount: e.amount, type: 'expense' as const, date: e.date,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);

    const dayOf = (d: Date) => d.toISOString().slice(0, 10);
    const cashFlow = last7Days.map((day) => ({
      name: weekdayLabel(day),
      income:  cashFlowIncomes.filter((i) => dayOf(i.date) === day).reduce((s, i) => s + i.amount, 0),
      expense: cashFlowExpenses.filter((e) => dayOf(e.date) === day).reduce((s, e) => s + e.amount, 0),
    }));

    return NextResponse.json({
      totalBalance,
      monthlyIncome: totalMonthlyIncome,
      monthlyExpenses: totalMonthlyExpenses,
      totalDebt,
      netWorth,
      healthScore,
      transactions,
      cashFlow,
      accountsCount: visibleAccountsCount,
    });
  } catch (error) {
    console.error('[dashboard]', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar tus datos. Intenta de nuevo en unos minutos.' },
      { status: 503 },
    );
  }
}

export const GET = api(handleGet);
