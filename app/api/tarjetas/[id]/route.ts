import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const card = await prisma.creditCard.findFirst({
    where: { id, userId },
    include: {
      purchases: {
        include: { category: true },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!card) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ card });
}

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.creditCard.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const card = await prisma.creditCard.update({
    where: { id },
    data: {
      name:         body.name         ?? existing.name,
      bank:         body.bank         ?? existing.bank,
      creditLimit:  body.creditLimit  !== undefined ? Number(body.creditLimit)  : existing.creditLimit,
      interestRate: body.interestRate !== undefined ? Number(body.interestRate) : existing.interestRate,
      dueDay:       body.dueDay       !== undefined ? Number(body.dueDay)       : existing.dueDay,
      cutDay:       body.cutDay       !== undefined ? Number(body.cutDay)       : existing.cutDay,
      currency:     body.currency     ?? existing.currency,
    },
  });

  return NextResponse.json({ card });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.creditCard.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction([
    prisma.cardPayment.deleteMany({ where: { cardId: id } }),
    prisma.cardPurchase.deleteMany({ where: { cardId: id } }),
    prisma.creditCard.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
