-- ======================================================
-- 전문가 채팅방 생성 및 연결 SQL (방안 A)
-- 전문가: 김택형, 정호진, 유성현
-- 각 전문가당 VIP 1개, VVIP 1개 (총 6개 채팅방)
-- ======================================================

-- ======================================================
-- STEP 1: ChatRoom 테이블에 컬럼 추가
-- ======================================================

ALTER TABLE "ChatRoom"
ADD COLUMN IF NOT EXISTS "expertId" TEXT,
ADD COLUMN IF NOT EXISTS "roomType" TEXT;

-- 확인: 컬럼이 추가되었는지 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ChatRoom'
  AND column_name IN ('expertId', 'roomType');

-- ======================================================
-- STEP 2: 전문가 ID 확인 (참고용)
-- ======================================================

SELECT id, name, "vipRoomId", "vvipRoomId"
FROM "Expert"
WHERE name IN ('김택형', '정호진', '유성현')
ORDER BY name;

-- ======================================================
-- STEP 3: 채팅방 생성
-- type은 ONE_TO_N 사용 (ChatType enum)
-- category는 STOCK 사용 (RoomCategory enum)
-- ======================================================

-- 김택형 전문가 채팅방
INSERT INTO "ChatRoom"
  (id, name, type, category, "maxParticipants", "expertId", "roomType", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '김택형 VIP', 'ONE_TO_N', 'STOCK', 100,
   (SELECT id FROM "Expert" WHERE name = '김택형'), 'VIP', true, NOW(), NOW()),
  (gen_random_uuid(), '김택형 VVIP', 'ONE_TO_N', 'STOCK', 50,
   (SELECT id FROM "Expert" WHERE name = '김택형'), 'VVIP', true, NOW(), NOW());

-- 정호진 전문가 채팅방
INSERT INTO "ChatRoom"
  (id, name, type, category, "maxParticipants", "expertId", "roomType", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '정호진 VIP', 'ONE_TO_N', 'STOCK', 100,
   (SELECT id FROM "Expert" WHERE name = '정호진'), 'VIP', true, NOW(), NOW()),
  (gen_random_uuid(), '정호진 VVIP', 'ONE_TO_N', 'STOCK', 50,
   (SELECT id FROM "Expert" WHERE name = '정호진'), 'VVIP', true, NOW(), NOW());

-- 유성현 전문가 채팅방
INSERT INTO "ChatRoom"
  (id, name, type, category, "maxParticipants", "expertId", "roomType", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '유성현 VIP', 'ONE_TO_N', 'STOCK', 100,
   (SELECT id FROM "Expert" WHERE name = '유성현'), 'VIP', true, NOW(), NOW()),
  (gen_random_uuid(), '유성현 VVIP', 'ONE_TO_N', 'STOCK', 50,
   (SELECT id FROM "Expert" WHERE name = '유성현'), 'VVIP', true, NOW(), NOW());

-- 확인: 생성된 채팅방 목록
SELECT
  cr.id,
  cr.name AS "채팅방명",
  cr.type AS "타입",
  cr."roomType" AS "VIP구분",
  cr."maxParticipants" AS "최대인원",
  e.name AS "전문가명"
FROM "ChatRoom" cr
LEFT JOIN "Expert" e ON cr."expertId" = e.id
WHERE cr.name LIKE '%김택형%' OR cr.name LIKE '%정호진%' OR cr.name LIKE '%유성현%'
ORDER BY e.name, cr."roomType";

-- ======================================================
-- STEP 4: Expert 테이블에 채팅방 ID 연결
-- ======================================================

-- 김택형 전문가
UPDATE "Expert"
SET
  "vipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '김택형 VIP' AND "roomType" = 'VIP'),
  "vvipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '김택형 VVIP' AND "roomType" = 'VVIP')
WHERE name = '김택형';

-- 정호진 전문가
UPDATE "Expert"
SET
  "vipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '정호진 VIP' AND "roomType" = 'VIP'),
  "vvipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '정호진 VVIP' AND "roomType" = 'VVIP')
WHERE name = '정호진';

-- 유성현 전문가
UPDATE "Expert"
SET
  "vipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '유성현 VIP' AND "roomType" = 'VIP'),
  "vvipRoomId" = (SELECT id FROM "ChatRoom" WHERE name = '유성현 VVIP' AND "roomType" = 'VVIP')
WHERE name = '유성현';

-- ======================================================
-- STEP 5: 최종 결과 확인
-- ======================================================

-- Expert와 연결된 채팅방 확인
SELECT
  e.name AS "전문가명",
  vip.name AS "VIP방",
  vip.type AS "채팅타입",
  vip."roomType" AS "VIP구분",
  vvip.name AS "VVIP방",
  vvip.type AS "채팅타입",
  vvip."roomType" AS "VVIP구분"
FROM "Expert" e
LEFT JOIN "ChatRoom" vip ON e."vipRoomId" = vip.id
LEFT JOIN "ChatRoom" vvip ON e."vvipRoomId" = vvip.id
WHERE e.name IN ('김택형', '정호진', '유성현')
ORDER BY e.name;

-- 전체 채팅방 상세 정보
SELECT
  e.name AS "전문가명",
  cr.name AS "채팅방명",
  cr.type AS "채팅타입(ONE_TO_N)",
  cr."roomType" AS "VIP구분",
  cr."maxParticipants" AS "최대인원",
  cr."isActive" AS "활성화",
  cr."createdAt" AS "생성일시"
FROM "ChatRoom" cr
JOIN "Expert" e ON cr."expertId" = e.id
WHERE e.name IN ('김택형', '정호진', '유성현')
ORDER BY e.name, cr."roomType";
