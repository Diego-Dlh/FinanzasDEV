import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { incomeSchema } from '@/lib/validators';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const parse = incomeSchema.partial().safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const newAmount    = parse.data.amount    ?? existing.amount;
  const newAccountId = parse.data.accountId ?? existing.accountId;
  const accountChanged = newAccountId !== existing.accountId;
  const amountChanged  = newAmount !== existing.amount;

  const ops: Parameters<typeof prisma.$transaction>[0] = [
    prisma.income.update({
      where: { id },
      data: {
        name:       parse.data.name       ?? existing.name,
        amount:     newAmount,
        categoryId: parse.data.categoryId ?? existing.categoryId,
        accountId:  newAccountId,
        date:       parse.data.date       ? new Date(parse.data.date) : existing.date,
        frequency:  parse.data.frequency  ?? existing.frequency,
      },
    }),
  ];

  if (accountChanged) {
    // Revert old account, apply to new account
    ops.push(
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { decrement: existing.amount } } }),
      prisma.account.update({ where: { id: newAccountId },       data: { balance: { increment: newAmount } } })
    );
  } else if (amountChanged) {
    const diff = newAmount - existing.amount;
    ops.push(
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: diff } } })
    );
  }

  const [income] = await prisma.$transaction(ops);
  return NextResponse.json({ income });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction([
    prisma.income.delete({ where: { id } }),
    prisma.account.update({
      where: { id: existing.accountId },
      data: { balance: { decrement: existing.amount } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
