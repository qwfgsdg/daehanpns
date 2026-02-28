'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dhpns.kr/api';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.daehanpns.mobile';
const DEEPLINK_SCHEME = 'daehanpns';

interface ManagerInfo {
  id: string;
  name: string;
  region?: string;
  referralCode?: string;
}

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;

  const [manager, setManager] = useState<ManagerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    validateCode();
  }, [code]);

  const validateCode = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/validate-referral-code?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.valid && data.manager) {
        setManager(data.manager);
      } else {
        setError('유효하지 않은 초대 코드입니다.');
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const url = `${PLAY_STORE_URL}&referrer=${encodeURIComponent(code)}`;
    window.location.href = url;
  };

  const handleOpenApp = () => {
    window.location.href = `${DEEPLINK_SCHEME}://register?ref=${encodeURIComponent(code)}`;

    // 딥링크 실패 시 3초 후 Play Store로 이동
    setTimeout(() => {
      handleDownload();
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-4 text-gray-600">초대 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">초대 링크 오류</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            홈으로 이동
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* 헤더 */}
        <div className="bg-blue-600 px-8 py-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">대한P&S</h1>
          <p className="text-blue-100">초대를 받으셨습니다</p>
        </div>

        {/* 담당자 정보 */}
        <div className="px-8 py-8">
          {manager && (
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <p className="text-sm text-blue-600 font-medium mb-1">담당자 정보</p>
              <p className="text-xl font-bold text-gray-900">{manager.name}</p>
              {manager.region && (
                <p className="text-gray-600 mt-1">{manager.region}</p>
              )}
            </div>
          )}

          <p className="text-gray-600 text-center mb-8">
            대한P&S 앱을 설치하고 다양한 서비스를 이용해보세요.
          </p>

          {/* 버튼 */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
            >
              앱 다운로드
            </button>

            <button
              onClick={handleOpenApp}
              className="w-full bg-white text-blue-600 py-4 rounded-xl font-semibold text-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
            >
              이미 설치되어 있어요
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            초대 코드: {code}
          </p>
        </div>
      </div>
    </div>
  );
}
