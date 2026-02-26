/**
 * 토큰 저장 및 관리 (SecureStore)
 */

import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEYS } from '@/constants';

/**
 * Access Token 가져오기
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
};

/**
 * Access Token 저장
 */
export const saveAccessToken = async (accessToken: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  } catch (error) {
    console.error('Failed to save access token:', error);
    throw error;
  }
};

/**
 * 토큰 삭제
 */
export const clearTokens = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
};
