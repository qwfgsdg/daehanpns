-- admin 계정 ID 조회 및 logs.view 권한 추가
INSERT INTO "AdminPermission" ("id", "adminId", "permission", "createdAt")
SELECT
  gen_random_uuid(),
  a.id,
  'logs.view',
  NOW()
FROM "Admin" a
WHERE a."loginId" = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM "AdminPermission" ap
    WHERE ap."adminId" = a.id AND ap.permission = 'logs.view'
  );
