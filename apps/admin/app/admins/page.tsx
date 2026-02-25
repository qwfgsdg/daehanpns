'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionHelper, PERMISSIONS } from '@/lib/permissions';
import { useAdmin } from '@/contexts/AdminContext';

export default function AdminsPage() {
  const router = useRouter();
  const { admin, isLoading: adminLoading } = useAdmin();
  const [admins, setAdmins] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [mainAdminUsersTarget, setMainAdminUsersTarget] = useState('');
  const [deleteActions, setDeleteActions] = useState<Array<{
    subordinateId: string;
    action: 'reassign' | 'delete';
    targetAdminId?: string;
  }>>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkTarget, setBulkTarget] = useState('');
  const pageSize = 20;

  // Check permission when admin data is loaded
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (admin) {
      const canAccess = PermissionHelper.hasPermission(admin, PERMISSIONS.ADMINS_MANAGE);
      setHasPermission(canAccess);

      if (!canAccess) {
        setIsLoading(false);
      }
    }
  }, [admin, router]);

  useEffect(() => {
    if (hasPermission) {
      loadAdmins();
    }
  }, [page, selectedTier, hasPermission]);

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await ApiClient.getAdmins({
        search: search || undefined,
        tier: selectedTier || undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      setAdmins(response.admins);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAdmins();
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

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      INTEGRATED: 'bg-purple-100 text-purple-800',
      CEO: 'bg-red-100 text-red-800',
      MIDDLE: 'bg-green-100 text-green-800',
      GENERAL: 'bg-blue-100 text-blue-800',
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR');
  };

  const handleDelete = async (targetAdmin: any) => {
    if (targetAdmin.tier === 'INTEGRATED') {
      alert('통합관리자는 삭제할 수 없습니다.');
      return;
    }

    try {
      // Get deletion preview
      const preview = await ApiClient.getAdminDeletionPreview(targetAdmin.id);

      // Show modal if has subordinates OR managed users
      if (preview.subordinates.length > 0 || preview.admin.managedUsersCount > 0) {
        setSelectedAdmin(targetAdmin);
        setDeletionPreview(preview);

        // Initialize main admin users target
        setMainAdminUsersTarget(preview.availableReassignTargets[0]?.id || '');

        // Initialize actions
        const initialActions = preview.subordinates.map((sub: any) => ({
          subordinateId: sub.id,
          action: 'reassign' as 'reassign' | 'delete',
          targetAdminId: preview.availableReassignTargets[0]?.id || undefined,
        }));
        setDeleteActions(initialActions);

        setShowDeleteModal(true);
      } else {
        // No subordinates and no managed users - direct delete
        if (!confirm(`${targetAdmin.realName}님을 삭제하시겠습니까?`)) {
          return;
        }

        await ApiClient.deleteAdmin(targetAdmin.id);
        alert('삭제되었습니다.');

        // Remove from local state instead of reloading
        setAdmins(prevAdmins => prevAdmins.filter(a => a.id !== targetAdmin.id));
        setTotal(prevTotal => prevTotal - 1);
      }
    } catch (error: any) {
      console.error('Failed to delete admin:', error);
      alert(error.message || '삭제 처리에 실패했습니다.');
    }
  };

  const handleDeleteWithSubordinates = async () => {
    if (!selectedAdmin || !deletionPreview) return;

    // Validate main admin users target
    if (deletionPreview.admin.managedUsersCount > 0 && !mainAdminUsersTarget) {
      alert('본인 담당 회원 재배정 대상을 선택해주세요.');
      return;
    }

    // Validate actions
    for (const action of deleteActions) {
      if (action.action === 'reassign' && !action.targetAdminId) {
        alert('재배정 대상을 선택해주세요.');
        return;
      }
      if (action.action === 'delete' && !action.targetAdminId) {
        alert('담당 회원 재배정 대상을 선택해주세요.');
        return;
      }
    }

    try {
      await ApiClient.deleteAdminWithSubordinates(
        selectedAdmin.id,
        mainAdminUsersTarget || null,
        deleteActions
      );
      alert('삭제 처리가 완료되었습니다.');
      setShowDeleteModal(false);
      setSelectedAdmin(null);
      setDeletionPreview(null);
      setMainAdminUsersTarget('');
      setDeleteActions([]);
      setBulkMode(false);
      setBulkTarget('');
      loadAdmins();
    } catch (error: any) {
      console.error('Failed to delete with subordinates:', error);
      alert(error.message || '삭제 처리에 실패했습니다.');
    }
  };

  const updateAction = (subordinateId: string, updates: Partial<typeof deleteActions[0]>) => {
    setDeleteActions(prev =>
      prev.map(action =>
        action.subordinateId === subordinateId
          ? { ...action, ...updates }
          : action
      )
    );
  };

  const applyBulkReassign = () => {
    if (!bulkTarget) {
      alert('재배정 대상을 선택해주세요.');
      return;
    }

    // 본인 담당 회원도 함께
    setMainAdminUsersTarget(bulkTarget);

    // 하위 관리자들도
    setDeleteActions(prev =>
      prev.map(action => ({
        ...action,
        action: 'reassign' as 'reassign' | 'delete',
        targetAdminId: bulkTarget,
      }))
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  if (adminLoading || isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">관리자 관리</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              관리자 추가
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
          <form onSubmit={handleSearch} className="flex gap-4">
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">전체 등급</option>
              <option value="INTEGRATED">통합관리자</option>
              <option value="CEO">대표관리자</option>
              <option value="MIDDLE">중간관리자</option>
              <option value="GENERAL">일반관리자</option>
            </select>
            <Input
              type="text"
              placeholder="이름, 이메일, 로그인ID로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">검색</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setSelectedTier('');
                setPage(1);
                loadAdmins();
              }}
            >
              초기화
            </Button>
          </form>
        </div>

        {/* 통계 */}
        <div className="mb-4 text-sm text-gray-600">
          전체 {total}명
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              관리자가 없습니다.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      본명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      영업자명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      로그인ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      등급
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      지점
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 shadow-sm">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {admin.realName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.salesName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.loginId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={admin.email || '-'}>
                        {admin.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTierBadgeColor(admin.tier)}`}>
                          {getTierLabel(admin.tier)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.region || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {admin.lockedUntil && new Date(admin.lockedUntil) > new Date() ? (
                          <span className="px-2 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            잠금
                          </span>
                        ) : admin.isActive ? (
                          <span className="px-2 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            활성
                          </span>
                        ) : (
                          <span className="px-2 text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            비활성
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(admin.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 sticky right-0 bg-white shadow-sm">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2"
                            onClick={() => router.push(`/admins/${admin.id}`)}
                          >
                            상세
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(admin)}
                            disabled={admin.tier === 'INTEGRATED'}
                          >
                            삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        이전
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                      >
                        다음
                      </Button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
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
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 관리자 추가 모달 */}
      {showCreateModal && admin && (
        <CreateAdminModal
          currentAdmin={admin}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAdmins();
          }}
        />
      )}

      {/* 관리자 삭제 모달 */}
      {showDeleteModal && selectedAdmin && deletionPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">⚠️ 관리자 삭제 - 하위 관리자 처리 필요</h2>

              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-medium mb-2">
                  {selectedAdmin.realName}({getTierLabel(selectedAdmin.tier)}, {selectedAdmin.region || '미지정'}) 관리자를 삭제합니다.
                </p>
                <div className="text-sm text-gray-700">
                  <p>📊 삭제 시 처리해야 할 데이터:</p>
                  <ul className="ml-4 mt-1">
                    <li>· 직속 하위 관리자: {deletionPreview.subordinates.length}명</li>
                    <li>· 전체 하위 계층: {deletionPreview.totalSubordinatesCount}명</li>
                    <li>· 본인 담당 회원: {deletionPreview.admin.managedUsersCount}명</li>
                  </ul>
                </div>
              </div>

              {/* 본인 담당 회원 재배정 */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-medium mb-2">📊 본인 담당 데이터:</p>
                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    담당 회원: {deletionPreview.admin.managedUsersCount}명
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm">→ 재배정 대상:</span>
                    <select
                      value={mainAdminUsersTarget}
                      onChange={(e) => setMainAdminUsersTarget(e.target.value)}
                      disabled={deletionPreview.admin.managedUsersCount === 0}
                      className="flex-1 px-3 py-1 border rounded disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">
                        {deletionPreview.admin.managedUsersCount === 0
                          ? '(담당 회원 없음)'
                          : '선택하세요'}
                      </option>
                      {deletionPreview.availableReassignTargets.map((target: any) => (
                        <option key={target.id} value={target.id}>
                          {target.realName} ({getTierLabel(target.tier)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-2 text-center text-gray-400 text-sm">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>

              {/* 일괄 처리 옵션 */}
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded">
                <p className="font-medium mb-2 text-sm">🔧 일괄 처리 설정</p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={!bulkMode}
                      onChange={() => setBulkMode(false)}
                    />
                    개별 설정
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={bulkMode}
                      onChange={() => setBulkMode(true)}
                    />
                    모두 동일하게 재배정
                  </label>
                  {bulkMode && (
                    <>
                      <select
                        value={bulkTarget}
                        onChange={(e) => setBulkTarget(e.target.value)}
                        className="px-3 py-1 border rounded text-sm"
                      >
                        <option value="">선택하세요</option>
                        {deletionPreview.availableReassignTargets.map((target: any) => (
                          <option key={target.id} value={target.id}>
                            {target.realName} ({getTierLabel(target.tier)})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={applyBulkReassign}
                        className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                      >
                        적용
                      </button>
                    </>
                  )}
                </div>
                {bulkMode && (
                  <p className="text-xs text-purple-700 mt-2">
                    → 본인 담당 회원 + 하위 관리자 모두 선택한 대상으로 재배정됩니다
                  </p>
                )}
              </div>

              {/* 하위 관리자 목록 */}
              <div className="border rounded">
                {deletionPreview.subordinates.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">이름</th>
                        <th className="px-4 py-2 text-left">등급</th>
                        <th className="px-4 py-2 text-center">담당 회원</th>
                        <th className="px-4 py-2 text-center">하위</th>
                        <th className="px-4 py-2 text-left">처리 방법</th>
                        <th className="px-4 py-2 text-left">재배정 대상</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletionPreview.subordinates.map((sub: any) => {
                      const action = deleteActions.find(a => a.subordinateId === sub.id);
                      return (
                        <tr key={sub.id} className="border-t">
                          <td className="px-4 py-2">
                            <div>
                              {sub.name}
                              {action?.action === 'reassign' && (
                                <>
                                  {sub.subordinatesCount > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      ├─ 🔄 하위 {sub.subordinatesCount}명도 함께 이동
                                    </div>
                                  )}
                                  {sub.managedUsersCount > 0 && (
                                    <div className="text-xs text-gray-500">
                                      └─ 👥 담당 회원 {sub.managedUsersCount}명은 {sub.name}가 계속 관리
                                    </div>
                                  )}
                                </>
                              )}
                              {action?.action === 'delete' && (
                                <>
                                  {sub.subordinatesCount > 0 && (
                                    <div className="text-xs text-red-500 mt-1">
                                      ⚠️ 하위 {sub.subordinatesCount}명이 있어 삭제 불가
                                    </div>
                                  )}
                                  {sub.managedUsersCount > 0 && (
                                    <div className="text-xs text-orange-600">
                                      └─ 👥 담당 회원 {sub.managedUsersCount}명 재배정 필요
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs rounded ${getTierBadgeColor(sub.tier)}`}>
                              {getTierLabel(sub.tier)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">{sub.managedUsersCount}명</td>
                          <td className="px-4 py-2 text-center">{sub.subordinatesCount}명</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  checked={action?.action === 'reassign'}
                                  onChange={() => updateAction(sub.id, { action: 'reassign' })}
                                />
                                재배정
                              </label>
                              <label className={`flex items-center gap-1 ${!sub.canDelete ? 'text-gray-400' : ''}`}>
                                <input
                                  type="radio"
                                  checked={action?.action === 'delete'}
                                  onChange={() => updateAction(sub.id, { action: 'delete' })}
                                  disabled={!sub.canDelete}
                                />
                                삭제
                              </label>
                            </div>
                            {!sub.canDelete && (
                              <div className="text-xs text-red-500 mt-1">
                                ⚠️ 하위 관리자 {sub.subordinatesCount}명이 있어 삭제 불가
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {action && (
                              <div>
                                <select
                                  value={action.targetAdminId || ''}
                                  onChange={(e) => updateAction(sub.id, { targetAdminId: e.target.value })}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                >
                                  <option value="">선택하세요</option>
                                  {deletionPreview.availableReassignTargets.map((target: any) => (
                                    <option key={target.id} value={target.id}>
                                      {target.realName} ({getTierLabel(target.tier)})
                                    </option>
                                  ))}
                                </select>
                                {action.action === 'reassign' && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    조직도 상위 변경
                                  </div>
                                )}
                                {action.action === 'delete' && sub.managedUsersCount > 0 && (
                                  <div className="text-xs text-orange-600 mt-1">
                                    담당 회원 {sub.managedUsersCount}명 재배정
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg mb-2">하위 관리자: 없음</p>
                    <p className="text-sm">본인 담당 회원만 재배정하면 삭제할 수 있습니다.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                <p className="font-medium mb-1">📌 처리 방법 안내:</p>
                <ul className="ml-4 space-y-1">
                  <li>
                    <span className="font-medium">재배정:</span> 조직도 상위만 변경, 담당 회원은 그대로 유지
                  </li>
                  <li>
                    <span className="font-medium">삭제:</span> 관리자 삭제, 담당 회원은 선택한 관리자에게 재배정
                  </li>
                </ul>
                <p className="font-medium mt-2 mb-1">📌 재배정 대상 규칙:</p>
                <ul className="ml-4 space-y-1">
                  <li>· 같은 지점({selectedAdmin.region || '미지정'})만</li>
                  <li>· 같은 등급 이상</li>
                  <li>· 하위 계층 제외 (순환 참조 방지)</li>
                </ul>
                <p className="mt-2 text-yellow-700">⚠️ 모든 작업은 원자적으로 처리됩니다 (실패 시 전체 롤백)</p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedAdmin(null);
                    setDeletionPreview(null);
                    setMainAdminUsersTarget('');
                    setDeleteActions([]);
                    setBulkMode(false);
                    setBulkTarget('');
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={handleDeleteWithSubordinates}
                  className="bg-red-500 hover:bg-red-600"
                >
                  전체 처리 후 삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAdminModal({
  currentAdmin,
  onClose,
  onSuccess,
}: {
  currentAdmin: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    loginId: '',
    email: '',
    password: '',
    realName: '',
    salesName: '',
    tier: 'GENERAL',
    region: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regionMode, setRegionMode] = useState<'select' | 'custom'>('select');
  const [customRegion, setCustomRegion] = useState('');

  // 현재 관리자가 생성 가능한 등급 목록
  const getAvailableTiers = () => {
    const tierOrder = ['INTEGRATED', 'CEO', 'MIDDLE', 'GENERAL'];
    const currentTierIndex = tierOrder.indexOf(currentAdmin.tier);

    // 현재 등급보다 하위 등급만 선택 가능
    return tierOrder.slice(currentTierIndex + 1);
  };

  const availableTiers = getAvailableTiers();

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      INTEGRATED: '통합관리자',
      CEO: '대표관리자',
      MIDDLE: '중간관리자',
      GENERAL: '일반관리자',
    };
    return labels[tier] || tier;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.loginId || !formData.password || !formData.realName || !formData.salesName) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiClient.createAdmin({
        loginId: formData.loginId,
        email: formData.email,
        password: formData.password,
        realName: formData.realName,
        salesName: formData.salesName,
        tier: formData.tier,
        region: formData.region,
      });
      alert('관리자가 추가되었습니다.');
      onSuccess();
    } catch (error) {
      console.error('Failed to create admin:', error);
      alert('관리자 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">관리자 추가</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              로그인 ID *
            </label>
            <Input
              type="text"
              value={formData.loginId}
              onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              본명 *
            </label>
            <Input
              type="text"
              value={formData.realName}
              onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
              required
              placeholder="실제 이름"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              영업자명 *
            </label>
            <Input
              type="text"
              value={formData.salesName}
              onChange={(e) => setFormData({ ...formData, salesName: e.target.value })}
              required
              placeholder="회원가입 시 표시될 이름"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 회원가입 시 담당자 검색에 표시되는 이름입니다
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 *
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              등급 *
            </label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              {availableTiers.length === 0 ? (
                <option value="">생성 권한이 없습니다</option>
              ) : (
                availableTiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {getTierLabel(tier)}
                  </option>
                ))
              )}
            </select>
            {availableTiers.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                💡 본인보다 하위 등급만 생성할 수 있습니다
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              지점
            </label>
            <select
              value={regionMode === 'custom' ? 'custom' : formData.region}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'custom') {
                  setRegionMode('custom');
                  setFormData({ ...formData, region: '' });
                } else {
                  setRegionMode('select');
                  setCustomRegion('');
                  setFormData({ ...formData, region: value });
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">선택하세요</option>
              <option value="본사">본사</option>
              <option value="피닉스">피닉스</option>
              <option value="가산">가산</option>
              <option value="미라클">미라클</option>
              <option value="custom">🖊️ 직접 입력</option>
            </select>
            {regionMode === 'custom' && (
              <Input
                type="text"
                placeholder="지점명을 입력하세요"
                value={customRegion}
                onChange={(e) => {
                  setCustomRegion(e.target.value);
                  setFormData({ ...formData, region: e.target.value });
                }}
                className="mt-2"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '추가 중...' : '추가'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
