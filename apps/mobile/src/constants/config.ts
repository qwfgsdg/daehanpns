/**
 * 앱 설정 상수
 */

// API URL (환경에 따라 변경)
// 개발 시 모바일에서 접근하려면 localhost 대신 PC의 로컬 IP 사용
export const API_URL = __DEV__
  ? 'http://192.168.0.132:3000'
  : 'https://api.dhpns.kr';

// Socket URL (일반적으로 API URL과 동일)
export const SOCKET_URL = API_URL;

// 딥링크 스킴
export const APP_SCHEME = 'daehanpns';

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
