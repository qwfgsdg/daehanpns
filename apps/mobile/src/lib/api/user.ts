/**
 * 사용자 관련 API
 * 백엔드는 래핑 없이 직접 반환
 */

import { apiClient } from './client';
import { User, Subscription, Notification, SubscriptionPlan } from '@/types';

/**
 * 내 정보 조회
 */
export const getMyProfile = async (): Promise<User> => {
  const response = await apiClient.get('/user/me');
  return response.data;
};

/**
 * 내 정보 수정
 */
export const updateMyProfile = async (data: Partial<User>): Promise<User> => {
  const response = await apiClient.patch('/user/me', data);
  return response.data;
};

/**
 * 비밀번호 변경
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await apiClient.post('/user/change-password', {
    currentPassword,
    newPassword,
  });
};

/**
 * 내 구독 정보 조회
 */
export const getMySubscription = async (): Promise<Subscription | null> => {
  const response = await apiClient.get('/subscriptions/my');
  return response.data || null;
};

/**
 * 구독 플랜 목록 조회
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiClient.get('/subscriptions/plans');
  return response.data || [];
};

/**
 * 구독 신청 (관리자 승인 방식)
 */
export const requestSubscription = async (planId: string): Promise<void> => {
  await apiClient.post('/subscriptions', { planId });
};

/**
 * 알림 목록 조회
 */
export const getNotifications = async (): Promise<Notification[]> => {
  const response = await apiClient.get('/notifications');
  return response.data || [];
};

/**
 * 알림 읽음 처리
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  await apiClient.put(`/notifications/${notificationId}/read`);
};

/**
 * 안 읽은 알림 개수
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await apiClient.get('/notifications/unread/count');
  return response.data?.count || 0;
};

/**
 * Push 알림 토큰 등록
 */
export const registerPushToken = async (token: string): Promise<void> => {
  await apiClient.post('/notifications/register-token', { token });
};

/**
 * 회원 탈퇴
 */
export const deleteAccount = async (): Promise<void> => {
  await apiClient.delete('/user/me');
};
