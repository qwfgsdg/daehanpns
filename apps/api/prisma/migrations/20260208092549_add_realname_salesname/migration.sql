-- AlterTable: Rename name column to realName and add salesName
-- Step 1: Add new columns
ALTER TABLE "Admin" ADD COLUMN "realName" TEXT;
ALTER TABLE "Admin" ADD COLUMN "salesName" TEXT;

-- Step 2: Copy existing name data to both realName and salesName
UPDATE "Admin" SET "realName" = "name", "salesName" = "name";

-- Step 3: Make the new columns NOT NULL
ALTER TABLE "Admin" ALTER COLUMN "realName" SET NOT NULL;
ALTER TABLE "Admin" ALTER COLUMN "salesName" SET NOT NULL;

-- Step 4: Drop the old name column
ALTER TABLE "Admin" DROP COLUMN "name";
