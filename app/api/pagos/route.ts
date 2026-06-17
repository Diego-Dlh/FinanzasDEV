import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { paymentSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const debtId = searchParams.get('debtId');

  const payments = await prisma.payment.findMany({
    where: { userId, ...(debtId ? { debtId } : {}) },
    orderBy: { paidAt: 'desc' },
    include: { debt: { select: { name: true, entity: true } } },
  });
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const parse = paymentSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { debtId, amount } = parse.data;
  const debt = await prisma.debt.findFirst({ where: { id: debtId, userId } });
  if (!debt) return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 });

  const newBalance = Math.max(0, debt.balance - amount);

  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data: { userId, debtId, amount } }),
    prisma.debt.update({ where: { id: debtId }, data: { balance: newBalance } }),
  ]);

  return NextResponse.json({ payment, newBalance }, { status: 201 });
}
