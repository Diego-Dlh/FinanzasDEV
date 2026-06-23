import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { debtSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const debts = await prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ debts });
  } catch {
    return NextResponse.json({ debts: [] });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const parse = debtSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const { name, entity, balance, interestRate, minPayment, dueDate } = parse.data;
  const debt = await prisma.debt.create({
    data: { userId, name, entity, balance, interestRate, minPayment, dueDate: new Date(dueDate) },
  });
  return NextResponse.json({ debt }, { status: 201 });
}
