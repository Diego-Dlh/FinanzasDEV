import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const cards = await prisma.creditCard.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      purchases: {
        include: { category: true },
        orderBy: { date: 'desc' },
      },
    },
  });

  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { name, bank, creditLimit, interestRate, dueDay, cutDay, currency } = body;

  const card = await prisma.creditCard.create({
    data: {
      userId,
      name,
      bank,
      creditLimit: Number(creditLimit),
      interestRate: Number(interestRate),
      dueDay: Number(dueDay),
      cutDay: Number(cutDay),
      currency: currency ?? 'COP',
    },
  });

  return NextResponse.json({ card }, { status: 201 });
}
