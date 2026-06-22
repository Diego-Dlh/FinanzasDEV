import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();

  const account = await prisma.account.update({
    where: { id: params.id, userId },
    data: {
      ...(body.hideFromTotal !== undefined && { hideFromTotal: body.hideFromTotal }),
    },
  });
  return NextResponse.json({ account });
}
