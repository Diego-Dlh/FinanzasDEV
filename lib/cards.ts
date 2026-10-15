import { currentMonthISO } from './dates';

// Installment rule (the stored `CardPurchase.paidInstallments` is no longer used):
// a purchase bills one installment per calendar month, starting the month it was
// made. It stops generating installments once `installments` months have passed.

interface PurchaseLike { date: string | Date; installments: number; installmentAmt: number }

function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

/** Installments already billed before the current month (0 during the purchase month). */
export function installmentsElapsed(purchase: PurchaseLike, now: Date = new Date()): number {
  const purchaseMonth = new Date(purchase.date).toISOString().slice(0, 7); // stored as UTC calendar date
  const diff = monthIndex(currentMonthISO(now)) - monthIndex(purchaseMonth);
  return Math.min(purchase.installments, Math.max(0, diff));
}

export function installmentsRemaining(purchase: PurchaseLike, now: Date = new Date()): number {
  return purchase.installments - installmentsElapsed(purchase, now);
}

export function isInstallmentActive(purchase: PurchaseLike, now: Date = new Date()): boolean {
  return installmentsRemaining(purchase, now) > 0;
}

/** Suggested monthly payment: installments due + interest, never above what is owed. */
export function calcCardPayment(
  card: { usedBalance: number; interestRate: number; purchases: PurchaseLike[] },
  now: Date = new Date(),
) {
  const cuotasMes = card.purchases
    .filter((p) => isInstallmentActive(p, now))
    .reduce((s, p) => s + p.installmentAmt, 0);
  const interesMes = card.usedBalance * (card.interestRate / 100);
  const minPayment = Math.min(
    card.usedBalance,
    Math.max(card.usedBalance * 0.05, cuotasMes + interesMes),
  );
  return { cuotasMes, interesMes, minPayment };
}
