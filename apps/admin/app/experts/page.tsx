'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Expert {
  id: string;
  name: string;
  profileImage?: string;
  description?: string;
  vipRoomId?: string;
  vvipRoomId?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    subscriptions: number;
  };
}

interface ExpertFormData {
  name: string;
  profileImage: string;
  description: string;
  vipRoomId: string;
  vvipRoomId: string;
}

export default function ExpertsPage() {
  const router = useRouter();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [formData, setFormData] = useState<ExpertFormData>({
    name: '',
    profileImage: '',
    description: '',
    vipRoomId: '',
    vvipRoomId: '',
  });

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadExperts();
  }, [router]);

  const loadExperts = async () => {
    setIsLoading(true);
    try {
      const response = await ApiClient.getExperts({
        search: search || undefined,
        isActive: activeFilter,
      });
      setExperts(response.experts);
    } catch (error) {
      console.error('Failed to load experts:', error);
      alert('전문가 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadExperts();
  };

  const openCreateModal = () => {
    setEditingExpert(null);
    setFormData({
      name: '',
      profileImage: '',
      description: '',
      vipRoomId: '',
      vvipRoomId: '',
    });
    setShowModal(true);
  };

  const openEditModal = (expert: Expert) => {
    setEditingExpert(expert);
    setFormData({
      name: expert.name,
      profileImage: expert.profileImage || '',
      description: expert.description || '',
      vipRoomId: expert.vipRoomId || '',
      vvipRoomId: expert.vvipRoomId || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('전문가 이름을 입력해주세요.');
      return;
    }

    try {
      if (editingExpert) {
        await ApiClient.updateExpert(editingExpert.id, formData);
        alert('전문가가 수정되었습니다.');
      } else {
        await ApiClient.createExpert(formData);
        alert('전문가가 추가되었습니다.');
      }
      setShowModal(false);
      loadExperts();
    } catch (error) {
      console.error('Failed to save expert:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (expert: Expert) => {
    if (!confirm(`${expert.name} 전문가를 비활성화하시겠습니까?`)) return;

    try {
      await ApiClient.updateExpert(expert.id, { isActive: false });
      alert('전문가가 비활성화되었습니다.');
      loadExperts();
    } catch (error) {
      console.error('Failed to deactivate expert:', error);
      alert('비활성화에 실패했습니다.');
    }
  };

  const handleActivate = async (expert: Expert) => {
    if (!confirm(`${expert.name} 전문가를 활성화하시겠습니까?`)) return;

    try {
      await ApiClient.updateExpert(expert.id, { isActive: true });
      alert('전문가가 활성화되었습니다.');
      loadExperts();
    } catch (error) {
      console.error('Failed to activate expert:', error);
      alert('활성화에 실패했습니다.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            전문가 관리
          </h1>
          <div className="flex gap-2">
            <Button onClick={openCreateModal}>
              전문가 추가
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
              placeholder="전문가 이름으로 검색"
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
                setActiveFilter(undefined);
                loadExperts();
              }}
            >
              초기화
            </Button>
          </form>

          <div className="flex gap-2">
            <Button
              variant={activeFilter === undefined ? 'primary' : 'outline'}
              onClick={() => {
                setActiveFilter(undefined);
                loadExperts();
              }}
            >
              전체
            </Button>
            <Button
              variant={activeFilter === true ? 'primary' : 'outline'}
              onClick={() => {
                setActiveFilter(true);
                loadExperts();
              }}
            >
              활성
            </Button>
            <Button
              variant={activeFilter === false ? 'primary' : 'outline'}
              onClick={() => {
                setActiveFilter(false);
                loadExperts();
              }}
            >
              비활성
            </Button>
          </div>
        </div>

        {/* 통계 */}
        <div className="mb-4 text-sm text-gray-600">
          전체 {experts.length}명
        </div>

        {/* 전문가 카드 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : experts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              전문가가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {experts.map((expert) => (
                <div key={expert.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    {expert.profileImage ? (
                      <img
                        src={expert.profileImage}
                        alt={expert.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">
                        {expert.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{expert.name}</h3>
                        {expert.isActive ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            활성
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            비활성
                          </span>
                        )}
                      </div>
                      {expert.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {expert.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {expert.vipRoomId && (
                      <div>
                        <span className="text-gray-500">VIP Room: </span>
                        <span className="font-medium">{expert.vipRoomId}</span>
                      </div>
                    )}
                    {expert.vvipRoomId && (
                      <div>
                        <span className="text-gray-500">VVIP Room: </span>
                        <span className="font-medium">{expert.vvipRoomId}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">구독자: </span>
                      <span className="font-medium">{expert._count?.subscriptions || 0}명</span>
                    </div>
                    <div>
                      <span className="text-gray-500">생성일: </span>
                      <span className="font-medium">{formatDate(expert.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-sm py-1"
                      onClick={() => openEditModal(expert)}
                    >
                      수정
                    </Button>
                    {expert.isActive ? (
                      <Button
                        variant="outline"
                        className="flex-1 text-sm py-1"
                        onClick={() => handleDelete(expert)}
                      >
                        비활성화
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex-1 text-sm py-1"
                        onClick={() => handleActivate(expert)}
                      >
                        활성화
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingExpert ? '전문가 수정' : '전문가 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="이름 *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="전문가 이름"
                required
              />
              <Input
                label="프로필 이미지 URL"
                value={formData.profileImage}
                onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                placeholder="https://..."
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="전문가에 대한 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                  rows={3}
                />
              </div>
              <Input
                label="VIP Room ID"
                value={formData.vipRoomId}
                onChange={(e) => setFormData({ ...formData, vipRoomId: e.target.value })}
                placeholder="VIP 채팅방 ID"
              />
              <Input
                label="VVIP Room ID"
                value={formData.vvipRoomId}
                onChange={(e) => setFormData({ ...formData, vvipRoomId: e.target.value })}
                placeholder="VVIP 채팅방 ID"
              />
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  취소
                </Button>
                <Button type="submit">
                  {editingExpert ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
