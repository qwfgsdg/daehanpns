-- Phase 2 + Phase 5: loginId 시스템 + 봇 계정 필드 추가

-- 1. AuthProvider enum에 BOT 추가
ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'BOT';

-- 2. User 테이블: loginId, isManagedBot, managedByAdminId 추가
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isManagedBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "managedByAdminId" TEXT;

-- 3. User.phone을 nullable로 변경 (기존에 NOT NULL이면)
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- 4. Admin 테이블: botUserId, chatNickname, chatProfileImage 추가
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "botUserId" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "chatNickname" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "chatProfileImage" TEXT;

-- 5. ChatParticipant: leftAt 필드 추가 (soft delete용)
ALTER TABLE "ChatParticipant" ADD COLUMN IF NOT EXISTS "leftAt" TIMESTAMP(3);

-- 6. Unique 인덱스 추가
CREATE UNIQUE INDEX IF NOT EXISTS "User_loginId_key" ON "User"("loginId");
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_botUserId_key" ON "Admin"("botUserId");

-- 7. 일반 인덱스 추가
CREATE INDEX IF NOT EXISTS "User_loginId_idx" ON "User"("loginId");
CREATE INDEX IF NOT EXISTS "User_isManagedBot_idx" ON "User"("isManagedBot");
CREATE INDEX IF NOT EXISTS "Admin_botUserId_idx" ON "Admin"("botUserId");

-- 8. Foreign key: Admin.botUserId -> User.id
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_botUserId_fkey" FOREIGN KEY ("botUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
