'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type ManagerSearchTab = 'search' | 'code';

export default function PhoneRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0); // 0: SMS 인증, 1: 담당자 선택, 2: 추가 정보 입력

  // SMS 인증 단계
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

  // 추가 정보 입력 단계
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [birthDate, setBirthDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 초대 링크에서 추천 코드 파싱
  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      setReferralCode(inviteCode.toUpperCase());
      setManagerTab('code');
      // 자동으로 추천 코드 검증
      validateInviteCode(inviteCode.toUpperCase());
    }
  }, [searchParams]);

  // 초대 코드 자동 검증
  const validateInviteCode = async (code: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/validate-referral-code?code=${code}`);
      const result = await res.json();

      if (result.valid && result.manager) {
        setValidatedManager(result.manager);
        setSelectedManagerId(result.manager.id);
      }
    } catch (err) {
      // 실패해도 사용자가 직접 입력할 수 있도록 무시
    } finally {
      setIsLoading(false);
    }
  };

  // 생년월일 자동 포맷팅
  const formatBirthDate = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      if (numbers.length >= 5) {
        return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}${numbers.length > 6 ? '-' + numbers.slice(6, 8) : ''}`;
      } else if (numbers.length >= 3) {
        return `${numbers.slice(0, 4)}${numbers.length > 4 ? '-' + numbers.slice(4) : ''}`;
      }
      return numbers;
    }
    return birthDate;
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthDate(e.target.value);
    setBirthDate(formatted);
  };

  // SMS 인증번호 발송
  const handleSendSms = async () => {
    if (!phone || phone.length < 10) {
      setError('올바른 전화번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      // 1. 전화번호 중복 체크
      const checkRes = await fetch(`${API_URL}/auth/check-duplicate?phone=${encodeURIComponent(phone)}`);
      const checkData = await checkRes.json();

      if (checkData.exists) {
        setError('이미 가입된 전화번호입니다. 로그인 페이지에서 로그인해주세요.');
        setIsLoading(false);
        return;
      }

      // 2. SMS 발송
      const res = await fetch(`${API_URL}/auth/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) throw new Error('SMS 발송에 실패했습니다.');

      setSmsSent(true);
      alert('인증번호가 발송되었습니다.\n\n개발 모드: 아무 6자리 숫자나 입력하세요.');
    } catch (err: any) {
      setError(err.message || 'SMS 발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // SMS 인증번호 확인
  const handleVerifySms = async () => {
    if (!smsCode || smsCode.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/sms/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: smsCode }),
      });

      if (!res.ok) throw new Error('인증번호가 올바르지 않습니다.');

      setSmsVerified(true);
      setStep(1);
      alert('인증이 완료되었습니다.');
    } catch (err: any) {
      setError(err.message || '인증번호가 올바르지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 0 → Step 1: SMS 인증 완료 검증
  const handleSmsNext = () => {
    if (!smsVerified) {
      setError('전화번호 인증을 완료해주세요.');
      return;
    }
    setError('');
    setStep(1);
  };

  // 추천 코드 검증
  const handleValidateCode = async () => {
    if (!referralCode) {
      setError('추천 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/validate-referral-code?code=${referralCode}`);
      const result = await res.json();

      if (result.valid && result.manager) {
        setValidatedManager(result.manager);
        setSelectedManagerId(result.manager.id);
      } else {
        setError(result.message || '유효하지 않은 추천 코드입니다.');
        setValidatedManager(null);
        setSelectedManagerId('');
      }
    } catch (err: any) {
      setError('추천 코드 검증에 실패했습니다.');
      setValidatedManager(null);
      setSelectedManagerId('');
    } finally {
      setIsLoading(false);
    }
  };

  // 담당자 이름 검색
  const handleSearchManagers = async () => {
    if (!managerSearchName || managerSearchName.length < 2) {
      setError('최소 2자 이상 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/search-managers?name=${managerSearchName}`);
      const result = await res.json();
      setSearchResults(result.managers);
      if (result.managers.length === 0) {
        setError('검색 결과가 없습니다.');
      }
    } catch (err: any) {
      setError('검색에 실패했습니다.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 담당자 선택
  const handleSelectManager = (manager: any) => {
    setSelectedManagerId(manager.id);
    setValidatedManager(manager);
  };

  // Step 1 → Step 2: 담당자 선택 완료 검증
  const handleManagerNext = () => {
    if (!selectedManagerId) {
      setError('담당자를 선택해주세요.');
      return;
    }
    setError('');
    setStep(2);
  };

  // 회원가입 완료
  const handleRegister = async () => {
    if (!name || name.trim().length === 0) {
      setError('이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const data: any = {
        phone,
        name: name.trim(),
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

      const res = await fetch(`${API_URL}/auth/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || '회원가입에 실패했습니다.');
      }

      // 토큰 저장
      localStorage.setItem('accessToken', result.accessToken);

      alert('회원가입이 완료되었습니다!');
      router.push('/');
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">전화번호로 회원가입</h2>
          <p className="mt-2 text-gray-600">
            간편하게 가입하고 서비스를 시작하세요
          </p>
        </div>

        {/* 진행 상황 - Step 0: SMS 인증, Step 1: 담당자 선택, Step 2: 정보 입력 */}
        <div className="bg-white rounded-lg shadow px-6 py-4 mb-6">
          <div className="flex justify-between items-center">
            <div className={`flex-1 text-center ${step >= 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              전화번호 인증
            </div>
            <div className={`flex-1 text-center ${step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              담당자 선택
            </div>
            <div className={`flex-1 text-center ${step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              정보 입력
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow px-6 py-8">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step 0: SMS 인증 */}
          {step === 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">전화번호 인증</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      disabled={smsSent}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <button
                      onClick={handleSendSms}
                      disabled={smsSent || isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {smsSent ? '발송됨' : '인증번호 발송'}
                    </button>
                  </div>
                </div>

                {smsSent && !smsVerified && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">인증번호</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        placeholder="6자리 숫자"
                        maxLength={6}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleVerifySms}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        확인
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: 담당자 선택 */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">담당자 선택</h3>
              <p className="text-sm text-gray-600 mb-6">
                담당자를 선택하는 방법은 두 가지입니다. 하나만 선택하세요.
              </p>

              {/* 탭 */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => {
                    setManagerTab('search');
                    setReferralCode('');
                    setValidatedManager(null);
                    setSelectedManagerId('');
                  }}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                    managerTab === 'search'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  이름으로 찾기
                </button>
                <button
                  onClick={() => {
                    setManagerTab('code');
                    setManagerSearchName('');
                    setSearchResults([]);
                    setValidatedManager(null);
                    setSelectedManagerId('');
                  }}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                    managerTab === 'code'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  추천코드
                </button>
              </div>

              {/* 이름으로 찾기 */}
              {managerTab === 'search' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">담당자 이름</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={managerSearchName}
                        onChange={(e) => setManagerSearchName(e.target.value)}
                        placeholder="최소 2자 이상 입력"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSearchManagers}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        검색
                      </button>
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                      {searchResults.map((manager) => (
                        <button
                          key={manager.id}
                          onClick={() => handleSelectManager(manager)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-50 ${
                            selectedManagerId === manager.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <p className="font-medium text-gray-900">{manager.name}</p>
                          <p className="text-sm text-gray-500">
                            {manager.tier}
                            {manager.referralCode && ` · ${manager.referralCode}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {validatedManager && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        ✓ 선택된 담당자: {validatedManager.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 추천코드 */}
              {managerTab === 'code' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">추천 코드</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="INT001, CEO001..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleValidateCode}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        확인
                      </button>
                    </div>
                  </div>

                  {validatedManager && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        ✓ 담당자: {validatedManager.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleManagerNext}
                disabled={!selectedManagerId}
                className="mt-6 w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>

              <button
                onClick={() => setStep(0)}
                className="mt-3 w-full py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
              >
                ← 이전
              </button>
            </div>
          )}

          {/* Step 2: 추가 정보 입력 */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">추가 정보 입력</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름을 입력해주세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">닉네임</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="선택사항"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setGender('MALE')}
                      className={`flex-1 py-2 border rounded-md ${
                        gender === 'MALE'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      남성
                    </button>
                    <button
                      onClick={() => setGender('FEMALE')}
                      className={`flex-1 py-2 border rounded-md ${
                        gender === 'FEMALE'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">생년월일 (8자리)</label>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    placeholder="예: 19900101"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    숫자 8자리 입력 시 자동으로 형식이 적용됩니다 (19900101 → 1990-01-01)
                  </p>
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="mt-6 w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '가입 중...' : '회원가입 완료'}
              </button>

              <button
                onClick={() => setStep(1)}
                className="mt-3 w-full py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
              >
                ← 이전
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
