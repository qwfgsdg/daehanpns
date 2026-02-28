/**
 * API 요청/응답 타입 정의
 * 백엔드는 래핑 없이 직접 반환 (ApiResponse 래퍼 불필요)
 */

// 인증 관련
export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  needsLoginIdSetup?: boolean;
  user: {
    id: string;
    loginId?: string;
    phone?: string;
    name: string;
    nickname?: string;
    managerId?: string;
    affiliateCode?: string;
  };
}

export interface RegisterRequest {
  loginId: string;
  phone?: string;
  password: string;
  name: string;
  nickname?: string;
  gender?: 'MALE' | 'FEMALE';
  birthDate?: string;
  referralCode?: string;
  managerId?: string;
}

export interface SocialCompleteRequest {
  provider: 'GOOGLE' | 'KAKAO';
  providerId: string;
  loginId: string;
  password: string;
  phone?: string;
  name: string;
  nickname?: string;
  gender?: 'MALE' | 'FEMALE';
  birthDate?: string;
  email?: string;
  profileImage?: string;
  referralCode?: string;
  managerId?: string;
}

export interface CheckLoginIdResponse {
  available: boolean;
  message: string;
}

export interface SmsResponse {
  success: boolean;
  message: string;
}

export interface ValidateReferralCodeResponse {
  valid: boolean;
  manager?: {
    id: string;
    name: string;
    region?: string;
    referralCode?: string;
  };
  message?: string;
}

export interface SearchManagersResponse {
  managers: Array<{
    id: string;
    name: string;
    region?: string;
    referralCode?: string;
    tier: string;
  }>;
}

export interface CheckDuplicateResponse {
  exists: boolean;
  message: string;
  provider?: 'GOOGLE' | 'KAKAO' | 'LOCAL';
}

// 페이지네이션
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 채팅 관련
export interface CreateChatRoomRequest {
  name: string;
  type: 'ONE_TO_N' | 'ONE_TO_ONE' | 'TWO_WAY';
  isPublic: boolean;
  memberIds: string[];
  notice?: string;
}

export interface SendMessageRequest {
  roomId: string;
  content?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

export interface GetMessagesQuery {
  roomId: string;
  offset?: number;
  limit?: number;
  before?: string;
}

// 파일 업로드
export interface UploadResponse {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// 구독 관련
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  isPopular?: boolean;
}

// 알림 관련
export interface Notification {
  id: string;
  userId: string;
  type: 'CHAT' | 'NOTICE' | 'SUBSCRIPTION' | 'SYSTEM';
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// 배너
export interface Banner {
  id: string;
  position: string;
  title?: string;
  imageUrl: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}
