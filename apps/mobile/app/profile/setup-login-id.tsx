/**
 * 기존 유저 아이디 설정 화면
 * 로그인 후 loginId가 전화번호 패턴이면 강제 이동
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { checkLoginId, updateLoginId } from '@/lib/api';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';

export default function SetupLoginIdScreen() {
  const router = useRouter();
  const { user, setToken, setUser } = useAuthStore();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoginIdChecked, setIsLoginIdChecked] = useState(false);
  const [isLoginIdAvailable, setIsLoginIdAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 기존 소셜 유저인지 판별 (password가 null이면 비밀번호도 설정 필요)
  const needsPassword = user?.provider === 'GOOGLE' || user?.provider === 'KAKAO';

  // 뒤로 가기 차단
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('알림', '아이디를 설정해야 서비스를 이용할 수 있습니다.');
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const handleCheckLoginId = async () => {
    if (!loginId || loginId.length < 4) {
      Alert.alert('오류', '아이디는 4자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkLoginId(loginId);
      setIsLoginIdChecked(true);
      setIsLoginIdAvailable(result.available);

      if (result.available) {
        Alert.alert('확인', '사용 가능한 아이디입니다.');
      } else {
        Alert.alert('오류', result.message);
      }
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isLoginIdChecked || !isLoginIdAvailable) {
      Alert.alert('오류', '아이디 중복확인을 해주세요.');
      return;
    }

    if (needsPassword) {
      if (!password || password.length < 8) {
        Alert.alert('오류', '비밀번호는 8자 이상이어야 합니다.');
        return;
      }
      if (password !== passwordConfirm) {
        Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const data: any = { loginId };
      if (needsPassword && password) {
        data.password = password;
      }

      const result = await updateLoginId(data);
      await setToken(result.accessToken);
      setUser(result.user as any);

      Alert.alert('성공', '아이디가 설정되었습니다!', [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>아이디 설정</Text>
        <Text style={styles.subtitle}>
          서비스 이용을 위해 새로운 아이디를 설정해주세요.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>아이디 *</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={loginId}
              onChangeText={(text) => {
                setLoginId(text);
                setIsLoginIdChecked(false);
                setIsLoginIdAvailable(false);
              }}
              placeholder="4자 이상 입력"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.checkButton, isLoginIdAvailable && styles.checkButtonSuccess]}
              onPress={handleCheckLoginId}
              disabled={isLoading}
            >
              <Text style={styles.checkButtonText}>
                {isLoginIdAvailable ? '확인됨' : '중복확인'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {needsPassword && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호 *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="8자 이상"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호 확인 *</Text>
              <TextInput
                style={styles.input}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry
                placeholder="비밀번호 재입력"
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>설정 완료</Text>
          )}
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flexInput: {
    flex: 1,
  },
  checkButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  checkButtonSuccess: {
    backgroundColor: '#059669',
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
