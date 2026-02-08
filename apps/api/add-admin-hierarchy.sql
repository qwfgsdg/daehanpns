-- Add admin hierarchy fields
ALTER TABLE "Admin" ADD COLUMN "parentAdminId" TEXT;
ALTER TABLE "Admin" ADD COLUMN "createdBy" TEXT;

-- Add index for parentAdminId
CREATE INDEX "Admin_parentAdminId_idx" ON "Admin"("parentAdminId");

-- Add foreign key constraint
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_parentAdminId_fkey"
  FOREIGN KEY ("parentAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
