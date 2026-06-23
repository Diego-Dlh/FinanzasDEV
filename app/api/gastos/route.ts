import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: { category: true, account: true },
    });
    return NextResponse.json({ expenses });
  } catch {
    return NextResponse.json({ expenses: [] });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const parse = expenseSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const { description, amount, categoryId, accountId, date, frequency } = parse.data;

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

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
}
