# Supabase SQL 마이그레이션 가이드

## 📝 실행 방법

1. **Supabase 대시보드 열기**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor로 이동**
   - 왼쪽 메뉴에서 **SQL Editor** 클릭
   - **New Query** 버튼 클릭

3. **SQL 파일 복사**
   - `apps/api/migration.sql` 파일 내용 전체 복사
   - 또는 아래 경로에서 직접 열기:
   ```
   C:\Users\user\안티그래비티\클로드 코드\daehanpns\apps\api\migration.sql
   ```

4. **SQL Editor에 붙여넣기 & 실행**
   - 복사한 SQL 전체를 Editor에 붙여넣기
   - **Run** 버튼 클릭 (또는 Ctrl+Enter)

5. **완료 확인**
   - 에러 없이 실행되면 성공!
   - 왼쪽 메뉴에서 **Table Editor** 클릭하면 생성된 테이블들 확인 가능

## ✅ 생성되는 테이블 (17개)

- User (회원)
- Admin (관리자)
- AdminPermission (관리자 권한)
- AdminLog (감사 로그)
- MemberMemo (회원 메모)
- ChatRoom (채팅방)
- ChatParticipant (채팅 참가자)
- ChatMessage (채팅 메시지)
- ChatPinnedMessage (고정 메시지)
- BlockedKeyword (차단 키워드)
- Notification (알림)
- NotificationSetting (알림 설정)
- Community (커뮤니티)
- CommunityComment (댓글)
- CommunityLike (좋아요)
- Faq (FAQ)
- Report (신고)
- Banner (배너)
- Popup (팝업)
- PopupDismissal (팝업 안보기)
- Subscription (구독)
- DiscountEvent (할인 이벤트)
- AppVersion (앱 버전)

## 🚀 완료 후

SQL 실행이 성공하면:

```bash
cd apps/api
npx prisma generate
npm run start:dev
```

서버가 http://localhost:3000 에서 실행됩니다!
