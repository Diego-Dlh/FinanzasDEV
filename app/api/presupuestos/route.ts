import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken, DEMO_USER_ID } from '@/lib/auth';
import { budgetSchema } from '@/lib/validators';
import { currentMonthISO, monthRangeUTC } from '@/lib/dates';
import { api, HttpError, parseBody } from '@/lib/http';
import { validateCategory } from '@/lib/categories';
import { spentByCategory } from '@/lib/finance';

// GET: each budget comes with `spent` = this month's spending in its category
// (expenses + card purchases, Colombia calendar month). It is computed, not stored.
async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (userId === DEMO_USER_ID) return NextResponse.json({ budgets: [] });

  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { category: { select: { id: true, name: true } } },
  });
  const { start, end } = monthRangeUTC(currentMonthISO());
  const spent = await spentByCategory(
    userId,
    budgets.flatMap((b) => (b.categoryId ? [b.categoryId] : [])),
    start,
    end,
  );
  return NextResponse.json({
    budgets: budgets.map((b) => ({ ...b, spent: b.categoryId ? spent.get(b.categoryId) ?? 0 : 0 })),
  });
}

async function handlePost(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { name, allocated, categoryId } = await parseBody(request, budgetSchema);
  await validateCategory(categoryId, 'EXPENSE');

  // One budget per category, otherwise the same spending would be counted twice
  const duplicate = await prisma.budget.findFirst({ where: { userId, categoryId } });
  if (duplicate) throw new HttpError(409, 'Ya tienes un presupuesto para esa categoría');

  const budget = await prisma.budget.create({ data: { userId, name, allocated, categoryId } });
  return NextResponse.json({ budget }, { status: 201 });
}

export const GET = api(handleGet);
export const POST = api(handlePost);
