/**
 * Axios API 클라이언트
 * 백엔드는 래핑 없이 직접 반환 (response.data가 실제 데이터)
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL, API_TIMEOUT } from '@/constants';
import { getAccessToken } from '@/lib/auth/storage';
import { useAuthStore } from '@/store';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 (토큰 첨부)
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 401 에러 → 로그아웃 (refresh token 미지원)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // 네트워크 에러
    if (!error.response) {
      return Promise.reject(
        new Error('네트워크 연결을 확인해주세요')
      );
    }

    // 기타 에러
    return Promise.reject(error);
  }
);

/**
 * API 에러 메시지 추출
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.message ||
      '알 수 없는 오류가 발생했습니다'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다';
};
