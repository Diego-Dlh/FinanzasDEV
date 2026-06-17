import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const debts = await prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ debts });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { name, entity, balance, interestRate, minPayment, dueDate } = body;
  const debt = await prisma.debt.create({
    data: {
      userId,
      name,
      entity,
      balance: Number(balance),
      interestRate: Number(interestRate),
      minPayment: Number(minPayment),
      dueDate: new Date(dueDate),
    },
  });
  return NextResponse.json({ debt }, { status: 201 });
}
