SELECT 
  a."loginId",
  a."name",
  a."tier",
  ap."permission"
FROM "Admin" a
LEFT JOIN "AdminPermission" ap ON a.id = ap."adminId"
WHERE a."loginId" = 'admin'
ORDER BY ap."permission";
