/**
 * 소셜 회원가입 - register.tsx로 리다이렉트
 * 기존 딥링크(daehanpns://register/social?provider=...&data=...) 호환용
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function SocialRegisterRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const provider = params.provider as string;
    const data = params.data as string;

    if (provider && data) {
      router.replace({
        pathname: '/register',
        params: {
          socialProvider: provider,
          socialData: data,
        },
      });
    } else {
      router.replace('/register');
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
