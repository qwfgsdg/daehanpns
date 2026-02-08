import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from '@/lib/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('오류', '전화번호와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await ApiClient.login(phone, password);

      // 토큰 저장
      await AsyncStorage.setItem('accessToken', result.accessToken);

      Alert.alert('성공', '로그인되었습니다!', [
        {
          text: '확인',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch (err: any) {
      Alert.alert('오류', err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    // 모바일 플랫폼 파라미터 추가
    const authUrl = `${API_URL}/auth/${provider}?platform=mobile`;

    // 브라우저에서 OAuth 페이지 열기
    const supported = await Linking.canOpenURL(authUrl);
    if (supported) {
      await Linking.openURL(authUrl);
    } else {
      Alert.alert('오류', 'OAuth 페이지를 열 수 없습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.subtitle}>대한P&S 회원 로그인</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>전화번호</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="01012345678"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="비밀번호 입력"
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>로그인</Text>
          )}
        </TouchableOpacity>

        {/* 구분선 */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* SNS 로그인 버튼 */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleSocialLogin('google')}
          >
            <Text style={styles.socialButtonText}>구글로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.kakaoButton}
            onPress={() => handleSocialLogin('kakao')}
          >
            <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
          </TouchableOpacity>
        </View>

        {/* 회원가입 링크 */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.registerLinkText}>회원가입하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  socialButtons: {
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  kakaoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});
