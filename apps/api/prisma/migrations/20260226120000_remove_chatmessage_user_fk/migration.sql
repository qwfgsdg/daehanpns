-- AlterTable: Remove ChatMessage -> User foreign key constraint
-- This allows Admin IDs to be stored in senderId field

-- Drop the foreign key constraint (name may vary, using Prisma's naming convention)
ALTER TABLE "ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_senderId_fkey";
