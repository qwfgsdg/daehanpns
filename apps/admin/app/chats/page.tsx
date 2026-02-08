'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionHelper, AdminUser, PERMISSIONS } from '@/lib/permissions';

interface ChatRoom {
  id: string;
  type: string;
  category?: string;
  name: string;
  description?: string;
  image?: string;
  maxParticipants?: number;
  participantCount: number;
  todayMessageCount: number;
  last7DaysMessageCount: number;
  lastActivityAt: string;
  kickedCount: number;
  shadowBannedCount: number;
  unreadCount: number;
  createdAt: string;
}

interface Expert {
  id: string;
  name: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expertFilter, setExpertFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);
  const pageSize = 20;

  const [createForm, setCreateForm] = useState({
    type: 'ONE_TO_N',
    category: 'STOCK' as 'STOCK' | 'COIN',
    name: '',
    description: '',
    image: '',
    maxParticipants: '',
    ownerId: '',
  });

  useEffect(() => {
    checkPermissionAndLoad();
  }, [router]);

  useEffect(() => {
    if (hasPermission) {
      loadRooms();
    }
  }, [page, typeFilter, expertFilter, statusFilter, hasPermission]);

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

      const canAccess = PermissionHelper.hasPermission(adminData, PERMISSIONS.CHATS_MANAGE);
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

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const isActive = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;

      const response = await ApiClient.getChats({
        type: typeFilter || undefined,
        expertId: expertFilter || undefined,
        isActive,
        search: search || undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      setRooms(response.rooms);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load chats:', error);
      alert('채팅방 목록을 불러오는데 실패했습니다.');
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadRooms();
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((createForm.type === 'ONE_TO_N' || createForm.type === 'TWO_WAY') && !createForm.name.trim()) {
      alert(`${createForm.type === 'ONE_TO_N' ? '1:N' : '양방향 소통방'}은 이름이 필수입니다.`);
      return;
    }

    try {
      await ApiClient.createChat({
        type: createForm.type,
        category: createForm.category,
        name: createForm.name || undefined,
        description: createForm.description || undefined,
        image: createForm.image || undefined,
        maxParticipants: createForm.maxParticipants ? parseInt(createForm.maxParticipants) : undefined,
        ownerId: createForm.ownerId || undefined,
      });
      alert('채팅방이 생성되었습니다.');
      setShowCreateModal(false);
      setCreateForm({
        type: 'ONE_TO_N',
        category: 'STOCK',
        name: '',
        description: '',
        image: '',
        maxParticipants: '',
        ownerId: '',
      });
      loadRooms();
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      alert(error.message || '채팅방 생성에 실패했습니다.');
    }
  };

  const handleDelete = async (room: any) => {
    const reason = prompt('채팅방 삭제 사유를 입력하세요 (선택):');

    if (!confirm(
      `채팅방 "${room.name || '이름 없음'}"을(를) 삭제하시겠습니까?\n\n` +
      `참여자: ${room._count?.participants || 0}명\n` +
      `메시지: ${room._count?.messages || 0}개\n\n` +
      `※ 채팅방과 메시지는 숨김 처리되며, 복구 가능합니다.`
    )) {
      return;
    }

    try {
      await ApiClient.deleteChat(room.id, reason || undefined);
      alert('채팅방이 삭제되었습니다.');
      loadRooms();
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      alert(error.message || '삭제에 실패했습니다.');
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return d.toLocaleDateString('ko-KR');
  };

  const getStatusBadge = (isActive: boolean) => {
    if (!isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">비활성</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">활성</span>;
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
            채팅방 관리
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              채팅방 생성
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
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">전체 유형</option>
                <option value="ONE_TO_N">1:N</option>
                <option value="ONE_TO_ONE">1:1</option>
                <option value="TWO_WAY">양방향 소통방</option>
              </select>
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
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="채팅방 이름 또는 참가자 이름으로 검색"
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
                  setTypeFilter('');
                  setExpertFilter('');
                  setStatusFilter('');
                  setPage(1);
                  loadRooms();
                }}
              >
                초기화
              </Button>
            </div>
          </form>
        </div>

        {/* 통계 */}
        <div className="mb-4 text-sm text-gray-600">
          전체 {total}개
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              채팅방이 없습니다.
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      채팅방 이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      참가자 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      오늘 메시지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최근 활동
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {room.name || '(이름 없음)'}
                        </div>
                        {room.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {room.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {room.type === 'ONE_TO_N' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">1:N</span>
                        ) : room.type === 'TWO_WAY' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">양방향</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">1:1</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {room.category === 'STOCK' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">주식</span>
                        ) : room.category === 'COIN' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-700">코인</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {room.participantCount}{room.maxParticipants ? `/${room.maxParticipants}` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {room.todayMessageCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(room.lastActivityAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">활성</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2"
                            onClick={() => router.push(`/chats/${room.id}`)}
                          >
                            상세
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(room)}
                          >
                            삭제
                          </Button>
                        </div>
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

      {/* 채팅방 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">채팅방 생성</h3>
            <form onSubmit={handleCreateChat} className="space-y-4">
              {/* 채팅방 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채팅방 유형 *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="ONE_TO_N"
                      checked={createForm.type === 'ONE_TO_N'}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      className="mr-2"
                    />
                    1:N
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="ONE_TO_ONE"
                      checked={createForm.type === 'ONE_TO_ONE'}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      className="mr-2"
                    />
                    1:1
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="TWO_WAY"
                      checked={createForm.type === 'TWO_WAY'}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      className="mr-2"
                    />
                    양방향 소통방
                  </label>
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리 *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="STOCK"
                      checked={createForm.category === 'STOCK'}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as 'STOCK' | 'COIN' })}
                      className="mr-2"
                    />
                    주식방
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="COIN"
                      checked={createForm.category === 'COIN'}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as 'STOCK' | 'COIN' })}
                      className="mr-2"
                    />
                    코인방
                  </label>
                </div>
              </div>

              {/* 채팅방 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채팅방 이름 {(createForm.type === 'ONE_TO_N' || createForm.type === 'TWO_WAY') && '*'}
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="채팅방 이름"
                  required={createForm.type === 'ONE_TO_N' || createForm.type === 'TWO_WAY'}
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="채팅방 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                  rows={3}
                />
              </div>

              {/* 이미지 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL
                </label>
                <Input
                  value={createForm.image}
                  onChange={(e) => setCreateForm({ ...createForm, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* 최대 인원 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  최대 인원 (빈 칸이면 무제한)
                </label>
                <Input
                  type="number"
                  min="2"
                  value={createForm.maxParticipants}
                  onChange={(e) => setCreateForm({ ...createForm, maxParticipants: e.target.value })}
                  placeholder="무제한"
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
                  생성
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
