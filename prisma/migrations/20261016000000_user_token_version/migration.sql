-- Session invalidation: a token is only valid while its version matches the user's.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Emails are now normalised to lowercase on register/login. Lowercase the existing
-- ones too, skipping any that would collide with another account.
UPDATE "User" u
SET "email" = lower(u."email")
WHERE u."email" <> lower(u."email")
  AND NOT EXISTS (
    SELECT 1 FROM "User" o WHERE o."email" = lower(u."email") AND o."id" <> u."id"
  );
