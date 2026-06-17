import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!process.env.SEED_KEY || key !== process.env.SEED_KEY) {
    return NextResponse.json({ error: 'Clave incorrecta o no configurada' }, { status: 401 });
  }

  try {
    const alreadySeeded = await prisma.user.findFirst({ where: { email: 'alex@finanzasdev.com' } });
    if (alreadySeeded) {
      return NextResponse.json({ ok: true, message: 'Ya estaba inicializado — nada que hacer.' });
    }

    // ─── Categorías ───────────────────────────────────────────────────────────
    const cats = await Promise.all(
      [
        { name: 'Salario',              type: 'INCOME' as const },
        { name: 'Freelance',            type: 'INCOME' as const },
        { name: 'Inversiones',          type: 'INCOME' as const },
        { name: 'Regalos',              type: 'INCOME' as const },
        { name: 'Primas',               type: 'INCOME' as const },
        { name: 'Pagos no recurrentes', type: 'INCOME' as const },
        { name: 'Arriendo',             type: 'EXPENSE' as const },
        { name: 'Transporte',           type: 'EXPENSE' as const },
        { name: 'Alimentación',         type: 'EXPENSE' as const },
        { name: 'Suscripciones',        type: 'EXPENSE' as const },
        { name: 'Entretenimiento',      type: 'EXPENSE' as const },
        { name: 'Salud',                type: 'EXPENSE' as const },
        { name: 'Lujos',                type: 'EXPENSE' as const },
        { name: 'Tecnología',           type: 'EXPENSE' as const },
        { name: 'Gustos',               type: 'EXPENSE' as const },
      ].map((c) => prisma.category.create({ data: c }))
    );

    const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // ─── Alex Sterling (demo) ────────────────────────────────────────────────
    const alex = await prisma.user.create({
      data: {
        name: 'Alex Sterling',
        email: 'alex@finanzasdev.com',
        password: await bcrypt.hash('test1234', 10),
        settings: { create: { darkMode: false, notifications: true } },
      },
    });

    const alexPrincipal = await prisma.account.create({
      data: { userId: alex.id, name: 'Cuenta Principal', type: 'BANK', balance: 142580, currency: 'COP' },
    });
    const alexEfectivo = await prisma.account.create({
      data: { userId: alex.id, name: 'Efectivo', type: 'CASH', balance: 50000, currency: 'COP' },
    });
    await prisma.account.create({
      data: { userId: alex.id, name: 'Ahorro', type: 'BANK', balance: 800000, currency: 'COP' },
    });

    await prisma.income.createMany({
      data: [
        { userId: alex.id, accountId: alexPrincipal.id, categoryId: catMap['Salario'],    name: 'Salario mensual',    amount: 8500000, date: firstOfMonth,                           frequency: 'MONTHLY'  },
        { userId: alex.id, accountId: alexPrincipal.id, categoryId: catMap['Freelance'],   name: 'Proyecto freelance', amount: 1200000, date: new Date(today.getTime() - 5*86400000), frequency: 'ONE_TIME' },
        { userId: alex.id, accountId: alexPrincipal.id, categoryId: catMap['Inversiones'], name: 'Dividendos CDT',     amount: 700000,  date: firstOfMonth,                           frequency: 'MONTHLY'  },
      ],
    });

    await prisma.expense.createMany({
      data: [
        { userId: alex.id, accountId: alexPrincipal.id, categoryId: catMap['Arriendo'],      description: 'Arriendo apartamento',        amount: 1200000, date: firstOfMonth,                           frequency: 'MONTHLY'  },
        { userId: alex.id, accountId: alexPrincipal.id, categoryId: catMap['Transporte'],     description: 'TransMilenio mensual',         amount: 95000,   date: firstOfMonth,                           frequency: 'MONTHLY'  },
        { userId: alex.id, accountId: alexPrincipal.id, categoryId: catMap['Alimentación'],   description: 'Supermercado',                 amount: 430000,  date: new Date(today.getTime() - 2*86400000), frequency: 'ONE_TIME' },
        { userId: alex.id, accountId: alexPrincipal.id, categoryId: catMap['Suscripciones'],  description: 'Streaming (Netflix, Spotify)', amount: 75000,   date: firstOfMonth,                           frequency: 'MONTHLY'  },
        { userId: alex.id, accountId: alexEfectivo.id,  categoryId: catMap['Alimentación'],   description: 'Restaurante',                  amount: 85000,   date: new Date(today.getTime() - 1*86400000), frequency: 'ONE_TIME' },
      ],
    });

    const alexDebt = await prisma.debt.create({
      data: {
        userId: alex.id, name: 'Tarjeta Premium', entity: 'Bancolombia',
        balance: 4285000, interestRate: 19.4, minPayment: 95000,
        dueDate: new Date(today.getFullYear(), today.getMonth() + 14, 1),
      },
    });
    await prisma.payment.create({ data: { userId: alex.id, debtId: alexDebt.id, amount: 125000 } });

    await prisma.budget.createMany({
      data: [
        { userId: alex.id, name: 'Alimentación',    allocated: 500000, spent: 420000 },
        { userId: alex.id, name: 'Transporte',       allocated: 300000, spent: 110000 },
        { userId: alex.id, name: 'Entretenimiento',  allocated: 200000, spent: 245000 },
        { userId: alex.id, name: 'Tecnología',       allocated: 300000, spent: 0 },
      ],
    });

    await prisma.goal.createMany({
      data: [
        { userId: alex.id, title: 'Fondo de Emergencia', description: 'Colchón 6 meses',    targetAmount: 20000000, currentAmount: 15000000, targetDate: new Date(today.getFullYear(), today.getMonth() + 3,  1) },
        { userId: alex.id, title: 'Fondo Carro',          description: 'Cuota inicial auto', targetAmount: 25000000, currentAmount: 8000000,  targetDate: new Date(today.getFullYear(), today.getMonth() + 14, 1) },
        { userId: alex.id, title: 'Viaje Europa',          description: 'Vacaciones',         targetAmount: 5000000,  currentAmount: 4600000,  targetDate: new Date(today.getTime() + 22*86400000) },
      ],
    });

    await prisma.alert.createMany({
      data: [
        { userId: alex.id, message: 'Tus gastos de alimentación subieron 15% esta semana.', type: 'SPENDING_ALERT' },
        { userId: alex.id, message: 'Plan Avalancha disponible para reducir deuda rápido.', type: 'DEBT_ADVICE' },
      ],
    });

    // ─── Diego De la hoz ──────────────────────────────────────────────────────
    const diego = await prisma.user.create({
      data: {
        name: 'Diego De la hoz',
        email: 'diego@finanzasdev.com',
        password: await bcrypt.hash('1004360', 10),
        settings: { create: { darkMode: false, notifications: true } },
      },
    });

    await prisma.account.createMany({
      data: [
        { userId: diego.id, name: 'Cuenta Principal', type: 'BANK', balance: 0, currency: 'COP' },
        { userId: diego.id, name: 'Efectivo',          type: 'CASH', balance: 0, currency: 'COP' },
        { userId: diego.id, name: 'Ahorro',            type: 'BANK', balance: 0, currency: 'COP' },
      ],
    });

    await prisma.alert.create({
      data: { userId: diego.id, message: '¡Bienvenido a Lumina Finance! Comienza registrando tus ingresos.', type: 'SPENDING_ALERT' },
    });

    // ─── Melissa Perez ────────────────────────────────────────────────────────
    const melissa = await prisma.user.create({
      data: {
        name: 'Melissa Perez',
        email: 'melissa@finanzasdev.com',
        password: await bcrypt.hash('108283', 10),
        settings: { create: { darkMode: false, notifications: true } },
      },
    });

    await prisma.account.createMany({
      data: [
        { userId: melissa.id, name: 'Cuenta Principal', type: 'BANK', balance: 0, currency: 'COP' },
        { userId: melissa.id, name: 'Efectivo',          type: 'CASH', balance: 0, currency: 'COP' },
        { userId: melissa.id, name: 'Ahorro',            type: 'BANK', balance: 0, currency: 'COP' },
      ],
    });

    await prisma.alert.create({
      data: { userId: melissa.id, message: '¡Bienvenida a Lumina Finance! Comienza registrando tus ingresos.', type: 'SPENDING_ALERT' },
    });

    return NextResponse.json({
      ok: true,
      message: 'Seed completado exitosamente',
      usuarios: [
        'alex@finanzasdev.com → test1234 (demo con datos)',
        'diego@finanzasdev.com → 1004360 (cuenta limpia)',
        'melissa@finanzasdev.com → 108283 (cuenta limpia)',
      ],
      categorias: `${cats.length} creadas (6 ingresos · 9 gastos)`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
