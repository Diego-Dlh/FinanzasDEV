import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';
import { api, errorResponse, readJson } from '@/lib/http';
import { validateCategory } from '@/lib/categories';
import { findLinkedExpenseIds } from '@/lib/expenseLinks';

async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: { category: true, account: true },
    });
    // `linked`: created by a debt/card payment, so it can't be edited on its own
    const linked = await findLinkedExpenseIds(expenses.map((e) => e.id));
    return NextResponse.json({ expenses: expenses.map((e) => ({ ...e, linked: linked.has(e.id) })) });
  } catch {
    return NextResponse.json({ expenses: [] });
  }
}

async function handlePost(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const parse = expenseSchema.safeParse(await readJson(request));
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    const { description, amount, categoryId, accountId, date, frequency } = parse.data;

    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    await validateCategory(categoryId, 'EXPENSE');

    const result = await prisma.$transaction([
      prisma.expense.create({
        data: { userId, accountId, categoryId, description, amount, date: new Date(date), frequency },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { decrement: amount } },
      }),
    ]);

    return NextResponse.json({ expense: result[0] }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = api(handleGet);
export const POST = api(handlePost);
