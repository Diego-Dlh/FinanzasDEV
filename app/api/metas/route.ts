import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { goalSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ goals });
  } catch {
    return NextResponse.json({ goals: [] });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const parse = goalSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const { title, description, targetAmount, currentAmount, targetDate } = parse.data;
  const goal = await prisma.goal.create({
    data: { userId, title, description, targetAmount, currentAmount, targetDate: new Date(targetDate) },
  });
  return NextResponse.json({ goal }, { status: 201 });
}
