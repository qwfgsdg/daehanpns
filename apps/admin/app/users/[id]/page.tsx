'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionHelper, AdminUser, PERMISSIONS } from '@/lib/permissions';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [user, setUser] = useState<any>(null);
  const [memos, setMemos] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newMemo, setNewMemo] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'subscriptions' | 'history'>('info');
  const [showMemberTypeModal, setShowMemberTypeModal] = useState(false);
  const [memberTypeForm, setMemberTypeForm] = useState({
    memberType: 'STOCK' as 'STOCK' | 'COIN' | 'HYBRID',
    showCoinRooms: false,
    reason: '',
  });
  const [memberTypeHistory, setMemberTypeHistory] = useState<any[]>([]);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerForm, setManagerForm] = useState({
    managerId: '',
    reason: '',
  });
  const [managerHistory, setManagerHistory] = useState<any[]>([]);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [managerSearchQuery, setManagerSearchQuery] = useState('');

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadAdminAndData();
  }, [userId, router]);

  const loadAdminAndData = async () => {
    setIsLoading(true);
    try {
      const adminData = await ApiClient.getCurrentAdmin();
      setAdmin(adminData);

      // Load all data in parallel for better performance
      const dataPromises = [
        loadUser(),
        loadMemos(),
        loadMemberTypeHistory(),
        loadManagerHistory(),
        loadHistory(),
      ];

      // Add subscriptions if has permission
      if (PermissionHelper.hasPermission(adminData, PERMISSIONS.SUBSCRIPTIONS_MANAGE)) {
        dataPromises.push(loadSubscriptions());
      }

      // Execute all requests in parallel
      await Promise.all(dataPromises);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      auth.removeToken();
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const data = await ApiClient.getUser(userId);
      setUser(data);
    } catch (error) {
      console.error('Failed to load user:', error);
      alert('회원 정보를 불러오는데 실패했습니다.');
    }
  };

  const loadMemos = async () => {
    try {
      const data = await ApiClient.getUserMemos(userId);
      setMemos(data);
    } catch (error) {
      console.error('Failed to load memos:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const data = await ApiClient.getUserSubscriptions(userId);
      setSubscriptions(data);
    } catch (error) {
      // Silently handle permission errors
      console.error('Failed to load subscriptions:', error);
      setSubscriptions([]);
    }
  };

  const loadMemberTypeHistory = async () => {
    try {
      const data = await ApiClient.getMemberTypeHistory(userId);
      setMemberTypeHistory(data);
    } catch (error) {
      console.error('Failed to load member type history:', error);
    }
  };

  const loadManagerHistory = async () => {
    try {
      const data = await ApiClient.getManagerHistory(userId);
      setManagerHistory(data);
    } catch (error) {
      console.error('Failed to load manager history:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await ApiClient.getUserHistory(userId, { skip: 0, take: 100 });
      setHistory(data.logs || []);
      setHistoryTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load user history:', error);
    }
  };

  const loadAvailableManagers = async () => {
    try {
      // Search for all active managers by empty string to get all
      const data = await ApiClient.searchManagers('');
      setAvailableManagers(data.managers || []);
    } catch (error) {
      console.error('Failed to load managers:', error);
    }
  };

  const handleManagerChange = async () => {
    if (!managerForm.managerId) {
      alert('담당자를 선택해주세요.');
      return;
    }

    if (!confirm('담당자를 변경하시겠습니까?')) return;

    try {
      await ApiClient.changeManager(userId, managerForm);
      alert('담당자가 변경되었습니다.');
      setShowManagerModal(false);
      setManagerForm({ managerId: '', reason: '' });
      loadUser();
      loadManagerHistory();
      loadHistory();
    } catch (error: any) {
      alert(error.message || '담당자 변경에 실패했습니다.');
    }
  };

  const handleMemberTypeChange = async () => {
    if (!confirm('회원 유형을 변경하시겠습니까?')) return;

    try {
      await ApiClient.changeMemberType(userId, memberTypeForm);
      alert('회원 유형이 변경되었습니다.');
      setShowMemberTypeModal(false);
      setMemberTypeForm({ memberType: 'STOCK', showCoinRooms: false, reason: '' });
      loadUser();
      loadMemberTypeHistory();
      loadHistory();
    } catch (error: any) {
      console.error('Failed to change member type:', error);
      alert(error.message || '회원 유형 변경에 실패했습니다.');
    }
  };

  const handleBan = async () => {
    if (!banReason.trim()) {
      alert('차단 사유를 입력해주세요.');
      return;
    }

    try {
      await ApiClient.banUser(userId, banReason);
      alert('회원이 차단되었습니다.');
      setShowBanModal(false);
      setBanReason('');
      loadUser();
      loadHistory();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('차단에 실패했습니다.');
    }
  };

  const handleUnban = async () => {
    if (!confirm('차단을 해제하시겠습니까?')) return;

    try {
      await ApiClient.unbanUser(userId);
      alert('차단이 해제되었습니다.');
      loadUser();
      loadHistory();
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('차단 해제에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('⚠️ 정말로 이 회원을 삭제하시겠습니까?\n\n삭제된 회원은 복구할 수 없습니다.')) return;

    try {
      await ApiClient.deleteUser(userId);
      alert('회원이 삭제되었습니다.');
      router.push('/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('회원 삭제에 실패했습니다.');
    }
  };

  const handleAddMemo = async () => {
    if (!newMemo.trim()) {
      alert('메모 내용을 입력해주세요.');
      return;
    }

    try {
      await ApiClient.createUserMemo(userId, newMemo);
      alert('메모가 추가되었습니다.');
      setNewMemo('');
      loadMemos();
      loadHistory();
    } catch (error) {
      console.error('Failed to add memo:', error);
      alert('메모 추가에 실패했습니다.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ko-KR');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    // 이미 포맷팅되어 있거나 마스킹된 경우 그대로 반환
    if (phone.includes('-') || phone.includes('*')) {
      return phone;
    }
    // 숫자만 있는 경우 포맷팅
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">회원을 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/users')} className="mt-4">
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            회원 상세 정보
          </h1>
          <Button variant="outline" onClick={() => router.push('/users')}>
            목록으로
          </Button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 메뉴 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-8">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                회원 정보
              </button>
              {PermissionHelper.hasPermission(admin, PERMISSIONS.SUBSCRIPTIONS_MANAGE) && (
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'subscriptions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  구독
                </button>
              )}
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                이력 {historyTotal > 0 && <span className="ml-1 text-xs">({historyTotal})</span>}
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 회원 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">이름</label>
                  <p className="text-base font-medium">{user.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">닉네임</label>
                  <p className="text-base font-medium">{user.nickname || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">전화번호</label>
                  <p className="text-base font-medium">{formatPhone(user.phone)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">이메일</label>
                  <p className="text-base font-medium">{user.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">소속코드</label>
                  <p className="text-base font-medium">{user.affiliateCode || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">로그인 방식</label>
                  <p className="text-base font-medium">
                    {user.provider === 'LOCAL' ? '일반' :
                     user.provider === 'GOOGLE' ? 'Google' :
                     user.provider === 'KAKAO' ? 'Kakao' : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">가입일</label>
                  <p className="text-base font-medium">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">최근 로그인</label>
                  <p className="text-base font-medium">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : '없음'}
                  </p>
                </div>
              </div>
            </div>

            {/* 서비스 접근 권한 */}
            {admin && PermissionHelper.hasPermission(admin, PERMISSIONS.MEMBERS_CONVERT) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">🔐 서비스 접근 권한</h2>

              <div className="space-y-4">
                {/* 현재 회원 유형 */}
                <div>
                  <label className="text-sm text-gray-500">회원 유형</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-3 py-1 rounded-full font-semibold ${
                      user.memberType === 'STOCK' ? 'bg-blue-100 text-blue-800' :
                      user.memberType === 'COIN' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {user.memberType === 'STOCK' ? '📊 주식 회원' :
                       user.memberType === 'COIN' ? '💰 코인 회원' :
                       '🔀 하이브리드'}
                    </span>
                  </div>
                </div>

                {/* 코인방 표시 여부 (주식 회원만) */}
                {user.memberType === 'STOCK' && (
                  <div>
                    <label className="text-sm text-gray-500">코인방 UI 표시</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        user.showCoinRooms ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.showCoinRooms ? '✅ 표시됨' : '🔒 숨김'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 변경 버튼 */}
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setMemberTypeForm({
                        memberType: user.memberType || 'STOCK',
                        showCoinRooms: user.showCoinRooms || false,
                        reason: '',
                      });
                      setShowMemberTypeModal(true);
                    }}
                    variant="outline"
                  >
                    회원 유형 변경
                  </Button>
                </div>

                {/* 변경 이력 */}
                {memberTypeHistory.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">📋 회원 유형 변경 이력</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {memberTypeHistory.map((history: any) => {
                        const getMemberTypeIcon = (type: string) => {
                          if (type === 'STOCK') return '📊';
                          if (type === 'COIN') return '💰';
                          return '🔀';
                        };
                        const getMemberTypeLabel = (type: string) => {
                          if (type === 'STOCK') return '주식 회원';
                          if (type === 'COIN') return '코인 회원';
                          return '하이브리드';
                        };
                        const getMemberTypeColor = (type: string) => {
                          if (type === 'STOCK') return 'text-blue-700';
                          if (type === 'COIN') return 'text-yellow-700';
                          return 'text-purple-700';
                        };

                        return (
                          <div key={history.id} className="p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg">
                            {/* 변경 내용 */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`font-semibold ${getMemberTypeColor(history.fromType)}`}>
                                {getMemberTypeIcon(history.fromType)} {getMemberTypeLabel(history.fromType)}
                              </span>
                              <span className="text-gray-400 font-bold">→</span>
                              <span className={`font-semibold ${getMemberTypeColor(history.toType)}`}>
                                {getMemberTypeIcon(history.toType)} {getMemberTypeLabel(history.toType)}
                              </span>
                            </div>

                            {/* 코인방 표시 변경 */}
                            {history.showCoinRoomsChanged && (
                              <div className="text-xs mb-2 pl-2 border-l-2 border-blue-300">
                                <span className="text-gray-600">코인방 표시: </span>
                                <span className={history.previousShowCoinRooms ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                  {history.previousShowCoinRooms ? '✅ 표시' : '🔒 숨김'}
                                </span>
                                <span className="text-gray-400 mx-1">→</span>
                                <span className={history.newShowCoinRooms ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                  {history.newShowCoinRooms ? '✅ 표시' : '🔒 숨김'}
                                </span>
                              </div>
                            )}

                            {/* 변경 사유 */}
                            {history.reason && (
                              <div className="text-xs mb-2 p-2 bg-blue-50 rounded text-gray-700">
                                <span className="font-medium">사유:</span> {history.reason}
                              </div>
                            )}

                            {/* 메타 정보 */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>🕐 {new Date(history.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              <span>•</span>
                              <span>👤 {history.changedByAdmin?.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* 담당자 관리 */}
            {PermissionHelper.hasPermission(admin, PERMISSIONS.MEMBERS_VIEW) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">담당자 정보</h2>
              <div className="space-y-4">
                {/* 현재 담당자 */}
                <div>
                  <label className="text-sm text-gray-500">현재 담당자</label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-medium">
                      {user.manager ? (
                        `${user.manager.salesName} (${user.manager.region})`
                      ) : (
                        <span className="text-gray-400">미배정</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* 담당자 변경 버튼 */}
                <div>
                  <Button
                    onClick={() => {
                      loadAvailableManagers();
                      setShowManagerModal(true);
                    }}
                    variant="outline"
                  >
                    담당자 변경
                  </Button>
                </div>

                {/* 변경 이력 */}
                {managerHistory.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">📋 담당자 변경 이력</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {managerHistory.map((history: any) => (
                        <div key={history.id} className="p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-600">
                              {history.fromManager?.name || '미배정'}
                            </span>
                            <span className="text-gray-400 font-bold">→</span>
                            <span className="font-semibold text-blue-700">
                              {history.toManager?.name}
                            </span>
                          </div>

                          {history.reason && (
                            <div className="text-xs mb-2 p-2 bg-blue-50 rounded text-gray-700">
                              <span className="font-medium">사유:</span> {history.reason}
                            </div>
                          )}

                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{new Date(history.createdAt).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* 상태 및 액션 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">회원 상태</h2>
              <div className="flex items-center gap-4 mb-4">
                {user.isBanned ? (
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                    차단됨
                  </span>
                ) : user.isActive ? (
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold">
                    활성
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-semibold">
                    비활성
                  </span>
                )}
              </div>

              {user.isBanned && user.banReason && (
                <div className="mb-4 p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-gray-600">차단 사유:</p>
                  <p className="text-base text-red-900">{user.banReason}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {PermissionHelper.hasPermission(admin, PERMISSIONS.MEMBERS_BAN) && (
                  <>
                    {user.isBanned ? (
                      <Button onClick={handleUnban} variant="outline">
                        차단 해제
                      </Button>
                    ) : (
                      <Button onClick={() => setShowBanModal(true)} variant="outline">
                        회원 차단
                      </Button>
                    )}
                  </>
                )}
                {PermissionHelper.hasPermission(admin, PERMISSIONS.MEMBERS_UPDATE) && (
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    회원 삭제
                  </Button>
                )}
              </div>
            </div>

            {/* 메모 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">관리자 메모</h2>

              {/* 메모 추가 */}
              {PermissionHelper.hasPermission(admin, PERMISSIONS.MEMBERS_MEMO) && (
                <div className="mb-4">
                  <textarea
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    placeholder="메모를 입력하세요..."
                    className="w-full px-3 py-2 border rounded-md resize-none"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={handleAddMemo}>메모 추가</Button>
                  </div>
                </div>
              )}

              {/* 메모 목록 */}
              <div className="space-y-3">
                {memos.length === 0 ? (
                  <p className="text-sm text-gray-500">메모가 없습니다.</p>
                ) : (
                  memos.map((memo) => (
                    <div key={memo.id} className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-800">{memo.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(memo.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 추가 정보 */}
          <div className="space-y-6">
            {/* 구독 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">구독 정보</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">구독 상태</label>
                  <p className="text-base font-medium">
                    {user.subscriptionTier === 'FREE' ? '무료' :
                     user.subscriptionTier === 'BASIC' ? '베이직' :
                     user.subscriptionTier === 'PREMIUM' ? '프리미엄' : '-'}
                  </p>
                </div>
                {user.subscriptionExpiresAt && (
                  <div>
                    <label className="text-sm text-gray-500">구독 만료일</label>
                    <p className="text-base font-medium">
                      {formatDate(user.subscriptionExpiresAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 통계 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">활동 통계</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">가입 경과일</label>
                  <p className="text-base font-medium">
                    {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}일
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">구독 내역</h2>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">구독 내역이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          전문가
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          타입
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          시작일
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          종료일
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          기간
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subscriptions.map((subscription) => (
                        <tr key={subscription.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {subscription.expert?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {subscription.roomType === 'VIP' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">VIP</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">VVIP</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {subscription.status === 'ACTIVE' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">활성</span>
                            ) : subscription.status === 'EXPIRED' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">만료</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">취소됨</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(subscription.startDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(subscription.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {Math.ceil((new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24))}일
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">관리 이력</h2>
              <p className="text-sm text-gray-500 mb-6">
                이 회원에게 수행된 모든 관리 작업 내역입니다. ({historyTotal}건)
              </p>

              {history.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">이력이 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {history.map((log: any) => {
                    // 액션별 색상 결정 함수
                    const getActionColor = (action: string, status?: string) => {
                      if (status === 'FAILED') return 'bg-orange-100 text-orange-800';
                      if (action.startsWith('LOGIN') || action.startsWith('LOGOUT')) return 'bg-purple-100 text-purple-800';
                      if (action.endsWith('_VIEW') || action.endsWith('_LIST')) return 'bg-green-100 text-green-800';
                      if (action.endsWith('_CREATE') || action.startsWith('CREATE_')) return 'bg-blue-100 text-blue-800';
                      if (action.endsWith('_UPDATE') || action.endsWith('_CHANGE') || action.startsWith('UPDATE_')) return 'bg-yellow-100 text-yellow-800';
                      if (action.endsWith('_DELETE') || action.endsWith('_BAN') || action.endsWith('_CANCEL') || action.startsWith('DELETE_')) return 'bg-red-100 text-red-800';
                      if (action.includes('PERMISSION') || action.includes('DENIED')) return 'bg-orange-100 text-orange-800';
                      return 'bg-gray-100 text-gray-800';
                    };

                    // 액션 한글 이름
                    const getActionLabel = (action: string) => {
                      const labels: Record<string, string> = {
                        USER_BAN: '회원 정지',
                        USER_UNBAN: '회원 정지 해제',
                        USER_DELETE: '회원 삭제',
                        USER_UPDATE: '회원 정보 수정',
                        MANAGER_CHANGE: '담당자 변경',
                        MEMBER_TYPE_CHANGE: '회원 유형 변경',
                        MEMBER_MEMO_CREATE: '메모 추가',
                        MEMBER_MEMO_UPDATE: '메모 수정',
                        MEMBER_MEMO_DELETE: '메모 삭제',
                        SUBSCRIPTION_CREATE: '구독 생성',
                        SUBSCRIPTION_CANCEL: '구독 취소',
                        SUBSCRIPTION_EXTEND: '구독 연장',
                      };
                      return labels[action] || action;
                    };

                    return (
                      <div key={log.id} className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded-r-lg">
                        {/* 헤더: 날짜 + 관리자 */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              📅 {formatDate(log.createdAt)}
                            </span>
                          </div>
                          <div className="text-sm">
                            {log.admin ? (
                              <span className="text-gray-700">
                                👤 {log.admin.name} ({log.admin.loginId})
                              </span>
                            ) : (
                              <span className="text-gray-400">시스템</span>
                            )}
                          </div>
                        </div>

                        {/* 액션 배지 */}
                        <div className="mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action, log.status)}`}>
                            {getActionLabel(log.action)}
                          </span>
                        </div>

                        {/* 설명 */}
                        {log.description && (
                          <p className="text-sm text-gray-700 mb-2">
                            📝 {log.description}
                          </p>
                        )}

                        {/* Before/After 비교 */}
                        {(log.changesBefore || log.changesAfter) && (
                          <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {log.changesBefore && (
                                <div>
                                  <div className="font-semibold text-gray-500 mb-1">변경 전</div>
                                  <pre className="text-gray-600 whitespace-pre-wrap break-words">
                                    {JSON.stringify(log.changesBefore, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.changesAfter && (
                                <div>
                                  <div className="font-semibold text-gray-500 mb-1">변경 후</div>
                                  <pre className="text-blue-600 whitespace-pre-wrap break-words">
                                    {JSON.stringify(log.changesAfter, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* IP 주소 (있는 경우) */}
                        {log.ipAddress && (
                          <div className="mt-2 text-xs text-gray-400">
                            🌐 IP: {log.ipAddress}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 차단 모달 */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">회원 차단</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                차단 사유
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="차단 사유를 입력하세요"
                className="w-full px-3 py-2 border rounded-md resize-none"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                }}
              >
                취소
              </Button>
              <Button onClick={handleBan}>
                차단
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 회원 유형 변경 모달 */}
      {showMemberTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">회원 유형 변경</h3>

            <div className="space-y-4 mb-4">
              {/* 회원 유형 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회원 유형
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="STOCK"
                      checked={memberTypeForm.memberType === 'STOCK'}
                      onChange={(e) => setMemberTypeForm({ ...memberTypeForm, memberType: e.target.value as any })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">📊 주식 회원</div>
                      <div className="text-xs text-gray-500">주식 리딩방만 이용</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="COIN"
                      checked={memberTypeForm.memberType === 'COIN'}
                      onChange={(e) => setMemberTypeForm({ ...memberTypeForm, memberType: e.target.value as any })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">💰 코인 회원</div>
                      <div className="text-xs text-gray-500">코인 리딩방만 이용</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="HYBRID"
                      checked={memberTypeForm.memberType === 'HYBRID'}
                      onChange={(e) => setMemberTypeForm({ ...memberTypeForm, memberType: e.target.value as any })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">🔀 하이브리드</div>
                      <div className="text-xs text-gray-500">주식 + 코인 모두 이용</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 코인방 표시 (주식 회원만) */}
              {memberTypeForm.memberType === 'STOCK' && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={memberTypeForm.showCoinRooms}
                      onChange={(e) => setMemberTypeForm({ ...memberTypeForm, showCoinRooms: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">코인방 UI 표시</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    체크 시 주식 회원에게 코인방이 표시됩니다
                  </p>
                </div>
              )}

              {/* 변경 사유 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  변경 사유 (선택)
                </label>
                <textarea
                  value={memberTypeForm.reason}
                  onChange={(e) => setMemberTypeForm({ ...memberTypeForm, reason: e.target.value })}
                  placeholder="변경 사유를 입력하세요"
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMemberTypeModal(false);
                  setMemberTypeForm({ memberType: 'STOCK', showCoinRooms: false, reason: '' });
                }}
              >
                취소
              </Button>
              <Button onClick={handleMemberTypeChange}>
                변경
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 담당자 변경 모달 */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">담당자 변경</h3>
            <div className="space-y-4">
              {/* 담당자 검색 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 검색
                </label>
                <Input
                  type="text"
                  placeholder="이름 또는 지점으로 검색..."
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  총 {availableManagers.filter(m =>
                    managerSearchQuery === '' ||
                    m.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
                    (m.region && m.region.toLowerCase().includes(managerSearchQuery.toLowerCase()))
                  ).length}명
                </p>
              </div>

              {/* 담당자 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 담당자 선택 *
                </label>
                <select
                  value={managerForm.managerId}
                  onChange={(e) => setManagerForm({ ...managerForm, managerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  size={Math.min(availableManagers.filter(m =>
                    managerSearchQuery === '' ||
                    m.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
                    (m.region && m.region.toLowerCase().includes(managerSearchQuery.toLowerCase()))
                  ).length + 1, 10)}
                >
                  <option value="">담당자를 선택하세요</option>
                  {availableManagers
                    .filter(m =>
                      managerSearchQuery === '' ||
                      m.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
                      (m.region && m.region.toLowerCase().includes(managerSearchQuery.toLowerCase()))
                    )
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                        {manager.region && ` (${manager.region})`}
                        {' - '}
                        {manager.referralCode}
                      </option>
                    ))
                  }
                </select>
                {managerSearchQuery && availableManagers.filter(m =>
                  managerSearchQuery === '' ||
                  m.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
                  (m.region && m.region.toLowerCase().includes(managerSearchQuery.toLowerCase()))
                ).length === 0 && (
                  <p className="text-sm text-red-600 mt-1">검색 결과가 없습니다.</p>
                )}
              </div>

              {/* 변경 사유 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  변경 사유 (선택)
                </label>
                <textarea
                  value={managerForm.reason}
                  onChange={(e) => setManagerForm({ ...managerForm, reason: e.target.value })}
                  placeholder="담당자 변경 사유를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowManagerModal(false);
                  setManagerForm({ managerId: '', reason: '' });
                  setManagerSearchQuery('');
                }}
              >
                취소
              </Button>
              <Button onClick={handleManagerChange}>
                변경
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
