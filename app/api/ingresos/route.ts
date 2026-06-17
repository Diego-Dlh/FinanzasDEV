import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const incomes = await prisma.income.findMany({ where: { userId }, orderBy: { date: 'desc' }, include: { category: true, account: true } });
  return NextResponse.json({ incomes });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { name, amount, categoryId, date, frequency, accountId } = body;
  const income = await prisma.income.create({
    data: {
      userId,
      accountId,
      categoryId,
      name,
      amount: Number(amount),
      date: new Date(date),
      frequency,
    },
  });

  return NextResponse.json({ income }, { status: 201 });
}
