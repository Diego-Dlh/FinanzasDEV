import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json();
  const parse = expenseSchema.partial().safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const newAmount    = parse.data.amount    ?? existing.amount;
  const newAccountId = parse.data.accountId ?? existing.accountId;
  const accountChanged = newAccountId !== existing.accountId;
  const amountChanged  = newAmount !== existing.amount;

  const ops: Parameters<typeof prisma.$transaction>[0] = [
    prisma.expense.update({
      where: { id },
      data: {
        description: parse.data.description ?? existing.description,
        amount:      newAmount,
        categoryId:  parse.data.categoryId  ?? existing.categoryId,
        accountId:   newAccountId,
        date:        parse.data.date        ? new Date(parse.data.date) : existing.date,
        frequency:   parse.data.frequency   ?? existing.frequency,
      },
    }),
  ];

  if (accountChanged) {
    // Restore old account balance, deduct from new account
    ops.push(
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: existing.amount } } }),
      prisma.account.update({ where: { id: newAccountId },       data: { balance: { decrement: newAmount } } })
    );
  } else if (amountChanged) {
    const diff = newAmount - existing.amount;
    ops.push(
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { decrement: diff } } })
    );
  }

  const [expense] = await prisma.$transaction(ops);
  return NextResponse.json({ expense });
}

export async function DELETE(request: Request, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const userId = authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction([
    prisma.expense.delete({ where: { id } }),
    prisma.account.update({
      where: { id: existing.accountId },
      data: { balance: { increment: existing.amount } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
