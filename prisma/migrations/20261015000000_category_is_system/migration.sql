-- Categories created by the app itself (debt payments, card payments) are flagged
-- so they can be hidden from user pickers and protected from rename/delete.
ALTER TABLE "Category" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Category" SET "isSystem" = true WHERE "name" IN ('Pago de Deuda', 'Abono Tarjeta');
