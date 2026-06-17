import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const expenses = await prisma.expense.findMany({ where: { userId }, orderBy: { date: 'desc' }, include: { category: true, account: true } });
  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { description, amount, categoryId, date, frequency, accountId } = body;
  const expense = await prisma.expense.create({
    data: {
      userId,
      accountId,
      categoryId,
      description,
      amount: Number(amount),
      date: new Date(date),
      frequency,
    },
  });
  return NextResponse.json({ expense }, { status: 201 });
}
