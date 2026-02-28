/**
 * 앱 설정 상수
 */

// 서버 기본 URL
const SERVER_URL = 'https://api.dhpns.kr';

// API URL (NestJS 글로벌 prefix /api 포함)
export const API_URL = `${SERVER_URL}/api`;

// Socket URL (Socket.io는 서버 루트에 연결)
export const SOCKET_URL = SERVER_URL;

// 딥링크 스킴
export const APP_SCHEME = 'daehanpns';

// OAuth Client IDs (공개 키 - 클라이언트에 포함 가능)
export const GOOGLE_CLIENT_ID = '644490779474-2o5krsad7irpo50d6ie2q662tegvcqkm.apps.googleusercontent.com';
export const KAKAO_CLIENT_ID = 'b40b859e697b51edab47f95ef9cdfc7c';

// 앱 버전
export const APP_VERSION = '1.0.0';

// 토큰 키 (SecureStore)
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

// API 타임아웃 (ms)
export const API_TIMEOUT = 10000;

// Socket 재연결 설정
export const SOCKET_CONFIG = {
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
  RECONNECTION_ATTEMPTS: 5,
} as const;

// 페이지네이션
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MESSAGE_LIMIT: 50,
} as const;

// 파일 업로드 제한
export const UPLOAD_LIMITS = {
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  FILE_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// 타이핑 타임아웃 (ms)
export const TYPING_TIMEOUT = 3000;

// 캐시 시간 (ms)
export const CACHE_TIME = {
  SHORT: 30 * 1000, // 30초
  MEDIUM: 5 * 60 * 1000, // 5분
  LONG: 30 * 60 * 1000, // 30분
} as const;
