import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { HttpError } from './http';

// Categories created and used by the app itself (debt payments, card payments).
// They are flagged `isSystem`: hidden from user pickers, locked in the admin panel.
export const SYSTEM_CATEGORIES = {
  debtPayment: { name: 'Pago de Deuda', type: 'EXPENSE' },
  cardPayment: { name: 'Abono Tarjeta', type: 'EXPENSE' },
} as const;

export const SYSTEM_CATEGORY_LIST = Object.values(SYSTEM_CATEGORIES);

/** Id of a system category, creating (or flagging) it if missing. */
export async function systemCategoryId(
  tx: Prisma.TransactionClient,
  key: keyof typeof SYSTEM_CATEGORIES,
): Promise<string> {
  const { name, type } = SYSTEM_CATEGORIES[key];
  const category = await tx.category.upsert({
    where: { name },
    create: { name, type, isSystem: true },
    update: { isSystem: true },
  });
  return category.id;
}

/** Checks a user-chosen category: it exists, has the right type and is not a system one. */
export async function validateCategory(categoryId: string, type: 'INCOME' | 'EXPENSE'): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.isSystem || category.type !== type) {
    throw new HttpError(400, 'La categoría seleccionada no es válida');
  }
}
