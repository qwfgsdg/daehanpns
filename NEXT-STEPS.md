# 🚀 다음 단계

## ✅ 완료된 것
- [x] Turborepo 모노레포 구조
- [x] NestJS 백엔드 API 전체 모듈
- [x] Prisma 스키마 (17개 테이블)
- [x] 69개 파일, 16,539줄 코드
- [x] Git 초기 커밋

## 📝 지금 해야 할 일

### Step 1: 데이터베이스 준비 (5분)

**Option A: Supabase (추천) ⭐**
1. https://supabase.com 가입
2. New Project → 프로젝트 이름 입력
3. Database Password 설정 (저장 필수!)
4. Region: **Northeast Asia (Seoul)** 선택
5. 프로젝트 생성 대기 (약 2분)
6. Settings → Database → Connection String 복사

**Option B: Railway**
1. https://railway.app 가입
2. New Project → Deploy PostgreSQL
3. Variables 탭에서 DATABASE_URL 복사

### Step 2: Redis 준비 (2분)

**Upstash (무료, 추천)**
1. https://upstash.com 가입
2. Create Database → Region: Tokyo
3. Details → Host, Port, Password 복사

### Step 3: 환경 변수 설정

`apps/api/.env` 파일 열기 → DATABASE_URL과 REDIS 정보 입력

```env
DATABASE_URL=받은_postgresql_URL
REDIS_HOST=받은_호스트
REDIS_PORT=6379
REDIS_PASSWORD=받은_비밀번호
```

### Step 4: 실행!

**Windows:**
```bash
# 더블클릭으로 실행
quick-start.bat
```

**수동 실행:**
```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

서버가 http://localhost:3000 에서 실행됩니다!

---

## 🧪 API 테스트

### Postman/Thunder Client로 테스트:

**관리자 계정 생성 (직접 DB에 추가 필요):**
```sql
-- Prisma Studio로 실행 (npm run prisma:studio)
-- 또는 Supabase SQL Editor에서:

INSERT INTO "Admin" (id, "loginId", password, name, tier, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$rGfE7YZKcJELQqJ5X9G1eOqKZ8vXFj4Z5LmN3jVH6Ic8dK2sY8VLi', -- 비밀번호: admin123
  '통합관리자',
  'INTEGRATED',
  NOW(),
  NOW()
);
```

**로그인 테스트:**
```http
POST http://localhost:3000/auth/admin/login
Content-Type: application/json

{
  "loginId": "admin",
  "password": "admin123"
}
```

---

## ❓ 다음은?

- [ ] API 테스트 완료
- [ ] Phase 2: 관리자페이지 (Next.js) 개발 시작
- [ ] Phase 3: 홈페이지 개발
- [ ] Phase 4: 모바일 앱 개발
- [ ] GitHub에 Push
- [ ] Railway 배포

---

## 🆘 문제 해결

### "Can't reach database server"
→ DATABASE_URL 확인, Supabase 프로젝트가 활성 상태인지 확인

### "Redis connection refused"
→ REDIS_HOST, PORT, PASSWORD 재확인

### Migration 실패
→ DATABASE_URL에서 `?pgbouncer=true` 제거
→ Supabase: Direct connection string 사용

### 포트 3000이 이미 사용 중
→ `.env`에서 `PORT=3001`로 변경

---

## 📚 참고 링크

- Supabase Docs: https://supabase.com/docs
- Upstash Redis: https://docs.upstash.com/redis
- Prisma Docs: https://www.prisma.io/docs
- NestJS Docs: https://docs.nestjs.com
