import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ accounts });
  } catch {
    return NextResponse.json({ accounts: [] });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { name, type, balance, currency } = body;

  if (!name || !type) {
    return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
  }

  const validTypes = ['CASH', 'BANK', 'NEQUI', 'DAVIPLATA', 'CARD'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Tipo de cuenta inválido' }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: {
      userId,
      name,
      type,
      balance: Number(balance) || 0,
      currency: currency || 'COP',
    },
  });
  return NextResponse.json({ account }, { status: 201 });
}
