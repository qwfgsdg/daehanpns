import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  register as apiRegister,
  sendSms,
  verifySms,
  validateReferralCode,
  searchManagers,
} from '@/lib/api';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';
import { API_URL } from '@/constants';

type ManagerSearchTab = 'search' | 'code';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setToken, setUser } = useAuthStore();
  const [step, setStep] = useState(0); // 0: 담당자 선택, 1: SMS 인증, 2: 추가 정보 입력

  // 담당자 선택 단계
  const [managerTab, setManagerTab] = useState<ManagerSearchTab>('search');
  const [referralCode, setReferralCode] = useState('');
  const [managerSearchName, setManagerSearchName] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [validatedManager, setValidatedManager] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // SMS 인증 단계
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);

  // 추가 정보 입력 단계
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [birthDate, setBirthDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // 초대링크 처리 (ref 파라미터)
  useEffect(() => {
    const refCode = params.ref as string | undefined;
    if (refCode) {
      setReferralCode(refCode);
      setManagerTab('code');
      handleAutoValidateCode(refCode);
    }
  }, [params.ref]);

  const handleAutoValidateCode = async (code: string) => {
    if (!code) return;

    setIsLoading(true);
    try {
      const result = await validateReferralCode(code);
      if (result.valid && result.manager) {
        setValidatedManager(result.manager);
        setSelectedManagerId(result.manager.id);
        Alert.alert(
          '초대링크 확인',
          `담당자: ${result.manager.name} (${result.manager.region || '지역 없음'})\n\n다음 단계로 진행하시겠습니까?`,
          [{ text: '확인' }]
        );
      }
    } catch (err: any) {
      Alert.alert('오류', '초대링크가 유효하지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 추천 코드 검증
  const handleValidateCode = async () => {
    if (!referralCode) {
      Alert.alert('오류', '추천 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await validateReferralCode(referralCode);
      if (result.valid && result.manager) {
        setValidatedManager(result.manager);
        setSelectedManagerId(result.manager.id);
        Alert.alert(
          '확인 완료',
          `담당자: ${result.manager.name} (${result.manager.region || '지역 없음'})`
        );
      } else {
        Alert.alert('오류', result.message || '유효하지 않은 추천 코드입니다.');
        setValidatedManager(null);
        setSelectedManagerId('');
      }
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
      setValidatedManager(null);
      setSelectedManagerId('');
    } finally {
      setIsLoading(false);
    }
  };

  // 담당자 이름 검색
  const handleSearchManagers = async () => {
    if (!managerSearchName || managerSearchName.length < 2) {
      Alert.alert('오류', '최소 2자 이상 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await searchManagers(managerSearchName);
      setSearchResults(result.managers);
      if (result.managers.length === 0) {
        Alert.alert('알림', '검색 결과가 없습니다.');
      }
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 담당자 선택
  const handleSelectManager = (manager: any) => {
    setSelectedManagerId(manager.id);
    setValidatedManager(manager);
    Alert.alert(
      '담당자 선택',
      `${manager.name} (${manager.region || '지역 없음'}) 님을 선택하셨습니다.`
    );
  };

  // Step 0 → Step 1: 담당자 선택 완료
  const handleManagerNext = () => {
    if (!selectedManagerId) {
      Alert.alert('오류', '담당자를 선택해주세요.');
      return;
    }
    setStep(1);
  };

  // SMS 인증번호 발송
  const handleSendSms = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('오류', '올바른 전화번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await sendSms(phone);
      setSmsSent(true);
      Alert.alert('성공', '인증번호가 발송되었습니다.');
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // SMS 인증번호 확인
  const handleVerifySms = async () => {
    if (!smsCode || smsCode.length !== 6) {
      Alert.alert('오류', '6자리 인증번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await verifySms(phone, smsCode);
      setSmsVerified(true);
      setStep(2);
      Alert.alert('성공', '인증이 완료되었습니다.');
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 완료
  const handleRegister = async () => {
    if (!password || password.length < 6) {
      Alert.alert('오류', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!name) {
      Alert.alert('오류', '이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const data: any = {
        phone,
        password,
        name,
        nickname: nickname || undefined,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
      };

      // 담당자 정보 추가
      if (managerTab === 'code' && referralCode) {
        data.referralCode = referralCode;
      } else if (managerTab === 'search' && selectedManagerId) {
        data.managerId = selectedManagerId;
      }

      const result = await apiRegister(data);

      // SecureStore에 토큰 저장
      await setToken(result.accessToken);
      // 유저 정보 저장
      setUser(result.user as any);

      Alert.alert('성공', '회원가입이 완료되었습니다!', [
        {
          text: '확인',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 진행 상황 표시
  const renderProgress = () => (
    <View style={styles.progressBar}>
      <View style={[styles.progressStep, step >= 0 && styles.progressStepActive]}>
        <Text style={[styles.progressText, step >= 0 && styles.progressTextActive]}>
          담당자 선택
        </Text>
      </View>
      <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
        <Text style={[styles.progressText, step >= 1 && styles.progressTextActive]}>
          전화번호 인증
        </Text>
      </View>
      <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
        <Text style={[styles.progressText, step >= 2 && styles.progressTextActive]}>
          정보 입력
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>대한P&S에 오신 것을 환영합니다</Text>
      </View>

      {renderProgress()}

      {/* SNS 간편 가입 */}
      {step === 0 && (
        <View style={styles.section}>
          <Text style={styles.description}>SNS 계정으로 간편하게 가입하세요</Text>
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={async () => {
                const authUrl = `${API_URL}/auth/google?platform=mobile`;
                const supported = await Linking.canOpenURL(authUrl);
                if (supported) {
                  await Linking.openURL(authUrl);
                } else {
                  Alert.alert('오류', 'OAuth 페이지를 열 수 없습니다.');
                }
              }}
            >
              <Text style={styles.socialButtonText}>구글로 가입하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kakaoButton}
              onPress={async () => {
                const authUrl = `${API_URL}/auth/kakao?platform=mobile`;
                const supported = await Linking.canOpenURL(authUrl);
                if (supported) {
                  await Linking.openURL(authUrl);
                } else {
                  Alert.alert('오류', 'OAuth 페이지를 열 수 없습니다.');
                }
              }}
            >
              <Text style={styles.kakaoButtonText}>카카오로 가입하기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는 일반 회원가입</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>
      )}

      {/* Step 0: 담당자 선택 */}
      {step === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>담당자 선택</Text>
          <Text style={styles.description}>
            담당자를 선택하는 방법은 두 가지입니다. 하나만 선택하세요.
          </Text>

          {/* 탭 버튼 */}
          <View style={styles.tabButtons}>
            <TouchableOpacity
              style={[styles.tabButton, managerTab === 'search' && styles.tabButtonActive]}
              onPress={() => {
                setManagerTab('search');
                setReferralCode('');
                setValidatedManager(null);
                setSelectedManagerId('');
              }}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  managerTab === 'search' && styles.tabButtonTextActive,
                ]}
              >
                이름으로 찾기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, managerTab === 'code' && styles.tabButtonActive]}
              onPress={() => {
                setManagerTab('code');
                setManagerSearchName('');
                setSearchResults([]);
                setValidatedManager(null);
                setSelectedManagerId('');
              }}
            >
              <Text
                style={[styles.tabButtonText, managerTab === 'code' && styles.tabButtonTextActive]}
              >
                추천코드
              </Text>
            </TouchableOpacity>
          </View>

          {/* 이름으로 찾기 */}
          {managerTab === 'search' && (
            <View style={styles.tabContent}>
              <Text style={styles.label}>담당자 이름</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  value={managerSearchName}
                  onChangeText={setManagerSearchName}
                  placeholder="최소 2자 이상 입력"
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSearchManagers}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>검색</Text>
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((manager) => (
                    <TouchableOpacity
                      key={manager.id}
                      style={[
                        styles.managerItem,
                        selectedManagerId === manager.id && styles.managerItemSelected,
                      ]}
                      onPress={() => handleSelectManager(manager)}
                    >
                      <Text style={styles.managerName}>{manager.name}</Text>
                      <Text style={styles.managerDetails}>
                        {manager.region || '지역 없음'} · {manager.tier}
                        {manager.referralCode && ` · ${manager.referralCode}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {validatedManager && (
                <View style={styles.managerInfo}>
                  <Text style={styles.managerInfoText}>
                    선택된 담당자: {validatedManager.name}
                    {validatedManager.region && ` (${validatedManager.region})`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 추천코드 */}
          {managerTab === 'code' && (
            <View style={styles.tabContent}>
              <Text style={styles.label}>추천 코드</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  value={referralCode}
                  onChangeText={(text) => setReferralCode(text.toUpperCase())}
                  placeholder="INT001, CEO001..."
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleValidateCode}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>확인</Text>
                </TouchableOpacity>
              </View>
              {validatedManager && (
                <View style={styles.managerInfo}>
                  <Text style={styles.managerInfoText}>
                    담당자: {validatedManager.name}
                    {validatedManager.region && ` (${validatedManager.region})`}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.nextButton, !selectedManagerId && styles.buttonDisabled]}
            onPress={handleManagerNext}
            disabled={!selectedManagerId}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 1: SMS 인증 */}
      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>전화번호 인증</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>전화번호</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flexInput]}
                value={phone}
                onChangeText={setPhone}
                placeholder="01012345678"
                keyboardType="phone-pad"
                editable={!smsSent}
              />
              <TouchableOpacity
                style={[styles.button, smsSent && styles.buttonDisabled]}
                onPress={handleSendSms}
                disabled={smsSent || isLoading}
              >
                <Text style={styles.buttonText}>{smsSent ? '발송됨' : '인증번호 발송'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {smsSent && !smsVerified && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>인증번호</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  value={smsCode}
                  onChangeText={setSmsCode}
                  placeholder="6자리 숫자"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.button, styles.buttonSuccess]}
                  onPress={handleVerifySms}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(0)}
          >
            <Text style={styles.backButtonText}>이전</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: 추가 정보 입력 */}
      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>추가 정보 입력</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="6자 이상"
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="홍길동"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="선택사항"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>성별</Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'MALE' && styles.genderButtonActive]}
                onPress={() => setGender('MALE')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'MALE' && styles.genderButtonTextActive,
                  ]}
                >
                  남성
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'FEMALE' && styles.genderButtonActive]}
                onPress={() => setGender('FEMALE')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'FEMALE' && styles.genderButtonTextActive,
                  ]}
                >
                  여성
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>생년월일</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD (선택사항)"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>회원가입 완료</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(1)}
          >
            <Text style={styles.backButtonText}>이전</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
    paddingBottom: 20,
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
  progressBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  progressStepActive: {
    borderBottomColor: '#2563eb',
  },
  progressText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  progressTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  tabButtons: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  tabContent: {
    marginBottom: 20,
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
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonSuccess: {
    backgroundColor: '#059669',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  managerInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
  },
  managerInfoText: {
    fontSize: 14,
    color: '#065f46',
  },
  searchResults: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    maxHeight: 240,
  },
  managerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  managerItemSelected: {
    backgroundColor: '#dbeafe',
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  managerDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  nextButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  socialButtons: {
    marginTop: 16,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
});
