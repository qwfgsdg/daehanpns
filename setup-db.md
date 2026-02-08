# 데이터베이스 세팅 가이드

## ✅ 체크리스트

- [ ] Railway 또는 Supabase 가입 완료
- [ ] PostgreSQL DATABASE_URL 받음
- [ ] Redis 연결 정보 받음 (Upstash 또는 Railway)
- [ ] apps/api/.env 파일에 연결 정보 입력
- [ ] 아래 명령어 실행

## 📝 .env 파일 설정 예시

```env
# Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Upstash Redis
REDIS_HOST=grizzly-crab-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# 나머지는 기본값 유지
JWT_SECRET=your-random-secret-key-here
```

## 🚀 실행 명령어

```bash
# 1. API 디렉토리로 이동
cd apps/api

# 2. Prisma 마이그레이션 (DB 테이블 생성)
npx prisma migrate dev --name init

# 3. 개발 서버 실행
npm run start:dev
```

## 🧪 테스트

서버가 실행되면:
- http://localhost:3000 접속
- Swagger UI는 나중에 추가 예정
- Postman으로 `/auth/admin/login` 등 테스트 가능

## ❓ 문제 해결

### "Can't reach database server"
- DATABASE_URL이 올바른지 확인
- Supabase 프로젝트가 깨어있는지 확인 (Paused 상태면 Resume)

### "Redis connection failed"
- REDIS_HOST, REDIS_PORT, REDIS_PASSWORD 확인
- Upstash 대시보드에서 연결 정보 재확인

### Migration 실패
- DATABASE_URL에 `?pgbouncer=true` 가 있으면 제거
- Supabase에서 **Direct connection** URL 사용
