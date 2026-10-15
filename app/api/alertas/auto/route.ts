import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { addDaysISO, addMonthsISO, currentMonthISO, dateOnlyToUTC, fmtDate, todayISO } from '@/lib/dates';

// Day `day` of month `ym`, clamped to the month's last day (dueDay 31 in a 30-day month)
function dueDateInMonth(ym: string, day: number): Date {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1, Math.min(day, lastDay)));
}

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

  // Due dates are calendar dates (UTC midnight); "today" is Colombia's
  const today   = todayISO();
  const todayAt = dateOnlyToUTC(today);
  const in7days = dateOnlyToUTC(addDaysISO(today, 7));
  const ago3d   = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  let created = 0;

  try {
    // ── 1. Deudas con dueDate en los próximos 7 días y saldo > 0 ───────────────
    const debts = await prisma.debt.findMany({
      where: { userId, balance: { gt: 0 }, dueDate: { gte: todayAt, lte: in7days } },
    });

    for (const debt of debts) {
      const alertType = `vencimiento_deuda_${debt.id}`;
      const existing = await prisma.alert.findFirst({
        where: { userId, type: alertType, createdAt: { gte: ago3d } },
      });
      if (!existing) {
        const dueStr = fmtDate(debt.dueDate, { day: 'numeric', month: 'long' });
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
      // Próxima fecha de pago a partir del dueDay (hoy cuenta como próxima)
      let nextDue = dueDateInMonth(currentMonthISO(), card.dueDay);
      if (nextDue < todayAt) nextDue = dueDateInMonth(addMonthsISO(currentMonthISO(), 1), card.dueDay);

      if (nextDue <= in7days) {
        const alertType = `vencimiento_tarjeta_${card.id}`;
        const existing = await prisma.alert.findFirst({
          where: { userId, type: alertType, createdAt: { gte: ago3d } },
        });
        if (!existing) {
          const dueStr = fmtDate(nextDue, { day: 'numeric', month: 'long' });
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
