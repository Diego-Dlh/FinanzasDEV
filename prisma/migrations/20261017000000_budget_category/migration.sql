-- Budgets now point at an expense category instead of being matched by name.
ALTER TABLE "Budget" ADD COLUMN "categoryId" TEXT;

-- Link existing budgets to the (non-system) expense category with the same name,
-- which is how the app used to match them. Budgets with no match stay unlinked.
UPDATE "Budget" b
SET "categoryId" = c."id"
FROM "Category" c
WHERE lower(c."name") = lower(trim(b."name"))
  AND c."type" = 'EXPENSE'
  AND c."isSystem" = false;

ALTER TABLE "Budget"
  ADD CONSTRAINT "Budget_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
