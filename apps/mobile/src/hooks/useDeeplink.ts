/**
 * 딥링크 처리 Hook
 */

import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { parseDeeplink, InviteData, DeeplinkData } from '@/lib/auth/deeplink';
import { useAuthStore } from '@/store';

export const useDeeplink = () => {
  const router = useRouter();
  const { setToken } = useAuthStore();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  useEffect(() => {
    // 앱이 닫혀있을 때 딥링크로 실행된 경우
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeeplink(initialUrl);
      }
    };

    // 앱이 이미 실행 중일 때 딥링크를 받은 경우
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeeplink(url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeeplink = async (url: string) => {
    const data = parseDeeplink(url);
    if (!data) return;

    switch (data.type) {
      case 'auth_callback':
        // OAuth 기존 유저 → 토큰 저장 후 메인으로 이동
        await setToken(data.token);
        router.replace('/(tabs)');
        break;

      case 'social_register':
        // OAuth 신규 유저 → 소셜 회원가입 화면으로 이동
        router.push(`/register/social?provider=${data.provider}&data=${encodeURIComponent(data.data)}`);
        break;

      case 'invite':
        // 초대 링크 → 회원가입 페이지로 이동
        setInviteData(data);
        router.push('/register');
        break;
    }
  };

  const clearInviteData = () => {
    setInviteData(null);
  };

  return {
    inviteData,
    clearInviteData,
  };
};
