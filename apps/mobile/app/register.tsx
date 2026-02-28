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
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  register as apiRegister,
  completeSocialRegister,
  sendSms,
  verifySms,
  validateReferralCode,
  searchManagers,
  socialLogin,
  checkLoginId,
} from '@/lib/api';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';
import { API_URL, GOOGLE_CLIENT_ID, KAKAO_CLIENT_ID } from '@/constants';
import { getStoredInviteRef, clearStoredInviteRef } from '@/hooks/useDeeplink';

WebBrowser.maybeCompleteAuthSession();

type ManagerSearchTab = 'search' | 'code';
type SignupMethod = 'google' | 'kakao' | 'phone' | null;

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setToken, setUser } = useAuthStore();

  // Step 0: 가입 방법 선택, Step 1: 담당자 선택, Step 2: 회원정보 입력
  const [step, setStep] = useState(0);
  const [signupMethod, setSignupMethod] = useState<SignupMethod>(null);

  // 소셜 데이터 (구글/카카오 가입 시)
  const [socialData, setSocialData] = useState<any>(null);
  const [socialProvider, setSocialProvider] = useState<'google' | 'kakao' | null>(null);

  // SMS 인증 (전화번호 가입 시)
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);

  // 담당자 선택 단계
  const [managerTab, setManagerTab] = useState<ManagerSearchTab>('search');
  const [referralCode, setReferralCode] = useState('');
  const [managerSearchName, setManagerSearchName] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [validatedManager, setValidatedManager] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isInviteReadOnly, setIsInviteReadOnly] = useState(false);

  // 회원정보 입력 단계
  const [loginId, setLoginId] = useState('');
  const [isLoginIdChecked, setIsLoginIdChecked] = useState(false);
  const [isLoginIdAvailable, setIsLoginIdAvailable] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [birthDate, setBirthDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // 소셜 로그인 파라미터 처리 (login.tsx에서 넘어온 경우)
  useEffect(() => {
    const sp = params.socialProvider as string | undefined;
    const sd = params.socialData as string | undefined;

    if (sp && sd) {
      try {
        const parsed = JSON.parse(sd);
        setSocialProvider(sp as 'google' | 'kakao');
        setSocialData(parsed);
        setSignupMethod(sp as 'google' | 'kakao');
        setName(parsed.name || '');
        setStep(1); // 담당자 선택으로 바로 이동
      } catch (err) {
        Alert.alert('오류', 'SNS 정보를 불러올 수 없습니다.');
      }
    }
  }, [params.socialProvider, params.socialData]);

  // 초대링크 처리 (ref 파라미터 또는 AsyncStorage)
  useEffect(() => {
    const refCode = params.ref as string | undefined;
    if (refCode) {
      setReferralCode(refCode);
      setManagerTab('code');
      setIsInviteReadOnly(true);
      handleAutoValidateCode(refCode);
    } else {
      // AsyncStorage에서 저장된 초대 코드 확인
      getStoredInviteRef().then((storedRef) => {
        if (storedRef) {
          setReferralCode(storedRef);
          setManagerTab('code');
          setIsInviteReadOnly(true);
          handleAutoValidateCode(storedRef);
        }
      });
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
      }
    } catch (err: any) {
      Alert.alert('오류', '초대링크가 유효하지 않습니다.');
      setIsInviteReadOnly(false);
    } finally {
      setIsLoading(false);
    }
  };

  // === Step 0: 가입 방법 선택 ===

  // Google 로그인
  const handleGoogleSignup = async () => {
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
        await handleSocialAuth('google', { code, redirectUri: googleRedirectUri });
      }
    }
  };

  // Kakao 로그인
  const handleKakaoSignup = async () => {
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
        await handleSocialAuth('kakao', { code, redirectUri: kakaoRedirectUri });
      }
    }
  };

  const handleSocialAuth = async (
    provider: 'google' | 'kakao',
    data: { code: string; redirectUri: string },
  ) => {
    setIsLoading(true);
    try {
      const result = await socialLogin({ provider, ...data });

      if (result.isNewUser) {
        const sData = result.googleUser || result.kakaoUser;
        if (!sData) {
          Alert.alert('오류', '소셜 계정 정보를 가져올 수 없습니다.');
          return;
        }
        setSocialProvider(provider);
        setSocialData(sData);
        setSignupMethod(provider);
        setName(sData.name || '');
        setStep(1); // 담당자 선택으로 이동
      } else {
        // 기존 유저
        await setToken(result.accessToken);
        setUser(result.user);
        Alert.alert('알림', '이미 가입된 계정입니다. 로그인되었습니다.', [
          { text: '확인', onPress: () => router.replace('/(tabs)') },
        ]);
      }
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 전화번호 가입 선택
  const handlePhoneSignup = () => {
    setSignupMethod('phone');
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
      setStep(1); // 담당자 선택으로 이동
      Alert.alert('성공', '인증이 완료되었습니다.');
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // === Step 1: 담당자 선택 ===

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
        Alert.alert('확인 완료', `담당자: ${result.manager.name}${result.manager.affiliationCode ? ` (${result.manager.affiliationCode})` : ''}`);
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

  const handleSelectManager = (manager: any) => {
    setSelectedManagerId(manager.id);
    setValidatedManager(manager);
    Alert.alert('담당자 선택', `${manager.name}${manager.affiliationCode ? ` (${manager.affiliationCode})` : ''} 님을 선택하셨습니다.`);
  };

  const handleManagerNext = () => {
    if (!selectedManagerId) {
      Alert.alert('오류', '담당자를 선택해주세요.');
      return;
    }
    setStep(2);
  };

  // === Step 2: 회원정보 입력 ===

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

  const handleRegister = async () => {
    if (!isLoginIdChecked || !isLoginIdAvailable) {
      Alert.alert('오류', '아이디 중복확인을 해주세요.');
      return;
    }
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
      let result;

      if (signupMethod === 'google' || signupMethod === 'kakao') {
        // 소셜 가입
        const data: any = {
          provider: socialProvider!.toUpperCase(),
          providerId: socialData.providerId,
          loginId,
          password,
          name,
          nickname: nickname || undefined,
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          email: socialData.email,
          profileImage: socialData.profileImage,
        };

        if (managerTab === 'code' && referralCode) {
          data.referralCode = referralCode;
        } else if (selectedManagerId) {
          data.managerId = selectedManagerId;
        }

        result = await completeSocialRegister(data);
      } else {
        // 전화번호 가입
        const data: any = {
          loginId,
          phone,
          password,
          name,
          nickname: nickname || undefined,
          gender: gender || undefined,
          birthDate: birthDate || undefined,
        };

        if (managerTab === 'code' && referralCode) {
          data.referralCode = referralCode;
        } else if (selectedManagerId) {
          data.managerId = selectedManagerId;
        }

        result = await apiRegister(data);
      }

      await setToken(result.accessToken);
      setUser(result.user as any);

      // 초대 코드 정리
      await clearStoredInviteRef();

      Alert.alert('성공', '회원가입이 완료되었습니다!', [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 진행 상황 표시
  const stepLabels = ['가입 방법', '담당자 선택', '정보 입력'];
  const renderProgress = () => (
    <View style={styles.progressBar}>
      {stepLabels.map((label, i) => (
        <View key={i} style={[styles.progressStep, step >= i && styles.progressStepActive]}>
          <Text style={[styles.progressText, step >= i && styles.progressTextActive]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>대한P&S에 오신 것을 환영합니다</Text>
      </View>

      {renderProgress()}

      {/* Step 0: 가입 방법 선택 */}
      {step === 0 && !signupMethod && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>가입 방법을 선택하세요</Text>

          <View style={styles.signupMethods}>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignup}
              disabled={isLoading}
            >
              <Text style={styles.socialButtonText}>구글로 가입하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kakaoButton}
              onPress={handleKakaoSignup}
              disabled={isLoading}
            >
              <Text style={styles.kakaoButtonText}>카카오로 가입하기</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.phoneButton}
              onPress={handlePhoneSignup}
              disabled={isLoading}
            >
              <Text style={styles.phoneButtonText}>전화번호로 가입하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 0: 전화번호 SMS 인증 (인라인) */}
      {step === 0 && signupMethod === 'phone' && (
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
            onPress={() => {
              setSignupMethod(null);
              setPhone('');
              setSmsCode('');
              setSmsSent(false);
              setSmsVerified(false);
            }}
          >
            <Text style={styles.backButtonText}>다른 방법으로 가입</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 1: 담당자 선택 */}
      {step === 1 && (
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
                if (isInviteReadOnly) return;
                setManagerTab('search');
                setReferralCode('');
                setValidatedManager(null);
                setSelectedManagerId('');
              }}
              disabled={isInviteReadOnly}
            >
              <Text style={[styles.tabButtonText, managerTab === 'search' && styles.tabButtonTextActive]}>
                이름으로 찾기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, managerTab === 'code' && styles.tabButtonActive]}
              onPress={() => {
                if (isInviteReadOnly) return;
                setManagerTab('code');
                setManagerSearchName('');
                setSearchResults([]);
                setValidatedManager(null);
                setSelectedManagerId('');
              }}
              disabled={isInviteReadOnly}
            >
              <Text style={[styles.tabButtonText, managerTab === 'code' && styles.tabButtonTextActive]}>
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
                <TouchableOpacity style={styles.button} onPress={handleSearchManagers} disabled={isLoading}>
                  <Text style={styles.buttonText}>검색</Text>
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((manager) => (
                    <TouchableOpacity
                      key={manager.id}
                      style={[styles.managerItem, selectedManagerId === manager.id && styles.managerItemSelected]}
                      onPress={() => handleSelectManager(manager)}
                    >
                      <Text style={styles.managerName}>{manager.name}</Text>
                      <Text style={styles.managerDetails}>
                        {manager.affiliationCode ? `소속코드: ${manager.affiliationCode}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {validatedManager && (
                <View style={styles.managerInfo}>
                  <Text style={styles.managerInfoText}>
                    선택된 담당자: {validatedManager.name}
                    {validatedManager.affiliationCode && ` (${validatedManager.affiliationCode})`}
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
                  style={[styles.input, styles.flexInput, isInviteReadOnly && styles.inputDisabled]}
                  value={referralCode}
                  onChangeText={(text) => setReferralCode(text.toUpperCase())}
                  placeholder="INT001, CEO001..."
                  autoCapitalize="characters"
                  editable={!isInviteReadOnly}
                />
                {!isInviteReadOnly && (
                  <TouchableOpacity style={styles.button} onPress={handleValidateCode} disabled={isLoading}>
                    <Text style={styles.buttonText}>확인</Text>
                  </TouchableOpacity>
                )}
              </View>
              {validatedManager && (
                <View style={styles.managerInfo}>
                  <Text style={styles.managerInfoText}>
                    담당자: {validatedManager.name}
                    {validatedManager.affiliationCode && ` (${validatedManager.affiliationCode})`}
                    {isInviteReadOnly && ' (초대링크)'}
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

          <TouchableOpacity style={styles.backButton} onPress={() => setStep(0)}>
            <Text style={styles.backButtonText}>이전</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: 회원정보 입력 */}
      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>회원정보 입력</Text>

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
                style={[styles.button, isLoginIdAvailable && styles.buttonSuccess]}
                onPress={handleCheckLoginId}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoginIdAvailable ? '확인됨' : '중복확인'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
              style={[styles.input, (signupMethod === 'google' || signupMethod === 'kakao') && styles.inputDisabled]}
              value={name}
              onChangeText={setName}
              placeholder="홍길동"
              editable={signupMethod === 'phone'}
            />
            {(signupMethod === 'google' || signupMethod === 'kakao') && (
              <Text style={styles.helperText}>SNS에서 가져온 정보입니다</Text>
            )}
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
                <Text style={[styles.genderButtonText, gender === 'MALE' && styles.genderButtonTextActive]}>
                  남성
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'FEMALE' && styles.genderButtonActive]}
                onPress={() => setGender('FEMALE')}
              >
                <Text style={[styles.genderButtonText, gender === 'FEMALE' && styles.genderButtonTextActive]}>
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

          <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
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
    paddingTop: 20,
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
  signupMethods: {
    marginTop: 16,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 14,
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
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  kakaoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  phoneButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
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
  inputDisabled: {
    backgroundColor: '#f3f4f6',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#9ca3af',
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
});
