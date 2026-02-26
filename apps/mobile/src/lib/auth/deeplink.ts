/**
 * 딥링크 처리 유틸리티
 */

import * as Linking from 'expo-linking';

export interface InviteData {
  type: 'invite';
  inviteCode: string;
  salesId: string;
}

export interface AuthCallbackData {
  type: 'auth_callback';
  token: string;
}

export interface SocialRegisterData {
  type: 'social_register';
  provider: string;
  data: string;
}

export type DeeplinkData = InviteData | AuthCallbackData | SocialRegisterData;

/**
 * 딥링크 URL 파싱
 * daehanpns://register?inviteCode=ABC123&salesId=xxx
 * daehanpns://auth/callback?token=xxx
 * daehanpns://register/social?provider=google&data=xxx
 */
export const parseDeeplink = (url: string): DeeplinkData | null => {
  try {
    const { hostname, path, queryParams } = Linking.parse(url);
    const fullPath = hostname ? `${hostname}${path ? '/' + path : ''}` : path || '';

    // auth/callback → 기존 유저 OAuth 로그인 완료
    if (fullPath === 'auth/callback' || fullPath === 'auth/callback/') {
      const token = queryParams?.token as string;
      if (token) {
        return { type: 'auth_callback', token };
      }
    }

    // register/social → 신규 유저 소셜 회원가입
    if (fullPath === 'register/social' || fullPath === 'register/social/') {
      const provider = queryParams?.provider as string;
      const data = queryParams?.data as string;
      if (provider && data) {
        return { type: 'social_register', provider, data };
      }
    }

    // register → 초대 링크
    if (hostname === 'register' || fullPath === 'register') {
      const inviteCode = queryParams?.inviteCode as string;
      const salesId = queryParams?.salesId as string;
      if (inviteCode && salesId) {
        return { type: 'invite', inviteCode, salesId };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to parse deeplink:', error);
    return null;
  }
};

/**
 * 초기 URL 가져오기 (앱이 닫혀있을 때 딥링크로 실행된 경우)
 */
export const getInitialDeeplink = async (): Promise<DeeplinkData | null> => {
  try {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      return parseDeeplink(initialUrl);
    }
    return null;
  } catch (error) {
    console.error('Failed to get initial URL:', error);
    return null;
  }
};

/**
 * 딥링크 생성 (공유용)
 */
export const createInviteLink = (inviteCode: string, salesId: string): string => {
  return `daehanpns://register?inviteCode=${inviteCode}&salesId=${salesId}`;
};
