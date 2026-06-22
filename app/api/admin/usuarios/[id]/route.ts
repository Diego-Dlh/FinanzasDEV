import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

interface Params { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  if (id === adminId) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  if (user.isAdmin) return NextResponse.json({ error: 'No se puede eliminar otro admin' }, { status: 400 });

  // Cascade: delete all user data
  await prisma.$transaction([
    prisma.cardPayment.deleteMany({ where: { userId: id } }),
    prisma.cardPurchase.deleteMany({ where: { userId: id } }),
    prisma.creditCard.deleteMany({ where: { userId: id } }),
    prisma.payment.deleteMany({ where: { userId: id } }),
    prisma.debt.deleteMany({ where: { userId: id } }),
    prisma.income.deleteMany({ where: { userId: id } }),
    prisma.expense.deleteMany({ where: { userId: id } }),
    prisma.goal.deleteMany({ where: { userId: id } }),
    prisma.budget.deleteMany({ where: { userId: id } }),
    prisma.alert.deleteMany({ where: { userId: id } }),
    prisma.setting.deleteMany({ where: { userId: id } }),
    prisma.account.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
