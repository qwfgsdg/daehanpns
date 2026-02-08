-- 대한피앤에스 Phase 1 완전한 스키마 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- ============================================
-- 1. Admin 테이블 필드 추가
-- ============================================

ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "affiliationCode" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- Admin 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_affiliationCode_key" ON "Admin"("affiliationCode");
CREATE INDEX IF NOT EXISTS "Admin_affiliationCode_idx" ON "Admin"("affiliationCode");

-- ============================================
-- 2. User 테이블 필드 추가
-- ============================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- User 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS "User_providerId_key" ON "User"("providerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_nickname_key" ON "User"("nickname");

-- ============================================
-- 완료!
-- ============================================

-- 성공적으로 실행되었다면 터미널에서:
-- cd apps/api
-- npx prisma generate
-- npm run start:dev
