import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { login as apiLogin, socialLogin } from '@/lib/api';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';
import { API_URL, GOOGLE_CLIENT_ID, KAKAO_CLIENT_ID } from '@/constants';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google 로그인 (WebBrowser + 서버 프록시 redirect 방식)
  const handleGoogleLogin = async () => {
    const appReturnUrl = makeRedirectUri({ scheme: 'daehanpns', path: 'oauth/google' });
    const googleRedirectUri = `${API_URL}/auth/google/mobile/redirect`;

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(googleRedirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&state=${encodeURIComponent(appReturnUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUrl);

    if (result.type === 'success' && result.url) {
      const codeMatch = result.url.match(/[?&]code=([^&]+)/);
      const code = codeMatch ? codeMatch[1] : null;

      if (code) {
        handleSocialResult('google', { code, redirectUri: googleRedirectUri });
      }
    }
  };

  // Kakao 로그인 (WebBrowser + 서버 프록시 redirect 방식)
  const handleKakaoLogin = async () => {
    const appReturnUrl = makeRedirectUri({ scheme: 'daehanpns', path: 'oauth/kakao' });
    const kakaoRedirectUri = `${API_URL}/auth/kakao/mobile/redirect`;

    const authUrl =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${KAKAO_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(kakaoRedirectUri)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(appReturnUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUrl);

    if (result.type === 'success' && result.url) {
      const codeMatch = result.url.match(/[?&]code=([^&]+)/);
      const code = codeMatch ? codeMatch[1] : null;

      if (code) {
        handleSocialResult('kakao', { code, redirectUri: kakaoRedirectUri });
      }
    }
  };

  const handleLogin = async () => {
    if (!loginId || !password) {
      Alert.alert('오류', '아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiLogin({ loginId, password });
      await setToken(result.accessToken);
      setUser(result.user as any);

      // 기존 유저 loginId 설정 필요 시 강제 이동
      if (result.needsLoginIdSetup) {
        router.replace('/profile/setup-login-id');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialResult = async (
    provider: 'google' | 'kakao',
    data: { idToken?: string; code?: string; redirectUri?: string },
  ) => {
    setIsLoading(true);
    try {
      const result = await socialLogin({ provider, ...data });

      if (result.isNewUser) {
        const socialData = result.googleUser || result.kakaoUser;
        if (!socialData) {
          Alert.alert('오류', '소셜 계정 정보를 가져올 수 없습니다.');
          return;
        }
        router.push({
          pathname: '/register',
          params: {
            socialProvider: provider,
            socialData: JSON.stringify(socialData),
          },
        });
      } else {
        await setToken(result.accessToken);
        setUser(result.user);
        if (result.needsLoginIdSetup) {
          router.replace('/profile/setup-login-id');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
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
          <Text style={styles.label}>아이디</Text>
          <TextInput
            style={styles.input}
            value={loginId}
            onChangeText={setLoginId}
            placeholder="아이디 입력"
            autoCapitalize="none"
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
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>구글로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.kakaoButton}
            onPress={handleKakaoLogin}
            disabled={isLoading}
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
