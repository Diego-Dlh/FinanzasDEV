-- AlterTable: add accountId and expenseId to Payment and CardPayment
ALTER TABLE "Payment" ADD COLUMN "accountId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "expenseId" TEXT;

ALTER TABLE "CardPayment" ADD COLUMN "accountId" TEXT;
ALTER TABLE "CardPayment" ADD COLUMN "expenseId" TEXT;
