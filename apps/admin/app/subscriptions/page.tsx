'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionHelper, AdminUser, PERMISSIONS } from '@/lib/permissions';

interface Subscription {
  id: string;
  userId: string;
  expertId: string;
  roomType: 'VIP' | 'VVIP';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  createdAt: string;
  user: {
    name: string;
    phone: string;
  };
  expert: {
    name: string;
  };
}

interface Expert {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
}

interface CreateFormData {
  userId: string;
  expertId: string;
  roomType: 'VIP' | 'VVIP';
  durationMonths: number;
  startDate: string;
  depositName: string;
  depositAmount: string;
  adminMemo: string;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expertFilter, setExpertFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [extendMonths, setExtendMonths] = useState(1);
  const pageSize = 20;

  const [createForm, setCreateForm] = useState<CreateFormData>({
    userId: '',
    expertId: '',
    roomType: 'VIP',
    durationMonths: 1,
    startDate: new Date().toISOString().split('T')[0],
    depositName: '',
    depositAmount: '',
    adminMemo: '',
  });

  useEffect(() => {
    checkPermissionAndLoad();
  }, [router]);

  useEffect(() => {
    if (hasPermission) {
      loadSubscriptions();
    }
  }, [page, hasPermission]);

  useEffect(() => {
    if (hasPermission) {
      loadExperts();
    }
  }, [hasPermission]);

