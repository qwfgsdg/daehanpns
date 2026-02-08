-- ======================================================
-- 전문가 채팅방 생성 및 연결 SQL
-- 전문가: 김택형, 정호진, 유성현
-- 각 전문가당 VIP 1개, VVIP 1개 (총 6개 채팅방)
-- ======================================================

-- 1. 먼저 Expert ID 확인 (참고용)
SELECT id, name, "vipRoomId", "vvipRoomId" FROM "Expert"
WHERE name IN ('김택형', '정호진', '유성현')
ORDER BY name;

-- ======================================================
-- 2. 채팅방 생성
-- ======================================================

-- 김택형 전문가 채팅방
INSERT INTO "ChatRoom" (id, name, type, "maxParticipants", "expertId", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '김택형 VIP', 'VIP', 100,
   (SELECT id FROM "Expert" WHERE name = '김택형'),
   NOW(), NOW()),
  (gen_random_uuid(), '김택형 VVIP', 'VVIP', 50,
   (SELECT id FROM "Expert" WHERE name = '김택형'),
   NOW(), NOW());

-- 정호진 전문가 채팅방
INSERT INTO "ChatRoom" (id, name, type, "maxParticipants", "expertId", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '정호진 VIP', 'VIP', 100,
   (SELECT id FROM "Expert" WHERE name = '정호진'),
   NOW(), NOW()),
  (gen_random_uuid(), '정호진 VVIP', 'VVIP', 50,
   (SELECT id FROM "Expert" WHERE name = '정호진'),
   NOW(), NOW());

-- 유성현 전문가 채팅방
INSERT INTO "ChatRoom" (id, name, type, "maxParticipants", "expertId", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '유성현 VIP', 'VIP', 100,
   (SELECT id FROM "Expert" WHERE name = '유성현'),
   NOW(), NOW()),
  (gen_random_uuid(), '유성현 VVIP', 'VVIP', 50,
   (SELECT id FROM "Expert" WHERE name = '유성현'),
   NOW(), NOW());

-- ======================================================
-- 3. Expert 테이블에 채팅방 ID 연결
-- ======================================================

-- 김택형 전문가
UPDATE "Expert"
SET
  "vipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '김택형 VIP'),
  "vvipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '김택형 VVIP')
WHERE name = '김택형';

-- 정호진 전문가
UPDATE "Expert"
SET
  "vipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '정호진 VIP'),
  "vvipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '정호진 VVIP')
WHERE name = '정호진';

-- 유성현 전문가
UPDATE "Expert"
SET
  "vipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '유성현 VIP'),
  "vvipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '유성현 VVIP')
WHERE name = '유성현';

-- ======================================================
-- 4. 결과 확인
-- ======================================================

-- Expert와 연결된 채팅방 확인
SELECT
  e.name AS "전문가명",
  vip.name AS "VIP방",
  vip.type AS "VIP타입",
  vvip.name AS "VVIP방",
  vvip.type AS "VVIP타입"
FROM "Expert" e
LEFT JOIN "ChatRoom" vip ON e."vipRoomId" = vip.id
LEFT JOIN "ChatRoom" vvip ON e."vvipRoomId" = vvip.id
WHERE e.name IN ('김택형', '정호진', '유성현')
ORDER BY e.name;

-- 생성된 채팅방 목록 확인
SELECT
  cr.name AS "채팅방명",
  cr.type AS "타입",
  cr."maxParticipants" AS "최대인원",
  e.name AS "전문가명"
FROM "ChatRoom" cr
JOIN "Expert" e ON cr."expertId" = e.id
WHERE e.name IN ('김택형', '정호진', '유성현')
ORDER BY e.name, cr.type;
