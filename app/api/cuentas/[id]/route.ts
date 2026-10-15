import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { accountUpdateSchema } from '@/lib/validators';
import { api, parseBody } from '@/lib/http';

async function handlePut(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const existing = await prisma.account.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // Only the fields sent are changed (the schema has no defaults)
  const data = await parseBody(request, accountUpdateSchema);
  const account = await prisma.account.update({ where: { id }, data });
  return NextResponse.json({ account });
}

export const PUT = api(handlePut);
