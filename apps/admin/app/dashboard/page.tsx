'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { canAccessMenu } from '@/lib/permissions';
import { useAdmin } from '@/contexts/AdminContext';

export default function DashboardPage() {
  const router = useRouter();
  const { admin, isLoading: adminLoading, logout } = useAdmin();
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [selectedTrendPeriod, setSelectedTrendPeriod] = useState<'7' | '30'>('7');

  useEffect(() => {
    const loadStats = async () => {
      if (!auth.isAuthenticated()) {
        router.push('/login');
        return;
      }

      try {
        setIsLoadingStats(true);
        const statsData = await ApiClient.getDashboardStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, [router]);

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      INTEGRATED: '통합관리자',
      CEO: '대표관리자',
      MIDDLE: '중간관리자',
      GENERAL: '일반관리자',
    };
    return labels[tier] || tier;
  };

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      INTEGRATED: 'bg-purple-100 text-purple-800',
      CEO: 'bg-red-100 text-red-800',
      MIDDLE: 'bg-green-100 text-green-800',
      GENERAL: 'bg-blue-100 text-blue-800',
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  if (adminLoading || isLoadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const trendData = selectedTrendPeriod === '7' ? stats.trends.last7Days : stats.trends.last30Days;
  const maxCount = Math.max(...trendData.map((d: any) => d.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            대한피앤에스 관리자
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {admin?.tier && (
                <span className={`px-2 py-1 text-xs rounded-full ${getTierBadgeColor(admin.tier)}`}>
                  {getTierLabel(admin.tier)}
                </span>
              )}
              <span className="text-sm text-gray-600">
                {admin?.name || admin?.loginId}님
              </span>
            </div>
            <Button variant="outline" onClick={logout}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h2>
          <p className="text-gray-600">실시간 통계 및 시스템 현황</p>
        </div>

        {/* 빠른 액션 */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h3>
          <div className="flex flex-wrap gap-3">
            {canAccessMenu(admin, '/users') && (
              <Button onClick={() => router.push('/users')}>
                회원 관리
              </Button>
            )}
            {canAccessMenu(admin, '/admins') && (
              <Button onClick={() => router.push('/admins')}>
                관리자 관리
              </Button>
            )}
            {canAccessMenu(admin, '/subscriptions') && (
              <Button onClick={() => router.push('/subscriptions')}>
                구독 관리
              </Button>
            )}
          </div>
        </div>

        {/* 주요 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="실시간 온라인"
            value={stats?.onlineUsers || 0}
            subtitle="현재 접속 중"
            color="text-green-600"
          />
          <StatCard
            title="오늘 신규 회원"
            value={stats?.newUsers.today || 0}
            subtitle="명"
            color="text-blue-600"
          />
          <StatCard
            title="장기 미접속"
            value={stats?.inactiveUsers || 0}
            subtitle="30일 이상"
            color="text-yellow-600"
          />
        </div>

        {/* 세부 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 신규 회원 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">신규 회원</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">오늘</span>
                <span className="text-lg font-bold text-gray-900">{stats?.newUsers.today || 0}명</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">7일</span>
                <span className="text-lg font-bold text-gray-900">{stats?.newUsers.last7Days || 0}명</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">30일</span>
                <span className="text-lg font-bold text-gray-900">{stats?.newUsers.last30Days || 0}명</span>
              </div>
            </div>
          </div>

          {/* 채팅 통계 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">채팅 통계</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">오늘 메시지</span>
                <span className="text-lg font-bold text-gray-900">{stats?.todayChatMessages || 0}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">활성 채팅방</span>
                <span className="text-lg font-bold text-gray-900">{stats?.activeChatRooms || 0}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">오늘 활동 회원</span>
                <span className="text-lg font-bold text-gray-900">{stats?.todayActiveUsers || 0}명</span>
              </div>
            </div>
          </div>

          {/* 구독 현황 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">구독 현황</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">활성</span>
                <span className="text-lg font-bold text-green-600">{stats?.subscriptions.active || 0}명</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">만료</span>
                <span className="text-lg font-bold text-gray-600">{stats?.subscriptions.expired || 0}명</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">대기</span>
                <span className="text-lg font-bold text-yellow-600">{stats?.subscriptions.pending || 0}명</span>
              </div>
            </div>
          </div>
        </div>

        {/* 회원 가입 트렌드 그래프 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">회원 가입 트렌드</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTrendPeriod('7')}
                className={`px-3 py-1 text-sm rounded ${
                  selectedTrendPeriod === '7'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                7일
              </button>
              <button
                onClick={() => setSelectedTrendPeriod('30')}
                className={`px-3 py-1 text-sm rounded ${
                  selectedTrendPeriod === '30'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                30일
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {trendData.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(item.date).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex-1">
                  <div
                    className="bg-blue-500 h-6 rounded transition-all"
                    style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: item.count > 0 ? '2%' : '0' }}
                  ></div>
                </div>
                <div className="w-12 text-right text-sm font-medium text-gray-900">
                  {item.count}명
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canAccessMenu(admin, '/users') && (
            <MenuCard
              title="회원 관리"
              description="회원 목록, 메모, 차단 관리"
              href="/users"
            />
          )}
          {canAccessMenu(admin, '/admins') && (
            <MenuCard
              title="관리자 관리"
              description="관리자 추가, 권한 설정"
              href="/admins"
            />
          )}
          {canAccessMenu(admin, '/subscriptions') && (
            <MenuCard
              title="구독 관리"
              description="구독 승인, 거절, 이벤트"
              href="/subscriptions"
            />
          )}
          {canAccessMenu(admin, '/chats') && (
            <MenuCard
              title="채팅 관리"
              description="채팅방, 메시지 관리"
              href="/chats"
            />
          )}
          {canAccessMenu(admin, '/logs') && (
            <MenuCard
              title="감사 로그"
              description="관리자 활동 로그 조회"
              href="/logs"
            />
          )}
          {canAccessMenu(admin, '/banners') && (
            <MenuCard
              title="배너/팝업 관리"
              description="배너, 팝업 생성 및 관리"
              href="/banners"
            />
          )}
          {canAccessMenu(admin, '/app-versions') && (
            <MenuCard
              title="앱 버전 관리"
              description="iOS/Android 버전 관리 및 강제 업데이트"
              href="/app-versions"
            />
          )}
          <MenuCard
            title="채팅 통계"
            description="회원별, 채팅방별 메시지 통계 및 트렌드"
            href="/chat-stats"
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

function MenuCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200 hover:border-blue-300"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}
