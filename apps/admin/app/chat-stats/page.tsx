'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { canAccessMenu } from '@/lib/permissions';
import { useAdmin } from '@/contexts/AdminContext';

interface StatsSummary {
  totalMessages: number;
  activeUsers: number;
  activeAdmins: number;
  weeklyChange: number;
}

interface TopUser {
  userId: string;
  nickname: string;
  name: string;
  profileImage?: string | null;
  messageCount: number;
  roomCount: number;
  weeklyChange: number;
}

interface DailyTrend {
  date: string;
  messageCount: number;
}

interface UserStat {
  userId: string;
  nickname: string;
  name: string;
  profileImage?: string | null;
  messageCount: number;
  roomCount: number;
  weeklyChange: number;
}

interface RoomStat {
  roomId: string;
  roomName: string;
  roomType: string;
  category: string;
  messageCount: number;
  participantCount: number;
  weeklyChange: number;
}

export default function ChatStatsPage() {
  const router = useRouter();
  const { admin, isLoading: adminLoading } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);

  // 날짜 범위 (기본값: 최근 7일)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 통계 데이터
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [userStats, setUserStats] = useState<{ users: UserStat[]; total: number }>({ users: [], total: 0 });
  const [roomStats, setRoomStats] = useState<{ rooms: RoomStat[]; total: number }>({ rooms: [], total: 0 });

  // 페이지네이션
  const [userPage, setUserPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);

  // 검색
  const [userSearch, setUserSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');

  // 현재 보는 탭
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rooms'>('overview');

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (admin) {
      // 권한 체크 (대표관리자 이상만 접근 가능 - 임시로 모든 관리자 허용)
      // TODO: 통계 권한 체크 로직 추가

      // 기본 날짜 설정 (최근 7일)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);

      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
      setIsLoading(false);
    }
  }, [admin, router]);

  // 통계 데이터 로드
  useEffect(() => {
    if (!startDate || !endDate) return;

    const loadStats = async () => {
      try {
        const [summaryData, topUsersData, trendData] = await Promise.all([
          ApiClient.getChatStatsSummary({ startDate, endDate, scope: 'all' }),
          ApiClient.getChatTopUsers({ startDate, endDate, limit: 10 }),
          ApiClient.getChatDailyTrend({ startDate, endDate, scope: 'all' }),
        ]);

        setSummary(summaryData);
        setTopUsers(topUsersData);
        setDailyTrend(trendData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
  }, [startDate, endDate]);

  // 회원별 통계 로드
  useEffect(() => {
    if (!startDate || !endDate || activeTab !== 'users') return;

    const loadUserStats = async () => {
      try {
        const data = await ApiClient.getChatUserStats({
          startDate,
          endDate,
          page: userPage,
          limit: 20,
          search: userSearch,
        });
        setUserStats(data);
      } catch (error) {
        console.error('Failed to load user stats:', error);
      }
    };

    loadUserStats();
  }, [startDate, endDate, userPage, userSearch, activeTab]);

  // 채팅방별 통계 로드
  useEffect(() => {
    if (!startDate || !endDate || activeTab !== 'rooms') return;

    const loadRoomStats = async () => {
      try {
        const data = await ApiClient.getChatRoomStats({
          startDate,
          endDate,
          page: roomPage,
          limit: 20,
          search: roomSearch,
        });
        setRoomStats(data);
      } catch (error) {
        console.error('Failed to load room stats:', error);
      }
    };

    loadRoomStats();
  }, [startDate, endDate, roomPage, roomSearch, activeTab]);

  const handleLogout = () => {
    auth.removeToken();
    router.push('/login');
  };

  const handleQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const maxTrendCount = Math.max(...dailyTrend.map((d) => d.messageCount), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              ← 대시보드
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">채팅 통계</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{admin?.name || admin?.loginId}님</span>
            <Button variant="outline" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 날짜 범위 선택 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">기간 선택</h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="outline" onClick={() => handleQuickDateRange(7)}>
              최근 7일
            </Button>
            <Button variant="outline" onClick={() => handleQuickDateRange(30)}>
              최근 30일
            </Button>
            <Button variant="outline" onClick={() => handleQuickDateRange(90)}>
              최근 90일
            </Button>
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <span className="text-gray-600">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* 탭 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                개요
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'users'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                회원별 통계
              </button>
              <button
                onClick={() => setActiveTab('rooms')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'rooms'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                채팅방별 통계
              </button>
            </div>
          </div>
        </div>

        {/* 개요 탭 */}
        {activeTab === 'overview' && (
          <>
            {/* 요약 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="총 메시지 수"
                value={summary?.totalMessages || 0}
                subtitle="개"
                color="text-blue-600"
                change={summary?.weeklyChange || 0}
              />
              <StatCard
                title="활성 회원"
                value={summary?.activeUsers || 0}
                subtitle="명"
                color="text-green-600"
              />
              <StatCard
                title="활성 관리자"
                value={summary?.activeAdmins || 0}
                subtitle="명"
                color="text-purple-600"
              />
              <StatCard
                title="전주 대비"
                value={summary?.weeklyChange || 0}
                subtitle="%"
                color={
                  (summary?.weeklyChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }
                isPercentage={true}
              />
            </div>

            {/* TOP 10 활동 회원 */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">TOP 10 활동 회원</h3>
              {topUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          순위
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          회원
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          메시지 수
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          참여 방
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          전주 대비
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {topUsers.map((user, index) => (
                        <tr key={user.userId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {user.profileImage ? (
                                <img
                                  src={user.profileImage}
                                  alt={user.nickname}
                                  className="w-8 h-8 rounded-full mr-2"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 mr-2"></div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.nickname}
                                </div>
                                <div className="text-xs text-gray-500">{user.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {user.messageCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {user.roomCount}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right ${
                              user.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {user.weeklyChange > 0 ? '+' : ''}
                            {user.weeklyChange}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 일별 메시지 추이 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">일별 메시지 추이</h3>
              {dailyTrend.length === 0 ? (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {dailyTrend.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-gray-600">
                        {new Date(item.date).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex-1">
                        <div
                          className="bg-blue-500 h-8 rounded transition-all"
                          style={{
                            width: `${(item.messageCount / maxTrendCount) * 100}%`,
                            minWidth: item.messageCount > 0 ? '2%' : '0',
                          }}
                        ></div>
                      </div>
                      <div className="w-20 text-right text-sm font-medium text-gray-900">
                        {item.messageCount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 회원별 통계 탭 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  회원별 통계 (총 {userStats.total}명)
                </h3>
                <input
                  type="text"
                  placeholder="이름 또는 닉네임 검색"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              {userStats.users.length === 0 ? (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        회원
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        메시지 수
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        참여 방
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        전주 대비
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {userStats.users.map((user) => (
                      <tr key={user.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.nickname}
                                className="w-10 h-10 rounded-full mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-300 mr-3"></div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.nickname}
                              </div>
                              <div className="text-sm text-gray-500">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {user.messageCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {user.roomCount}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm text-right ${
                            user.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {user.weeklyChange > 0 ? '+' : ''}
                          {user.weeklyChange}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* 페이지네이션 */}
            {userStats.total > 20 && (
              <div className="p-4 border-t border-gray-200 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                >
                  이전
                </Button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  {userPage} / {Math.ceil(userStats.total / 20)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setUserPage((p) => p + 1)}
                  disabled={userPage >= Math.ceil(userStats.total / 20)}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 채팅방별 통계 탭 */}
        {activeTab === 'rooms' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  채팅방별 통계 (총 {roomStats.total}개)
                </h3>
                <input
                  type="text"
                  placeholder="방 이름 검색"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              {roomStats.rooms.length === 0 ? (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        채팅방
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        타입
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        카테고리
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        메시지 수
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        참여자 수
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        전주 대비
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {roomStats.rooms.map((room) => (
                      <tr key={room.roomId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {room.roomName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{room.roomType}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{room.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {room.messageCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {room.participantCount}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm text-right ${
                            room.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {room.weeklyChange > 0 ? '+' : ''}
                          {room.weeklyChange}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* 페이지네이션 */}
            {roomStats.total > 20 && (
              <div className="p-4 border-t border-gray-200 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRoomPage((p) => Math.max(1, p - 1))}
                  disabled={roomPage === 1}
                >
                  이전
                </Button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  {roomPage} / {Math.ceil(roomStats.total / 20)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setRoomPage((p) => p + 1)}
                  disabled={roomPage >= Math.ceil(roomStats.total / 20)}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
  change,
  isPercentage = false,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: string;
  change?: number;
  isPercentage?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
      <div className={`text-3xl font-bold ${color}`}>
        {isPercentage ? (value > 0 ? '+' : '') : ''}
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      {change !== undefined && (
        <div
          className={`text-xs mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          전주 대비 {change > 0 ? '+' : ''}
          {change}%
        </div>
      )}
    </div>
  );
}
