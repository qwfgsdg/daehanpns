/**
 * Root Layout
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Loading, Toast } from '@/components/shared';
import { useUIStore, useAuthStore } from '@/store';
import { useDeeplink } from '@/hooks';

// React Query 클라이언트
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

export default function RootLayout() {
  const { isLoading, loadingMessage } = useUIStore();
  const { checkAuth } = useAuthStore();

  // 딥링크 처리
  useDeeplink();

  // 앱 시작 시 인증 체크
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    // @ts-expect-error GestureHandlerRootView children type issue
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            >
              {/* 메인 (스플래시) */}
              <Stack.Screen
                name="index"
                options={{
                  headerShown: false,
                }}
              />

              {/* 인증 */}
              <Stack.Screen
                name="login"
                options={{
                  title: '로그인',
                  headerBackTitle: '뒤로',
                }}
              />
              <Stack.Screen
                name="register"
                options={{
                  title: '회원가입',
                  headerBackTitle: '뒤로',
                }}
              />

              {/* 탭 네비게이션 */}
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />

              {/* 채팅 */}
              <Stack.Screen
                name="chat/[id]"
                options={{
                  title: '채팅',
                  headerBackTitle: '뒤로',
                }}
              />
              <Stack.Screen
                name="chat/public"
                options={{
                  title: '공개 채팅방',
                  headerBackTitle: '뒤로',
                }}
              />

              {/* 프로필 */}
              <Stack.Screen
                name="profile/edit"
                options={{
                  title: '프로필 수정',
                  headerBackTitle: '뒤로',
                }}
              />
              <Stack.Screen
                name="profile/password"
                options={{
                  title: '비밀번호 변경',
                  headerBackTitle: '뒤로',
                }}
              />
              <Stack.Screen
                name="profile/setup-login-id"
                options={{
                  title: '아이디 설정',
                  headerBackVisible: false,
                  gestureEnabled: false,
                }}
              />

            </Stack>

            {/* 전역 컴포넌트 */}
            <Loading visible={isLoading} message={loadingMessage || undefined} />
            <Toast />
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
