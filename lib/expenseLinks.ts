import { prisma } from './prisma';

/**
 * Expenses created by a debt payment or a card payment are tied to that payment:
 * editing them would desynchronise the account, the debt and the card.
 * Returns which of the given expenses are linked to one.
 */
export async function findLinkedExpenseIds(expenseIds: string[]): Promise<Set<string>> {
  if (expenseIds.length === 0) return new Set();
  const where = { expenseId: { in: expenseIds } };
  const [payments, cardPayments] = await Promise.all([
    prisma.payment.findMany({ where, select: { expenseId: true } }),
    prisma.cardPayment.findMany({ where, select: { expenseId: true } }),
  ]);
  const linked = new Set<string>();
  for (const p of [...payments, ...cardPayments]) if (p.expenseId) linked.add(p.expenseId);
  return linked;
}
