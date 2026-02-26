/**
 * 인증 관련 API
 * 백엔드 엔드포인트: /auth/*
 * 응답: 래핑 없이 직접 반환
 */

import { apiClient } from './client';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  SocialCompleteRequest,
  SmsResponse,
  ValidateReferralCodeResponse,
  SearchManagersResponse,
  CheckDuplicateResponse,
} from '@/types';

/**
 * 로그인 (전화번호 + 비밀번호)
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    '/auth/user/login',
    data
  );
  return response.data;
};

/**
 * 회원가입
 */
export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    '/auth/user/register',
    data
  );
  return response.data;
};

/**
 * SMS 인증번호 발송
 */
export const sendSms = async (phone: string): Promise<SmsResponse> => {
  const response = await apiClient.post<SmsResponse>(
    '/auth/sms/send',
    { phone }
  );
  return response.data;
};

/**
 * SMS 인증번호 확인
 */
export const verifySms = async (phone: string, code: string): Promise<SmsResponse> => {
  const response = await apiClient.post<SmsResponse>(
    '/auth/sms/verify',
    { phone, code }
  );
  return response.data;
};

/**
 * 추천 코드 검증
 */
export const validateReferralCode = async (code: string): Promise<ValidateReferralCodeResponse> => {
  const response = await apiClient.get<ValidateReferralCodeResponse>(
    '/auth/validate-referral-code',
    { params: { code } }
  );
  return response.data;
};

/**
 * 담당자 이름 검색
 */
export const searchManagers = async (name: string): Promise<SearchManagersResponse> => {
  const response = await apiClient.get<SearchManagersResponse>(
    '/auth/search-managers',
    { params: { name } }
  );
  return response.data;
};

/**
 * 전화번호 중복 확인
 */
export const checkDuplicate = async (phone: string): Promise<CheckDuplicateResponse> => {
  const response = await apiClient.get<CheckDuplicateResponse>(
    '/auth/check-duplicate',
    { params: { phone } }
  );
  return response.data;
};

/**
 * 소셜 회원가입 완료
 */
export const completeSocialRegister = async (data: SocialCompleteRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    '/auth/social/complete',
    data
  );
  return response.data;
};

/**
 * 로그아웃 (클라이언트 측 토큰 삭제만 수행)
 */
export const logout = async (): Promise<void> => {
  // 백엔드에 별도 로그아웃 엔드포인트 없음
  // 클라이언트에서 토큰 삭제로 처리 (store/auth.ts의 logout)
};
