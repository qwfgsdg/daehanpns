-- Backfill: loginId = phone (기존 유저 중 loginId가 null인 경우)
UPDATE "User" SET "loginId" = "phone" WHERE "loginId" IS NULL AND "phone" IS NOT NULL;

-- 확인
SELECT COUNT(*) as total_users,
       COUNT("loginId") as with_loginid,
       COUNT(*) - COUNT("loginId") as without_loginid
FROM "User";
