import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { accountSchema } from '@/lib/validators';
import { api, parseBody } from '@/lib/http';

async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
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

async function handlePost(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const data = await parseBody(request, accountSchema);
  const account = await prisma.account.create({ data: { userId, ...data } });
  return NextResponse.json({ account }, { status: 201 });
}

export const GET = api(handleGet);
export const POST = api(handlePost);
