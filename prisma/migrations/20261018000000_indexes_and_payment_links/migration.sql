-- Indexes for the queries every page runs, referential integrity for the links between
-- payments and the account/expense they touched, and COP as the default currency.

-- Payments could point at an account or expense that no longer exists (nothing enforced it).
-- Unlink those first, otherwise the foreign keys below would fail on existing data.
UPDATE "Payment" SET "expenseId" = NULL
  WHERE "expenseId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Expense" e WHERE e."id" = "Payment"."expenseId");
UPDATE "Payment" SET "accountId" = NULL
  WHERE "accountId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Account" a WHERE a."id" = "Payment"."accountId");
UPDATE "CardPayment" SET "expenseId" = NULL
  WHERE "expenseId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Expense" e WHERE e."id" = "CardPayment"."expenseId");
UPDATE "CardPayment" SET "accountId" = NULL
  WHERE "accountId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Account" a WHERE a."id" = "CardPayment"."accountId");

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "currency" SET DEFAULT 'COP';

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Alert_userId_type_idx" ON "Alert"("userId", "type");

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE INDEX "CardPayment_userId_idx" ON "CardPayment"("userId");

-- CreateIndex
CREATE INDEX "CardPayment_cardId_idx" ON "CardPayment"("cardId");

-- CreateIndex
CREATE INDEX "CardPayment_expenseId_idx" ON "CardPayment"("expenseId");

-- CreateIndex
CREATE INDEX "CardPurchase_userId_date_idx" ON "CardPurchase"("userId", "date");

-- CreateIndex
CREATE INDEX "CardPurchase_cardId_idx" ON "CardPurchase"("cardId");

-- CreateIndex
CREATE INDEX "CardPurchase_categoryId_idx" ON "CardPurchase"("categoryId");

-- CreateIndex
CREATE INDEX "CreditCard_userId_idx" ON "CreditCard"("userId");

-- CreateIndex
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");

-- CreateIndex
CREATE INDEX "Expense_userId_date_idx" ON "Expense"("userId", "date");

-- CreateIndex
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Income_userId_date_idx" ON "Income"("userId", "date");

-- CreateIndex
CREATE INDEX "Income_accountId_idx" ON "Income"("accountId");

-- CreateIndex
CREATE INDEX "Income_categoryId_idx" ON "Income"("categoryId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_debtId_idx" ON "Payment"("debtId");

-- CreateIndex
CREATE INDEX "Payment_expenseId_idx" ON "Payment"("expenseId");

-- CreateIndex
CREATE INDEX "RegistrationKey_active_idx" ON "RegistrationKey"("active");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateIndex
CREATE UNIQUE INDEX "RegistrationKey_code_key" ON "RegistrationKey"("code");
