import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { creditCardSchema } from '@/lib/validators';
import { errorResponse, readJson } from '@/lib/http';

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
      payments: {
        orderBy: { paidAt: 'desc' },
      },
    },
  });

  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const parse = creditCardSchema.safeParse(await readJson(request));
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    const card = await prisma.creditCard.create({ data: { userId, ...parse.data } });
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
