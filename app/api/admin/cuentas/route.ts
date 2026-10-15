import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { adminAccountCreateSchema } from '@/lib/validators';
import { api, parseBody } from '@/lib/http';

async function handleGet(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const accounts = await prisma.account.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { incomes: true, expenses: true } },
    },
  });

  return NextResponse.json({ accounts });
}

async function handlePost(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const data = await parseBody(request, adminAccountCreateSchema);

  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const account = await prisma.account.create({
    data,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { incomes: true, expenses: true } },
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}

export const GET = api(handleGet);
export const POST = api(handlePost);
