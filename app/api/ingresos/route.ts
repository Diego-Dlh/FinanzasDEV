import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { incomeSchema } from '@/lib/validators';
import { errorResponse, readJson } from '@/lib/http';
import { validateCategory } from '@/lib/categories';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const incomes = await prisma.income.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: { category: true, account: true },
    });
    return NextResponse.json({ incomes });
  } catch {
    return NextResponse.json({ incomes: [] });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const parse = incomeSchema.safeParse(await readJson(request));
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    const { name, amount, categoryId, accountId, date, frequency } = parse.data;

    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    await validateCategory(categoryId, 'INCOME');

    const income = await prisma.$transaction([
      prisma.income.create({
        data: { userId, accountId, categoryId, name, amount, date: new Date(date), frequency },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: amount } },
      }),
    ]);

    return NextResponse.json({ income: income[0] }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
