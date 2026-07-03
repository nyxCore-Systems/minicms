-- Rename the slot-category column and remap legacy role values to content categories.
ALTER TABLE "Appearance" RENAME COLUMN "role" TO "category";
UPDATE "Appearance" SET "category" = 'musik' WHERE "category" IN ('headliner', 'support', 'guest');
-- 'break' bleibt unverändert.
ALTER TABLE "Appearance" ALTER COLUMN "category" SET DEFAULT 'musik';
