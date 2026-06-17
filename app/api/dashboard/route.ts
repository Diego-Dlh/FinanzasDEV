import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

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
  else if (debtToIncome > 2) score -= 15;
  else if (debtToIncome > 3.5) score -= 25;

  if (goalsCount > 0) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [accounts, monthlyIncomes, monthlyExpenses, debts, goals, recentIncomes, recentExpenses, cards] =
    await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.income.findMany({
        where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.expense.findMany({
        where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.debt.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.income.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        include: { category: true },
      }),
      prisma.expense.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        include: { category: true },
      }),
      prisma.creditCard.findMany({ where: { userId } }),
    ]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalMonthlyIncome = monthlyIncomes.reduce((s, i) => s + i.amount, 0);
  const totalMonthlyExpenses = monthlyExpenses.reduce((s, e) => s + e.amount, 0);
  const cardDebt = cards.reduce((s, c) => s + c.usedBalance, 0);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0) + cardDebt;
  const netWorth = totalBalance - totalDebt;
  const healthScore = calcHealthScore(
    totalMonthlyIncome,
    totalMonthlyExpenses,
    totalDebt,
    goals.length
  );

  const transactions = [
    ...recentIncomes.map((i) => ({
      id: i.id,
      title: i.name,
      category: i.category.name,
      amount: i.amount,
      type: 'income' as const,
      date: i.date,
    })),
    ...recentExpenses.map((e) => ({
      id: e.id,
      title: e.description,
      category: e.category.name,
      amount: e.amount,
      type: 'expense' as const,
      date: e.date,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const cashFlow = last7Days.map((day) => {
    const dayStr = day.toLocaleDateString('es-CO', { weekday: 'short' });
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    const inc = recentIncomes
      .filter((i) => new Date(i.date) >= start && new Date(i.date) <= end)
      .reduce((s, i) => s + i.amount, 0);
    const exp = recentExpenses
      .filter((e) => new Date(e.date) >= start && new Date(e.date) <= end)
      .reduce((s, e) => s + e.amount, 0);
    return { name: dayStr, income: inc, expense: exp };
  });

  return NextResponse.json({
    totalBalance,
    monthlyIncome: totalMonthlyIncome,
    monthlyExpenses: totalMonthlyExpenses,
    totalDebt,
    netWorth,
    healthScore,
    transactions,
    cashFlow,
    accountsCount: accounts.length,
  });
}
