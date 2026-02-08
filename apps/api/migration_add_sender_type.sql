-- Add senderType to ChatMessage
ALTER TABLE "ChatMessage"
ADD COLUMN IF NOT EXISTS "senderType" TEXT NOT NULL DEFAULT 'USER';

-- Create enum type if not exists
DO $$ BEGIN
    CREATE TYPE "SenderType" AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Change column to use enum
ALTER TABLE "ChatMessage"
ALTER COLUMN "senderType" TYPE "SenderType" USING "senderType"::"SenderType";

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "ChatMessage_senderType_idx" ON "ChatMessage"("senderType");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_senderId_senderType_isDeleted_idx"
  ON "ChatMessage"("createdAt", "senderId", "senderType", "isDeleted");
CREATE INDEX IF NOT EXISTS "ChatMessage_roomId_createdAt_isDeleted_idx"
  ON "ChatMessage"("roomId", "createdAt", "isDeleted");
