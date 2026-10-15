import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { addDaysISO, addMonthsISO, currentMonthISO, dateOnlyToUTC, fmtDate, todayISO } from '@/lib/dates';
import { api, formatCOP } from '@/lib/http';

// Day `day` of month `ym`, clamped to the month's last day (dueDay 31 in a 30-day month)
function dueDateInMonth(ym: string, day: number): Date {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1, Math.min(day, lastDay)));
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * POST /api/alertas/auto
 * Creates alerts for debts and cards due in the next 7 days, and for overdue debts.
 * The alert `type` carries the item id and its due date, so there is exactly one alert
 * per due date: calling this again (every login) never repeats it.
 * Nothing is created when the user turned notifications off in their settings.
 */
async function handlePost(request: Request) {
  const userId = await authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const setting = await prisma.setting.findUnique({ where: { userId } });
    if (setting && !setting.notifications) {
      return NextResponse.json({ ok: true, created: 0, skipped: 'notifications_off' });
    }

    // Due dates are calendar dates (UTC midnight); "today" is Colombia's
    const today   = todayISO();
    const todayAt = dateOnlyToUTC(today);
    const in7days = dateOnlyToUTC(addDaysISO(today, 7));

    const [upcomingDebts, overdueDebts, cards] = await Promise.all([
      prisma.debt.findMany({ where: { userId, balance: { gt: 0 }, dueDate: { gte: todayAt, lte: in7days } } }),
      prisma.debt.findMany({ where: { userId, balance: { gt: 0 }, dueDate: { lt: todayAt } } }),
      prisma.creditCard.findMany({ where: { userId, usedBalance: { gt: 0 } } }),
    ]);

    const candidates: { type: string; message: string }[] = [];

    for (const debt of upcomingDebts) {
      candidates.push({
        type: `vencimiento_deuda_${debt.id}_${ymd(debt.dueDate)}`,
        message: `Tu deuda "${debt.name}" vence el ${fmtDate(debt.dueDate, { day: 'numeric', month: 'long' })}. Saldo pendiente: ${formatCOP(debt.balance)}`,
      });
    }

    for (const debt of overdueDebts) {
      candidates.push({
        type: `vencida_deuda_${debt.id}_${ymd(debt.dueDate)}`,
        message: `Tu deuda "${debt.name}" venció el ${fmtDate(debt.dueDate, { day: 'numeric', month: 'long', year: 'numeric' })} y aún tiene saldo: ${formatCOP(debt.balance)}`,
      });
    }

    for (const card of cards) {
      // Next payment date from dueDay (today counts as upcoming)
      let nextDue = dueDateInMonth(currentMonthISO(), card.dueDay);
      if (nextDue < todayAt) nextDue = dueDateInMonth(addMonthsISO(currentMonthISO(), 1), card.dueDay);
      if (nextDue > in7days) continue;
      candidates.push({
        type: `vencimiento_tarjeta_${card.id}_${ymd(nextDue)}`,
        message: `Tu tarjeta "${card.name}" tiene fecha de pago el ${fmtDate(nextDue, { day: 'numeric', month: 'long' })}. Saldo actual: ${formatCOP(card.usedBalance)}`,
      });
    }

    if (candidates.length === 0) return NextResponse.json({ ok: true, created: 0 });

    const existing = await prisma.alert.findMany({
      where: { userId, type: { in: candidates.map((c) => c.type) } },
      select: { type: true },
    });
    const already = new Set(existing.map((a) => a.type));
    const fresh = candidates.filter((c) => !already.has(c.type));
    if (fresh.length > 0) {
      await prisma.alert.createMany({ data: fresh.map((c) => ({ userId, type: c.type, message: c.message })) });
    }

    return NextResponse.json({ ok: true, created: fresh.length });
  } catch (error) {
    // Silent — automatic alerts must never break the app
    console.error('[alertas/auto]', error);
    return NextResponse.json({ ok: false, created: 0 });
  }
}

export const POST = api(handlePost);
