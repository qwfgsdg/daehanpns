'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { PermissionHelper, PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';

type Tab = 'banners' | 'popups';

interface Banner {
  id: string;
  position: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

interface Popup {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export default function BannersPage() {
  const router = useRouter();
  const { admin, isLoading: adminLoading } = useAdmin();
  const [hasPermission, setHasPermission] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('banners');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);

  // 배너 폼
  const [bannerForm, setbannerForm] = useState({
    position: 'HOME_TOP',
    title: '',
    imageUrl: '',
    linkUrl: '',
    order: 0,
    isActive: true,
    startDate: '',
    endDate: '',
  });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [showBannerForm, setShowBannerForm] = useState(false);

  // 팝업 폼
  const [popupForm, setPopupForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    startDate: '',
    endDate: '',
  });
  const [editingPopupId, setEditingPopupId] = useState<string | null>(null);
  const [showPopupForm, setShowPopupForm] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (admin) {
      const canAccess = PermissionHelper.hasPermission(admin, PERMISSIONS.BANNERS_MANAGE);
      setHasPermission(canAccess);

      if (!canAccess) {
        setLoading(false);
      }
    }
  }, [admin, router]);

  useEffect(() => {
    if (hasPermission) {
      if (activeTab === 'banners') {
        fetchBanners();
      } else {
        fetchPopups();
      }
    }
  }, [activeTab, hasPermission]);


  const fetchBanners = async () => {
    try {
      setLoading(true);
      const token = auth.getToken();
      const res = await fetch('/proxy-api/banners', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setBanners(data.banners);
    } catch (error) {
      console.error('배너 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopups = async () => {
    try {
      setLoading(true);
      const token = auth.getToken();
      const res = await fetch('/proxy-api/popups', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setPopups(data.popups);
    } catch (error) {
      console.error('팝업 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = auth.getToken();
      const url = editingBannerId
        ? `/proxy-api/banners/${editingBannerId}`
        : '/proxy-api/banners';

      const res = await fetch(url, {
        method: editingBannerId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bannerForm),
      });

      if (!res.ok) throw new Error();

      alert(editingBannerId ? '배너가 수정되었습니다' : '배너가 생성되었습니다');
      resetBannerForm();
      fetchBanners();
    } catch (error) {
      alert('배너 저장에 실패했습니다');
    }
  };

  const handlePopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = auth.getToken();
      const url = editingPopupId
        ? `/proxy-api/popups/${editingPopupId}`
        : '/proxy-api/popups';

      const res = await fetch(url, {
        method: editingPopupId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(popupForm),
      });

      if (!res.ok) throw new Error();

      alert(editingPopupId ? '팝업이 수정되었습니다' : '팝업이 생성되었습니다');
      resetPopupForm();
      fetchPopups();
    } catch (error) {
      alert('팝업 저장에 실패했습니다');
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('배너를 삭제하시겠습니까?')) return;

    try {
      const token = auth.getToken();
      const res = await fetch(`/proxy-api/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      alert('배너가 삭제되었습니다');
      fetchBanners();
    } catch (error) {
      alert('배너 삭제에 실패했습니다');
    }
  };

  const deletePopup = async (id: string) => {
    if (!confirm('팝업을 삭제하시겠습니까?')) return;

    try {
      const token = auth.getToken();
      const res = await fetch(`/proxy-api/popups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      alert('팝업이 삭제되었습니다');
      fetchPopups();
    } catch (error) {
      alert('팝업 삭제에 실패했습니다');
    }
  };

  const toggleBannerActive = async (id: string) => {
    try {
      const token = auth.getToken();
      const res = await fetch(`/proxy-api/banners/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      fetchBanners();
    } catch (error) {
      alert('상태 변경에 실패했습니다');
    }
  };

  const togglePopupActive = async (id: string) => {
    try {
      const token = auth.getToken();
      const res = await fetch(`/proxy-api/popups/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      fetchPopups();
    } catch (error) {
      alert('상태 변경에 실패했습니다');
    }
  };

  const editBanner = (banner: Banner) => {
    setbannerForm({
      position: banner.position,
      title: banner.title || '',
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      order: banner.order,
      isActive: banner.isActive,
      startDate: banner.startDate ? banner.startDate.split('T')[0] : '',
      endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
    });
    setEditingBannerId(banner.id);
    setShowBannerForm(true);
  };

  const editPopup = (popup: Popup) => {
    setPopupForm({
      title: popup.title,
      content: popup.content,
      imageUrl: popup.imageUrl || '',
      linkUrl: popup.linkUrl || '',
      isActive: popup.isActive,
      startDate: popup.startDate ? popup.startDate.split('T')[0] : '',
      endDate: popup.endDate ? popup.endDate.split('T')[0] : '',
    });
    setEditingPopupId(popup.id);
    setShowPopupForm(true);
  };

  const resetBannerForm = () => {
    setbannerForm({
      position: 'HOME_TOP',
      title: '',
      imageUrl: '',
      linkUrl: '',
      order: 0,
      isActive: true,
      startDate: '',
      endDate: '',
    });
    setEditingBannerId(null);
    setShowBannerForm(false);
  };

  const resetPopupForm = () => {
    setPopupForm({
      title: '',
      content: '',
      imageUrl: '',
      linkUrl: '',
      isActive: true,
      startDate: '',
      endDate: '',
    });
    setEditingPopupId(null);
    setShowPopupForm(false);
  };

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      HOME_TOP: '홈 상단',
      HOME_MIDDLE: '홈 중간',
      HOME_BOTTOM: '홈 하단',
      CHAT_TOP: '채팅 상단',
      COMMUNITY_TOP: '커뮤니티 상단',
    };
    return labels[position] || position;
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
      <h1 className="text-3xl font-bold mb-8">배너/팝업 관리</h1>

      {/* 탭 */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('banners')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'banners'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          배너 관리
        </button>
        <button
          onClick={() => setActiveTab('popups')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'popups'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          팝업 관리
        </button>
      </div>

      {/* 배너 탭 */}
      {activeTab === 'banners' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold">배너 목록</h2>
            <button
              onClick={() => setShowBannerForm(!showBannerForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showBannerForm ? '취소' : '배너 추가'}
            </button>
          </div>

          {/* 배너 생성/수정 폼 */}
          {showBannerForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-bold mb-4">
                {editingBannerId ? '배너 수정' : '배너 생성'}
              </h3>
              <form onSubmit={handleBannerSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">위치</label>
                    <select
                      value={bannerForm.position}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, position: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    >
                      <option value="HOME_TOP">홈 상단</option>
                      <option value="HOME_MIDDLE">홈 중간</option>
                      <option value="HOME_BOTTOM">홈 하단</option>
                      <option value="CHAT_TOP">채팅 상단</option>
                      <option value="COMMUNITY_TOP">커뮤니티 상단</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">제목</label>
                    <input
                      type="text"
                      value={bannerForm.title}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="배너 제목 (선택)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      이미지 URL *
                    </label>
                    <input
                      type="url"
                      value={bannerForm.imageUrl}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, imageUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">링크 URL</label>
                    <input
                      type="url"
                      value={bannerForm.linkUrl}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, linkUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">순서</label>
                    <input
                      type="number"
                      value={bannerForm.order}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, order: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">활성화</label>
                    <input
                      type="checkbox"
                      checked={bannerForm.isActive}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, isActive: e.target.checked })
                      }
                      className="w-5 h-5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">시작일</label>
                    <input
                      type="date"
                      value={bannerForm.startDate}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">종료일</label>
                    <input
                      type="date"
                      value={bannerForm.endDate}
                      onChange={(e) =>
                        setbannerForm({ ...bannerForm, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingBannerId ? '수정' : '생성'}
                  </button>
                  <button
                    type="button"
                    onClick={resetBannerForm}
                    className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 배너 목록 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">로딩 중...</div>
            ) : banners.length === 0 ? (
              <div className="p-8 text-center text-gray-500">배너가 없습니다</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      위치
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      제목
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      순서
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      기간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {banners.map((banner) => (
                    <tr key={banner.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getPositionLabel(banner.position)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {banner.title || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {banner.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            banner.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {banner.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {banner.startDate
                          ? `${banner.startDate.split('T')[0]} ~ ${
                              banner.endDate?.split('T')[0] || '무제한'
                            }`
                          : '무제한'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleBannerActive(banner.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {banner.isActive ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => editBanner(banner)}
                            className="text-green-600 hover:text-green-800"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteBanner(banner.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 팝업 탭 */}
      {activeTab === 'popups' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold">팝업 목록</h2>
            <button
              onClick={() => setShowPopupForm(!showPopupForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showPopupForm ? '취소' : '팝업 추가'}
            </button>
          </div>

          {/* 팝업 생성/수정 폼 */}
          {showPopupForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-bold mb-4">
                {editingPopupId ? '팝업 수정' : '팝업 생성'}
              </h3>
              <form onSubmit={handlePopupSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      제목 *
                    </label>
                    <input
                      type="text"
                      value={popupForm.title}
                      onChange={(e) =>
                        setPopupForm({ ...popupForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="팝업 제목"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      내용 *
                    </label>
                    <textarea
                      value={popupForm.content}
                      onChange={(e) =>
                        setPopupForm({ ...popupForm, content: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="팝업 내용"
                      rows={5}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      이미지 URL
                    </label>
                    <input
                      type="url"
                      value={popupForm.imageUrl}
                      onChange={(e) =>
                        setPopupForm({ ...popupForm, imageUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">링크 URL</label>
                    <input
                      type="url"
                      value={popupForm.linkUrl}
                      onChange={(e) =>
                        setPopupForm({ ...popupForm, linkUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">시작일</label>
                    <input
                      type="date"
                      value={popupForm.startDate}
                      onChange={(e) =>
                        setPopupForm({ ...popupForm, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">종료일</label>
                    <input
                      type="date"
                      value={popupForm.endDate}
                      onChange={(e) =>
                        setPopupForm({ ...popupForm, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">활성화</label>
                    <input
                      type="checkbox"
                      checked={popupForm.isActive}
                      onChange={(e) =>
                        setPopupForm({ ...popupForm, isActive: e.target.checked })
                      }
                      className="w-5 h-5"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingPopupId ? '수정' : '생성'}
                  </button>
                  <button
                    type="button"
                    onClick={resetPopupForm}
                    className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 팝업 목록 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">로딩 중...</div>
            ) : popups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">팝업이 없습니다</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      제목
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      내용
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      기간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {popups.map((popup) => (
                    <tr key={popup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium">
                        {popup.title}
                      </td>
                      <td className="px-6 py-4 text-sm max-w-md truncate">
                        {popup.content}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            popup.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {popup.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {popup.startDate
                          ? `${popup.startDate.split('T')[0]} ~ ${
                              popup.endDate?.split('T')[0] || '무제한'
                            }`
                          : '무제한'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePopupActive(popup.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {popup.isActive ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => editPopup(popup)}
                            className="text-green-600 hover:text-green-800"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deletePopup(popup.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
