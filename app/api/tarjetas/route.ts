import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { creditCardSchema } from '@/lib/validators';
import { api, errorResponse, readJson } from '@/lib/http';

async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
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

async function handlePost(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
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

export const GET = api(handleGet);
export const POST = api(handlePost);