  const checkPermissionAndLoad = async () => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    try {
      const adminData = await ApiClient.getCurrentAdmin();
      setAdmin(adminData);

      const canAccess = PermissionHelper.hasPermission(adminData, PERMISSIONS.SUBSCRIPTIONS_MANAGE);
      setHasPermission(canAccess);

      if (!canAccess) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      auth.removeToken();
      router.push('/login');
    }
  };

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const response = await ApiClient.getSubscriptions({
        expertId: expertFilter || undefined,
        status: statusFilter || undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Apply client-side search filter for user name/phone
      let filtered = response.subscriptions;
      if (search) {
        filtered = filtered.filter(sub =>
          sub.user.name.toLowerCase().includes(search.toLowerCase()) ||
          sub.user.phone.includes(search)
        );
      }

      setSubscriptions(filtered);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      alert('구독 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExperts = async () => {
    try {
      const response = await ApiClient.getExperts({ isActive: true });
      setExperts(response.experts);
    } catch (error) {
      console.error('Failed to load experts:', error);
    }
  };

  const searchUsers = async () => {
    if (!userSearch.trim()) return;

    try {
      const response = await ApiClient.getUsers({
        search: userSearch,
        take: 10,
      });
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSubscriptions();
  };

  const openDetailModal = async (subscription: Subscription) => {
    try {
      const detail = await ApiClient.getSubscription(subscription.id);
      setSelectedSubscription(detail);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load subscription detail:', error);
      alert('구독 정보를 불러오는데 실패했습니다.');
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.userId || !createForm.expertId) {
      alert('회원과 전문가를 선택해주세요.');
      return;
    }

    try {
      await ApiClient.createSubscription({
        ...createForm,
        depositAmount: createForm.depositAmount ? parseInt(createForm.depositAmount) : undefined,
      });
      alert('구독이 추가되었습니다.');
      setShowCreateModal(false);
      setCreateForm({
        userId: '',
        expertId: '',
        roomType: 'VIP',
        durationMonths: 1,
        startDate: new Date().toISOString().split('T')[0],
        depositName: '',
        depositAmount: '',
        adminMemo: '',
      });
      loadSubscriptions();
    } catch (error: any) {
      console.error('Failed to create subscription:', error);
      alert(error.message || '구독 추가에 실패했습니다.');
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedSubscription) return;
    if (!confirm('이 구독을 취소하시겠습니까?')) return;

    try {
      await ApiClient.cancelSubscription(selectedSubscription.id);
      alert('구독이 취소되었습니다.');
      setShowDetailModal(false);
      loadSubscriptions();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('구독 취소에 실패했습니다.');
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedSubscription) return;
    if (!extendMonths || extendMonths < 1) {
      alert('연장할 개월 수를 입력해주세요.');
      return;
    }

    try {
      await ApiClient.extendSubscription(selectedSubscription.id, extendMonths);
      alert(`구독이 ${extendMonths}개월 연장되었습니다.`);
      setShowDetailModal(false);
      loadSubscriptions();
    } catch (error) {
      console.error('Failed to extend subscription:', error);
      alert('구독 연장에 실패했습니다.');
    }
  };

  const handleConvertSubscription = async () => {
    if (!selectedSubscription) return;
    const newRoomType = selectedSubscription.roomType === 'VIP' ? 'VVIP' : 'VIP';
    if (!confirm(`${selectedSubscription.roomType}에서 ${newRoomType}로 전환하시겠습니까?`)) return;

    try {
      await ApiClient.convertSubscription(selectedSubscription.id, newRoomType);
      alert('구독이 전환되었습니다.');
      setShowDetailModal(false);
      loadSubscriptions();
    } catch (error) {
      console.error('Failed to convert subscription:', error);
      alert('구독 전환에 실패했습니다.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    if (phone.includes('-') || phone.includes('*')) return phone;
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  const getRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">활성</span>;
      case 'EXPIRED':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">만료</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">취소됨</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getRoomTypeBadge = (roomType: string) => {
    switch (roomType) {
      case 'VIP':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">VIP</span>;
      case 'VVIP':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">VVIP</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{roomType}</span>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            구독 관리
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              구독 추가
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              대시보드로
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 및 필터 */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <Input
              type="text"
              placeholder="회원 이름, 전화번호로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={expertFilter}
              onChange={(e) => {
                setExpertFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">전체 전문가</option>
              {experts.map((expert) => (
                <option key={expert.id} value={expert.id}>
                  {expert.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="EXPIRED">만료</option>
              <option value="CANCELLED">취소됨</option>
            </select>
            <Button type="submit">검색</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setExpertFilter('');
                setStatusFilter('');
                setPage(1);
                loadSubscriptions();
              }}
            >
              초기화
            </Button>
          </form>
        </div>

        {/* 통계 */}
        <div className="mb-4 text-sm text-gray-600">
          전체 {total}건
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              구독이 없습니다.
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      회원
                    </th>
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
                      남은 일수
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openDetailModal(subscription)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPhone(subscription.user.phone)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subscription.expert.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoomTypeBadge(subscription.roomType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(subscription.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(subscription.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(subscription.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscription.status === 'ACTIVE' ? (
                          <span className={getRemainingDays(subscription.endDate) < 7 ? 'text-red-600 font-semibold' : ''}>
                            {getRemainingDays(subscription.endDate)}일
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{(page - 1) * pageSize + 1}</span>
                        {' - '}
                        <span className="font-medium">
                          {Math.min(page * pageSize, total)}
                        </span>
                        {' / '}
                        <span className="font-medium">{total}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        이전
                      </Button>
                      <span className="px-4 py-2 text-sm text-gray-700">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 구독 추가 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">구독 추가</h3>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              {/* 회원 검색 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회원 선택 *
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="회원 이름 또는 전화번호"
                    className="flex-1"
                  />
                  <Button type="button" onClick={searchUsers}>
                    검색
                  </Button>
                </div>
                {users.length > 0 && (
                  <select
                    value={createForm.userId}
                    onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">회원을 선택하세요</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({formatPhone(user.phone)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 전문가 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전문가 선택 *
                </label>
                <select
                  value={createForm.expertId}
                  onChange={(e) => setCreateForm({ ...createForm, expertId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">전문가를 선택하세요</option>
                  {experts.map((expert) => (
                    <option key={expert.id} value={expert.id}>
                      {expert.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 방 타입 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  방 타입 *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="VIP"
                      checked={createForm.roomType === 'VIP'}
                      onChange={(e) => setCreateForm({ ...createForm, roomType: e.target.value as 'VIP' | 'VVIP' })}
                      className="mr-2"
                    />
                    VIP
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="VVIP"
                      checked={createForm.roomType === 'VVIP'}
                      onChange={(e) => setCreateForm({ ...createForm, roomType: e.target.value as 'VIP' | 'VVIP' })}
                      className="mr-2"
                    />
                    VVIP
                  </label>
                </div>
              </div>

              {/* 기간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구독 기간 *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="1"
                      checked={createForm.durationMonths === 1}
                      onChange={(e) => setCreateForm({ ...createForm, durationMonths: parseInt(e.target.value) })}
                      className="mr-2"
                    />
                    1개월
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="2"
                      checked={createForm.durationMonths === 2}
                      onChange={(e) => setCreateForm({ ...createForm, durationMonths: parseInt(e.target.value) })}
                      className="mr-2"
                    />
                    2개월
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="3"
                      checked={createForm.durationMonths === 3}
                      onChange={(e) => setCreateForm({ ...createForm, durationMonths: parseInt(e.target.value) })}
                      className="mr-2"
                    />
                    3개월
                  </label>
                </div>
              </div>

              {/* 시작일 */}
              <Input
                label="시작일 *"
                type="date"
                value={createForm.startDate}
                onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                required
              />

              {/* 구분선 */}
              <hr className="my-4" />
              <h4 className="text-sm font-semibold text-gray-700 mb-3">💰 입금 정보 (선택)</h4>

              {/* 입금자명 */}
              <Input
                label="입금자명"
                type="text"
                placeholder="홍길동"
                value={createForm.depositName}
                onChange={(e) => setCreateForm({ ...createForm, depositName: e.target.value })}
              />

              {/* 입금액 */}
              <Input
                label="입금액 (원)"
                type="number"
                placeholder="30000"
                value={createForm.depositAmount}
                onChange={(e) => setCreateForm({ ...createForm, depositAmount: e.target.value })}
              />

              {/* 관리자 메모 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  관리자 메모
                </label>
                <textarea
                  value={createForm.adminMemo}
                  onChange={(e) => setCreateForm({ ...createForm, adminMemo: e.target.value })}
                  placeholder="입금 확인, 특이사항 등을 기록하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  취소
                </Button>
                <Button type="submit">
                  추가
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showDetailModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">구독 상세 정보</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">회원</label>
                  <p className="text-base font-medium">{selectedSubscription.user.name}</p>
                  <p className="text-sm text-gray-600">{formatPhone(selectedSubscription.user.phone)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">전문가</label>
                  <p className="text-base font-medium">{selectedSubscription.expert.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">방 타입</label>
                  <div>{getRoomTypeBadge(selectedSubscription.roomType)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">상태</label>
                  <div>{getStatusBadge(selectedSubscription.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">시작일</label>
                  <p className="text-base font-medium">{formatDate(selectedSubscription.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">종료일</label>
                  <p className="text-base font-medium">{formatDate(selectedSubscription.endDate)}</p>
                </div>
                {selectedSubscription.status === 'ACTIVE' && (
                  <div>
                    <label className="text-sm text-gray-500">남은 일수</label>
                    <p className="text-base font-medium">
                      {getRemainingDays(selectedSubscription.endDate)}일
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">생성일</label>
                  <p className="text-base font-medium">{formatDate(selectedSubscription.createdAt)}</p>
                </div>
              </div>

              {selectedSubscription.status === 'ACTIVE' && (
                <>
                  <hr className="my-4" />
                  <div className="space-y-3">
                    {/* 연장 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        구독 연장
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={extendMonths}
                          onChange={(e) => setExtendMonths(parseInt(e.target.value))}
                          className="w-24"
                        />
                        <span className="flex items-center text-sm text-gray-600">개월</span>
                        <Button onClick={handleExtendSubscription} variant="outline">
                          연장
                        </Button>
                      </div>
                    </div>

                    {/* VIP ↔ VVIP 전환 */}
                    <div>
                      <Button onClick={handleConvertSubscription} variant="outline" className="w-full">
                        {selectedSubscription.roomType === 'VIP' ? 'VVIP로 전환' : 'VIP로 전환'}
                      </Button>
                    </div>

                    {/* 취소 */}
                    <div>
                      <Button onClick={handleCancelSubscription} variant="outline" className="w-full text-red-600">
                        구독 취소
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
