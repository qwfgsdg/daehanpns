export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  KAKAO = 'KAKAO',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum AdminTier {
  INTEGRATED = 'INTEGRATED', // 통합관리자
  CEO = 'CEO',               // 대표관리자
  MIDDLE = 'MIDDLE',         // 중간관리자
  GENERAL = 'GENERAL',       // 일반관리자
}

export enum ChatType {
  ONE_TO_N = 'ONE_TO_N',     // 1:N (방장 → 회원들)
  ONE_TO_ONE = 'ONE_TO_ONE', // 1:1 (회원 ↔ 회원)
}

export enum OwnerType {
  OWNER = 'OWNER',           // 방장
  VICE_OWNER = 'VICE_OWNER', // 부방장
  MEMBER = 'MEMBER',         // 일반 참여자
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',         // 시스템 알림
  CHAT = 'CHAT',             // 채팅 알림
  COMMUNITY = 'COMMUNITY',   // 커뮤니티 알림
  SUBSCRIPTION = 'SUBSCRIPTION', // 구독 알림
}

export enum NotifCategory {
  CHAT_MESSAGE = 'CHAT_MESSAGE',           // 채팅 메시지
  CHAT_ROOM_INVITE = 'CHAT_ROOM_INVITE',   // 채팅방 초대
  CHAT_ROOM_KICK = 'CHAT_ROOM_KICK',       // 채팅방 강퇴
  COMMUNITY_COMMENT = 'COMMUNITY_COMMENT', // 커뮤니티 댓글
  COMMUNITY_LIKE = 'COMMUNITY_LIKE',       // 커뮤니티 좋아요
  SUBSCRIPTION_APPROVED = 'SUBSCRIPTION_APPROVED', // 구독 승인
  SUBSCRIPTION_REJECTED = 'SUBSCRIPTION_REJECTED', // 구독 거절
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',   // 구독 만료
  SYSTEM_NOTICE = 'SYSTEM_NOTICE',         // 시스템 공지
  SYSTEM_EVENT = 'SYSTEM_EVENT',           // 이벤트 알림
}

export enum CommunityCategory {
  NOTICE = 'NOTICE',         // 공지사항
  FREE = 'FREE',             // 자유게시판
  QNA = 'QNA',               // Q&A
  REVIEW = 'REVIEW',         // 후기
}

export enum ReportStatus {
  PENDING = 'PENDING',       // 대기중
  PROCESSING = 'PROCESSING', // 처리중
  RESOLVED = 'RESOLVED',     // 해결됨
  REJECTED = 'REJECTED',     // 기각됨
}

export enum BannerPos {
  HOME_TOP = 'HOME_TOP',         // 홈 상단
  HOME_MIDDLE = 'HOME_MIDDLE',   // 홈 중단
  HOME_BOTTOM = 'HOME_BOTTOM',   // 홈 하단
  CHAT_TOP = 'CHAT_TOP',         // 채팅 상단
  COMMUNITY_TOP = 'COMMUNITY_TOP', // 커뮤니티 상단
}

export enum DismissType {
  TODAY = 'TODAY',           // 오늘 하루 보지 않기
  WEEK = 'WEEK',             // 일주일 보지 않기
  FOREVER = 'FOREVER',       // 다시 보지 않기
}

export enum SubscriptionStatus {
  PENDING = 'PENDING',       // 승인 대기
  ACTIVE = 'ACTIVE',         // 활성
  EXPIRED = 'EXPIRED',       // 만료
  CANCELLED = 'CANCELLED',   // 취소
}

export enum Platform {
  WEB = 'WEB',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}
