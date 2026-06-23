import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();

  const existing = await prisma.account.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const updateData: {
    hideFromTotal?: boolean;
    name?: string;
    balance?: number;
    currency?: string;
  } = {};

  if (body.hideFromTotal !== undefined) updateData.hideFromTotal = Boolean(body.hideFromTotal);
  if (body.name)                        updateData.name          = String(body.name);
  if (body.balance !== undefined)       updateData.balance       = Number(body.balance);
  if (body.currency)                    updateData.currency      = String(body.currency);

  const account = await prisma.account.update({ where: { id }, data: updateData });
  return NextResponse.json({ account });
}
