import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const { name, type, balance, currency } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  const account = await prisma.account.update({
    where: { id },
    data: {
      name: name.trim(),
      type,
      balance: Number(balance),
      currency: currency || 'COP',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { incomes: true, expenses: true } },
    },
  });

  return NextResponse.json({ account });
}

export async function DELETE(request: Request, { params }: Params) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
    include: { _count: { select: { incomes: true, expenses: true } } },
  });
  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

  const total = account._count.incomes + account._count.expenses;
  if (total > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: la cuenta tiene ${total} transacción(es) asociada(s)` },
      { status: 409 },
    );
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
