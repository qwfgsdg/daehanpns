'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { PermissionHelper, AdminUser, PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';

interface Log {
  id: string;
  action: string;
  target: string | null;
  targetType: string | null;
  description: string | null;
  changesBefore: any;
  changesAfter: any;
  status: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string;
    loginId: string;
    tier: string;
  } | null;
}

interface Admin {
  id: string;
  name: string;
  loginId: string;
}

interface Stats {
  totalLogs: number;
  topActions: { action: string; count: number }[];
  topAdmins: {
    adminId: string;
    adminName: string;
    adminLoginId: string;
    count: number;
  }[];
}

export default function LogsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [take] = useState(50);

  // 필터용 데이터
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    checkPermissionAndLoad();
  }, [router]);

  useEffect(() => {
    if (hasPermission) {
      fetchAdmins();
      fetchActions();
      fetchStats();
    }
  }, [hasPermission]);

  useEffect(() => {
    if (hasPermission) {
      fetchLogs();
    }
  }, [page, adminId, action, startDate, endDate, hasPermission]);

  const checkPermissionAndLoad = async () => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    try {
      const adminData = await ApiClient.getCurrentAdmin();
      setAdmin(adminData);

      const canAccess = PermissionHelper.hasPermission(adminData, PERMISSIONS.LOGS_VIEW);
      setHasPermission(canAccess);

      if (!canAccess) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      auth.removeToken();
      router.push('/login');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = auth.getToken();
      const params = new URLSearchParams({
        skip: (page * take).toString(),
        take: take.toString(),
      });

      if (adminId) params.append('adminId', adminId);
      if (action) params.append('action', action);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search) params.append('search', search);

      const res = await fetch(`http://localhost:3000/api/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        alert('감사 로그 조회 권한이 없습니다. 통합관리자만 접근할 수 있습니다.');
        router.push('/dashboard');
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || '로그 목록을 불러오는데 실패했습니다');
      }

      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = auth.getToken();
      const res = await fetch('http://localhost:3000/api/admins', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setAdmins(data.admins);
    } catch (error) {
      console.error('관리자 목록 조회 실패:', error);
    }
  };

  const fetchActions = async () => {
    try {
      const token = auth.getToken();
      const res = await fetch('http://localhost:3000/api/logs/actions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setActions(data);
    } catch (error) {
      console.error('액션 목록 조회 실패:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = auth.getToken();
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(
        `http://localhost:3000/api/logs/stats?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('통계 조회 실패:', error);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const handleReset = () => {
    setAdminId('');
    setAction('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(0);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const token = auth.getToken();
      const params = new URLSearchParams();

      if (adminId) params.append('adminId', adminId);
      if (action) params.append('action', action);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search) params.append('search', search);

      const res = await fetch(
        `http://localhost:3000/api/logs/export?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('엑셀 다운로드에 실패했습니다');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setExporting(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      // 로그인/인증
      LOGIN: '로그인',
      LOGIN_SUCCESS: '로그인 성공',
      LOGIN_FAILED: '로그인 실패',
      LOGOUT: '로그아웃',
      PERMISSION_DENIED: '권한 없음',

      // 관리자
      CREATE_ADMIN: '관리자 생성',
      ADMIN_CREATE: '관리자 생성',
      UPDATE_ADMIN: '관리자 수정',
      ADMIN_UPDATE: '관리자 수정',
      DELETE_ADMIN: '관리자 삭제',
      ADMIN_DELETE: '관리자 삭제',
      UNLOCK_ADMIN: '관리자 잠금 해제',
      ADMIN_PASSWORD_CHANGE: '비밀번호 변경',

      // 회원
      CREATE_USER: '회원 생성',
      USER_CREATE: '회원 생성',
      UPDATE_USER: '회원 수정',
      USER_UPDATE: '회원 수정',
      BAN_USER: '회원 정지',
      USER_BAN: '회원 정지',
      UNBAN_USER: '회원 정지 해제',
      USER_UNBAN: '회원 정지 해제',
      DELETE_USER: '회원 삭제',
      USER_DELETE: '회원 삭제',
      MANAGER_CHANGE: '담당자 변경',

      // 구독
      CREATE_SUBSCRIPTION: '구독 생성',
      SUBSCRIPTION_CREATE: '구독 생성',
      CANCEL_SUBSCRIPTION: '구독 취소',
      SUBSCRIPTION_CANCEL: '구독 취소',
      EXTEND_SUBSCRIPTION: '구독 연장',
      SUBSCRIPTION_EXTEND: '구독 연장',
      CONVERT_SUBSCRIPTION: '구독 전환',
      SUBSCRIPTION_CONVERT: '구독 전환',

      // 채팅방
      CREATE_CHAT_ROOM: '채팅방 생성',
      CHAT_ROOM_CREATE: '채팅방 생성',
      UPDATE_CHAT_ROOM: '채팅방 수정',
      CHAT_ROOM_UPDATE: '채팅방 수정',
      DEACTIVATE_CHAT_ROOM: '채팅방 비활성화',
      ACTIVATE_CHAT_ROOM: '채팅방 활성화',
      KICK_USER: '회원 강퇴',
      CHAT_KICK: '회원 강퇴',
      UNKICK_USER: '강퇴 해제',
      CHAT_UNKICK: '강퇴 해제',
      SHADOW_BAN_USER: '섀도우밴',
      CHAT_SHADOW_BAN: '섀도우밴',
      UNSHADOW_BAN_USER: '섀도우밴 해제',
      CHAT_UNSHADOW_BAN: '섀도우밴 해제',
      DELETE_MESSAGE: '메시지 삭제',
      MESSAGE_DELETE: '메시지 삭제',
      BULK_DELETE_MESSAGES: '메시지 일괄 삭제',

      // 전문가
      EXPERT_CREATE: '전문가 생성',
      EXPERT_UPDATE: '전문가 수정',
      EXPERT_DELETE: '전문가 삭제',
    };

    return labels[action] || action;
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      INTEGRATED: '통합관리자',
      CEO: '대표관리자',
      MIDDLE: '중간관리자',
      GENERAL: '일반관리자',
    };

    return labels[tier] || tier;
  };

  const getActionColor = (action: string, status?: string) => {
    // 실패한 작업
    if (status === 'FAILED') {
      return 'bg-orange-100 text-orange-800';
    }

    // 로그인/인증
    if (action.startsWith('LOGIN') || action.startsWith('LOGOUT')) {
      return 'bg-purple-100 text-purple-800';
    }

    // 조회
    if (action.endsWith('_VIEW') || action.endsWith('_LIST')) {
      return 'bg-green-100 text-green-800';
    }

    // 생성
    if (action.endsWith('_CREATE') || action.startsWith('CREATE_')) {
      return 'bg-blue-100 text-blue-800';
    }

    // 수정
    if (action.endsWith('_UPDATE') || action.endsWith('_CHANGE') || action.startsWith('UPDATE_')) {
      return 'bg-yellow-100 text-yellow-800';
    }

    // 삭제/차단
    if (action.endsWith('_DELETE') || action.endsWith('_BAN') || action.endsWith('_CANCEL') || action.startsWith('DELETE_')) {
      return 'bg-red-100 text-red-800';
    }

    // 권한/보안
    if (action.includes('PERMISSION') || action.includes('DENIED')) {
      return 'bg-orange-100 text-orange-800';
    }

    // 기본
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-6">이 페이지에 접근할 권한이 없습니다.</p>
          <Button onClick={() => router.push('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">감사 로그</h1>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              총 로그 수
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {stats.totalLogs.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              상위 액션
            </h3>
            <div className="space-y-1">
              {stats.topActions.slice(0, 3).map((item, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">
                    {getActionLabel(item.action)}
                  </span>
                  : {item.count}건
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              활동 관리자
            </h3>
            <div className="space-y-1">
              {stats.topAdmins.slice(0, 3).map((item, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{item.adminName}</span>:{' '}
                  {item.count}건
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관리자
            </label>
            <select
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">전체</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.loginId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              액션
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">전체</option>
              {actions.map((act) => (
                <option key={act} value={act}>
                  {getActionLabel(act)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="액션, 대상, 설명..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            검색
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            초기화
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 ml-auto"
          >
            {exporting ? '다운로드 중...' : '엑셀 다운로드'}
          </button>
        </div>
      </div>

      {/* 로그 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  관리자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  액션
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  대상
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  설명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP 주소
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    로그가 없습니다
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.admin ? (
                        <>
                          <div>{log.admin.name}</div>
                          <div className="text-xs text-gray-500">
                            {log.admin.loginId} ({getTierLabel(log.admin.tier)})
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">시스템</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action, log.status || undefined)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.target || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                      {log.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {total > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                이전
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * take >= total}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  전체 <span className="font-medium">{total}</span>건 중{' '}
                  <span className="font-medium">{page * take + 1}</span> -{' '}
                  <span className="font-medium">
                    {Math.min((page + 1) * take, total)}
                  </span>{' '}
                  표시
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * take >= total}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    다음
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
