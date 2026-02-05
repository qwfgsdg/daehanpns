# 대한피앤에스 (Daehan P&S)

기업 홈페이지 + 관리자페이지 + 모바일 앱 (iOS/Android) 프로젝트

## 프로젝트 구조

```
daehanpns/
├── apps/
│   ├── api/          # NestJS 백엔드 API
│   ├── web/          # Next.js 프론트엔드 (홈페이지 + 관리자)
│   └── mobile/       # Expo React Native 앱
├── packages/
│   ├── shared/       # 공통 타입, 상수, 유틸리티
│   └── ui/           # 공통 UI 컴포넌트
└── docker/           # Docker 설정
```

## 기술 스택

- **백엔드**: NestJS, TypeScript, Socket.io, PostgreSQL, Prisma, Redis
- **프론트엔드**: Next.js 14+, React
- **모바일**: Expo, React Native
- **파일 저장**: AWS S3
- **Push 알림**: FCM
- **SMS**: Aligo
- **배포**: Vercel (프론트), Railway (백엔드/DB)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 환경 변수를 설정합니다.

```bash
cp .env.example .env
```

### 3. 데이터베이스 마이그레이션

```bash
cd apps/api
npm run prisma:migrate
npm run prisma:generate
```

### 4. 개발 서버 실행

```bash
# API 서버 실행
npm run api:dev

# 또는 모든 앱 동시 실행
npm run dev
```

## API 서버

API 서버는 `http://localhost:3000/api`에서 실행됩니다.

### 주요 엔드포인트

- `POST /api/auth/admin/login` - 관리자 로그인
- `POST /api/auth/user/register` - 회원 가입
- `POST /api/auth/user/login` - 회원 로그인
- `POST /api/auth/sms/send` - SMS 인증번호 발송
- `GET /api/auth/google` - 구글 OAuth 로그인
- `GET /api/auth/kakao` - 카카오 OAuth 로그인

## 도메인

- **daehanpns.net** - 기업 홈페이지
- **signaltalk.net** - 웹 채팅 클라이언트
- **admin.daehanpns.net** - 관리자 페이지

## 관리자 계층

1. **통합관리자 (INTEGRATED)** - 모든 권한
2. **대표관리자 (CEO)** - 대부분의 관리 권한
3. **중간관리자 (MIDDLE)** - 제한된 관리 권한
4. **일반관리자 (GENERAL)** - 조회 권한 중심

## 개발 순서

1. **Phase 1** - 백엔드 API (NestJS)
2. **Phase 2** - 관리자페이지
3. **Phase 3** - 홈페이지
4. **Phase 4** - 모바일 앱

## 배포

### Railway (백엔드)

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인 및 배포
railway login
railway up
```

### Vercel (프론트엔드)

```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
cd apps/web
vercel
```

## 라이선스

Private - 대한피앤에스
