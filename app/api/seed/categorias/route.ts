import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ALL_CATEGORIES = [
  { name: 'Salario',              type: 'INCOME'  as const },
  { name: 'Freelance',            type: 'INCOME'  as const },
  { name: 'Inversiones',          type: 'INCOME'  as const },
  { name: 'Regalos',              type: 'INCOME'  as const },
  { name: 'Primas',               type: 'INCOME'  as const },
  { name: 'Pagos no recurrentes', type: 'INCOME'  as const },
  { name: 'Arriendo',             type: 'EXPENSE' as const },
  { name: 'Transporte',           type: 'EXPENSE' as const },
  { name: 'Alimentación',         type: 'EXPENSE' as const },
  { name: 'Suscripciones',        type: 'EXPENSE' as const },
  { name: 'Entretenimiento',      type: 'EXPENSE' as const },
  { name: 'Salud',                type: 'EXPENSE' as const },
  { name: 'Lujos',                type: 'EXPENSE' as const },
  { name: 'Tecnología',           type: 'EXPENSE' as const },
  { name: 'Gustos',               type: 'EXPENSE' as const },
  { name: 'Mascotas',             type: 'EXPENSE' as const },
];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!process.env.SEED_KEY || key !== process.env.SEED_KEY) {
    return NextResponse.json({ error: 'Clave incorrecta o no configurada' }, { status: 401 });
  }

  try {
    const results = await Promise.all(
      ALL_CATEGORIES.map((c) =>
        prisma.category.upsert({
          where: { name: c.name },
          update: {},
          create: c,
        })
      )
    );

    const created = results.filter((r) => {
      const orig = ALL_CATEGORIES.find((c) => c.name === r.name);
      return orig !== undefined;
    });

    return NextResponse.json({
      ok: true,
      message: `Categorías sincronizadas — ${results.length} total (upsert idempotente)`,
      categorias: results.map((c) => `${c.name} (${c.type})`),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
