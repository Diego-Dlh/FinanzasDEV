import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const budgets = await prisma.budget.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ budgets });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { name, allocated } = body;
  const budget = await prisma.budget.create({ data: { userId, name, allocated: Number(allocated), spent: 0 } });
  return NextResponse.json({ budget }, { status: 201 });
}
