-- 통합관리자 계정 변경: admin -> dhadmin
-- 비밀번호: dhadmin1234

-- 먼저 기존 admin 계정의 loginId 변경
UPDATE "Admin"
SET "loginId" = 'dhadmin',
    "password" = '$2b$10$YourHashedPasswordHere',
    "name" = '통합관리자'
WHERE "loginId" = 'admin' AND "tier" = 'INTEGRATED';
