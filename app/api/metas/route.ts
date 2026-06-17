import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { title, description, targetAmount, targetDate } = body;
  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      description,
      targetAmount: Number(targetAmount),
      targetDate: new Date(targetDate),
      currentAmount: 0,
    },
  });
  return NextResponse.json({ goal }, { status: 201 });
}
