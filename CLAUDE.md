# Daehan P&S (대한피앤에스) - Claude Code Context

## 프로젝트 개요
주식/코인 트레이딩 가이드 및 전문가 상담 플랫폼. 모노레포 구조.

## 기술 스택

| 앱 | 프레임워크 | 포트 | 경로 |
|----|-----------|------|------|
| Backend API | NestJS 10.3 + TypeScript 5.3 | 3000 | `apps/api/` |
| Admin Dashboard | Next.js 15.1 + React 19 + Tailwind | 3001 | `apps/admin/` |
| Public Website | Next.js 14 + React 18 + Tailwind | 3002 | `apps/web/` |
| Mobile App | Expo 54 + React Native 0.81 + Expo Router 6 | - | `apps/mobile/` |
| Shared | 공통 타입/상수/유틸 | - | `packages/shared/` |

## 인프라
- **DB**: PostgreSQL 15 (Prisma ORM 5.8)
- **Cache**: Redis 7 (ioredis)
- **Storage**: AWS S3
- **Push**: Firebase Admin (FCM)
- **SMS**: Aligo
- **Auth**: JWT + OAuth (Google, Kakao)
- **Realtime**: Socket.io 4.6
- **Deploy**: Railway (API, Tokyo), Vercel (Admin)

## 핵심 명령어
```bash
npm install              # 의존성 설치
npm run dev              # 전체 앱 개발 실행
npm run api:dev          # API만 실행
cd apps/api && npm run db:setup    # DB 마이그레이션 + Prisma 생성
cd apps/api && npm run prisma:studio  # DB GUI
docker-compose up -d     # PostgreSQL + Redis 로컬 실행
```

## 프로젝트 구조 핵심

### Backend (apps/api/src/)
- `modules/auth/` - JWT, OAuth 전략
- `modules/prisma/` - DB 클라이언트
- `modules/redis/` - 캐싱
- `modules/files/` - S3 파일 업로드
- `admins/`, `users/`, `chats/`, `subscriptions/`, `experts/` - 기능별 모듈
- `common/decorators/` - @RequirePermission, @Public
- `common/constants/` - 권한, 역할 상수

### Admin (apps/admin/)
- Next.js App Router
- 페이지: dashboard, users, admins, chats, subscriptions, experts, app-versions, banners, logs, chat-stats

### Mobile (apps/mobile/)
- Expo Router (파일 기반 라우팅)
- Zustand (상태관리) + React Query (서버 상태)
- `src/store/` - auth, chat, socket, ui
- `src/hooks/` - useAuth, useChat, usePermission, useDeeplink
- `src/lib/` - api client, socket client, utils
- `src/components/` - chat, shared, ui

## DB 주요 모델 (Prisma)
- **User** - 회원 (STOCK/COIN/HYBRID)
- **Admin** - 관리자 (INTEGRATED/CEO/MIDDLE/GENERAL)
- **ChatRoom** - 채팅방 (ONE_TO_N/ONE_TO_ONE/TWO_WAY)
- **ChatMessage** - 메시지 (파일 첨부, 소프트 삭제)
- **ChatParticipant** - 참여자 (OWNER/VICE_OWNER/MEMBER, 쉐도우밴)
- **Subscription** - 구독 (VIP/VVIP)
- **Expert** - 전문가 프로필
- **Banner/Popup** - 사이트 콘텐츠
- **AdminLog** - 관리자 감사 로그

## 도메인
- daehanpns.net - 홈페이지
- signaltalk.net - 웹 채팅
- admin.daehanpns.net - 관리자

## 개발 컨벤션
- NestJS: 모듈 기반, 기능별 분리 (controller + service + module)
- Frontend: Next.js App Router, Tailwind CSS
- Mobile: Expo Router, Zustand + 커스텀 훅 패턴
- API 응답: 전체 래핑 없이 직접 반환
- 인증: JWT Bearer + Passport 전략
- 관리자: 계층 구조 (parent/subordinate), 세분화된 권한

## 환경변수 (.env)
DATABASE_URL, REDIS_HOST/PORT/PASSWORD, JWT_SECRET, GOOGLE/KAKAO OAuth, ALIGO SMS, AWS S3, FCM, CORS_ORIGINS
