-- ======================================================
-- AdminLog 테이블 구조 변경
-- 목적: 감사 로그 기능 강화
-- ======================================================

-- 1. 기존 adminId NOT NULL 제약 제거 및 nullable로 변경
ALTER TABLE "AdminLog"
ALTER COLUMN "adminId" DROP NOT NULL;

-- 2. 새 컬럼 추가
ALTER TABLE "AdminLog"
ADD COLUMN IF NOT EXISTS "changesBefore" JSONB,
ADD COLUMN IF NOT EXISTS "changesAfter" JSONB,
ADD COLUMN IF NOT EXISTS "targetType" TEXT,
ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'SUCCESS';

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS "AdminLog_targetType_idx" ON "AdminLog"("targetType");
CREATE INDEX IF NOT EXISTS "AdminLog_status_idx" ON "AdminLog"("status");
CREATE INDEX IF NOT EXISTS "AdminLog_target_targetType_idx" ON "AdminLog"("target", "targetType");

-- 4. 확인: 변경된 컬럼 구조
SELECT
  column_name AS "컬럼명",
  data_type AS "데이터타입",
  is_nullable AS "NULL허용",
  column_default AS "기본값"
FROM information_schema.columns
WHERE table_name = 'AdminLog'
ORDER BY ordinal_position;

-- 5. 샘플 데이터 확인
SELECT
  COUNT(*) AS "전체 로그 수",
  COUNT("adminId") AS "adminId 있는 로그",
  COUNT(*) - COUNT("adminId") AS "adminId 없는 로그"
FROM "AdminLog";
