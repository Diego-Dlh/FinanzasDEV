import type { Prisma } from '@prisma/client';

// Editing or deleting an income/expense changes an account balance by a difference
// computed from the row's current values. Without a lock, two concurrent requests
// both read the same values and both apply their difference (e.g. a double click on
// "delete" debits the account twice). `FOR UPDATE` makes the second request wait for
// the first one to commit, and it then re-reads the row as it is by then.
// Call these first inside an interactive transaction, then read the row again.

export async function lockIncome(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Income" WHERE "id" = ${id} FOR UPDATE`;
}

export async function lockExpense(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Expense" WHERE "id" = ${id} FOR UPDATE`;
}
