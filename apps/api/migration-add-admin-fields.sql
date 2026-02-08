-- Add missing Admin fields for Phase 1 functionality

-- Add new columns to Admin table
ALTER TABLE "Admin" ADD COLUMN "affiliationCode" TEXT;
ALTER TABLE "Admin" ADD COLUMN "region" TEXT;
ALTER TABLE "Admin" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Admin" ADD COLUMN "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Admin" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Create unique constraint on affiliationCode
CREATE UNIQUE INDEX "Admin_affiliationCode_key" ON "Admin"("affiliationCode");

-- Create index on affiliationCode for faster lookups
CREATE INDEX "Admin_affiliationCode_idx" ON "Admin"("affiliationCode");
