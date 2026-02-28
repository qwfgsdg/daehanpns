/**
 * 스플래시 화면 (앱 시작 시 표시)
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '@/hooks';
import { COLORS } from '@/constants';
import { checkInstallReferrer } from '@/lib/installReferrer';

export default function SplashScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const redirect = async () => {
      // Install Referrer 확인 (EAS 빌드에서만 동작)
      await checkInstallReferrer();

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    };

    redirect();
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>대한피앤에스</Text>
      <Text style={styles.subtitle}>신뢰와 혁신으로 함께하는 파트너</Text>
      <ActivityIndicator size="large" color="#fff" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});
