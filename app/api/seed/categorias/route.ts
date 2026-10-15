import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SYSTEM_CATEGORY_LIST } from '@/lib/categories';
import { api } from '@/lib/http';
import { hasValidSetupKey } from '@/lib/adminAuth';

const USER_CATEGORIES = [
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

const ALL_CATEGORIES = [
  ...USER_CATEGORIES.map((c) => ({ ...c, isSystem: false })),
  ...SYSTEM_CATEGORY_LIST.map((c) => ({ ...c, isSystem: true })),
];

async function handleGet(req: NextRequest) {
  if (!hasValidSetupKey(req)) {
    return NextResponse.json({ error: 'Clave incorrecta o no configurada' }, { status: 401 });
  }

  const results = await Promise.all(
    ALL_CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { name: c.name },
        update: c.isSystem ? { isSystem: true } : {},
        create: c,
      })
    )
  );

  return NextResponse.json({
    ok: true,
    message: `Categorías sincronizadas — ${results.length} total (upsert idempotente)`,
    categorias: results.map((c) => `${c.name} (${c.type})`),
  });
}

export const GET = api(handleGet);
