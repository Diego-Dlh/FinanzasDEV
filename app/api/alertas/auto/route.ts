import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/**
 * POST /api/alertas/auto
 * Genera alertas para deudas y tarjetas que vencen en los próximos 7 días.
 * Usa el campo `type` como clave de deduplicación (vencimiento_deuda_<id>).
 * No crea duplicados si ya existe una alerta del mismo tipo en los últimos 3 días.
 */
export async function POST(request: Request) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const now     = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ago3d   = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  let created = 0;

  try {
    // ── 1. Deudas con dueDate en los próximos 7 días y saldo > 0 ───────────────
    const debts = await prisma.debt.findMany({
      where: { userId, balance: { gt: 0 }, dueDate: { gte: now, lte: in7days } },
    });

    for (const debt of debts) {
      const alertType = `vencimiento_deuda_${debt.id}`;
      const existing = await prisma.alert.findFirst({
        where: { userId, type: alertType, createdAt: { gte: ago3d } },
      });
      if (!existing) {
        const dueStr = debt.dueDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
        await prisma.alert.create({
          data: {
            userId,
            type: alertType,
            message: `Tu deuda "${debt.name}" vence el ${dueStr}. Saldo pendiente: ${fmtCOP(debt.balance)}`,
          },
        });
        created++;
      }
    }

    // ── 2. Tarjetas con dueDay en los próximos 7 días y saldo > 0 ──────────────
    const cards = await prisma.creditCard.findMany({
      where: { userId, usedBalance: { gt: 0 } },
    });

    for (const card of cards) {
      // Calcular próxima fecha de pago a partir del dueDay
      const nextDue = new Date(now.getFullYear(), now.getMonth(), card.dueDay);
      if (nextDue <= now) {
        // El día ya pasó este mes → próximo mes
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      if (nextDue <= in7days) {
        const alertType = `vencimiento_tarjeta_${card.id}`;
        const existing = await prisma.alert.findFirst({
          where: { userId, type: alertType, createdAt: { gte: ago3d } },
        });
        if (!existing) {
          const dueStr = nextDue.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
          await prisma.alert.create({
            data: {
              userId,
              type: alertType,
              message: `Tu tarjeta "${card.name}" tiene fecha de pago el ${dueStr}. Saldo actual: ${fmtCOP(card.usedBalance)}`,
            },
          });
          created++;
        }
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch {
    // Silencioso — las alertas automáticas no deben romper la app
    return NextResponse.json({ ok: false, created: 0 });
  }
}
