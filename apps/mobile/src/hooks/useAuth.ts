/**
 * 인증 관련 Hook
 */

import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { login as apiLogin, register as apiRegister } from '@/lib/api';
import { LoginRequest, RegisterRequest } from '@/types';
import { useUIStore } from '@/store';
import { getErrorMessage } from '@/lib/api';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    setToken,
    logout: storeLogout,
    checkAuth,
  } = useAuthStore();

  const { showLoading, hideLoading, showToast } = useUIStore();

  // 앱 시작 시 인증 체크
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * 로그인
   */
  const login = async (data: LoginRequest) => {
    try {
      showLoading('로그인 중...');

      const response = await apiLogin(data);

      // 토큰 저장
      await setToken(response.accessToken);

      // 사용자 정보 저장
      setUser(response.user as any);

      showToast('로그인 성공', 'success');

      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error);
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      hideLoading();
    }
  };

  /**
   * 회원가입
   */
  const register = async (data: RegisterRequest) => {
    try {
      showLoading('회원가입 중...');

      const response = await apiRegister(data);

      // 토큰 저장
      await setToken(response.accessToken);

      // 사용자 정보 저장
      setUser(response.user as any);

      showToast('회원가입 성공', 'success');

      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error);
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      hideLoading();
    }
  };

  /**
   * 로그아웃
   */
  const logout = async () => {
    try {
      showLoading('로그아웃 중...');
      await storeLogout();
      showToast('로그아웃되었습니다', 'info');
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error);
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      hideLoading();
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
};
