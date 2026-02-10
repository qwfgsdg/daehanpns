'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { PermissionHelper, PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';

interface AppVersion {
  id: string;
  platform: 'WEB' | 'IOS' | 'ANDROID';
  version: string;
  buildNumber: number;
  isForceUpdate: boolean;
  updateMessage: string | null;
  downloadUrl: string | null;
  createdAt: string;
}

export default function AppVersionsPage() {
  const router = useRouter();
  const { admin, isLoading: adminLoading } = useAdmin();
  const [hasPermission, setHasPermission] = useState(false);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: 'IOS' as 'WEB' | 'IOS' | 'ANDROID',
    version: '',
    buildNumber: 1,
    isForceUpdate: false,
    updateMessage: '',
    downloadUrl: '',
  });

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (admin) {
      const canAccess = PermissionHelper.hasPermission(admin, PERMISSIONS.APP_VERSIONS_MANAGE);
      setHasPermission(canAccess);

      if (!canAccess) {
        setLoading(false);
      }
    }
  }, [admin, router]);

  useEffect(() => {
    if (hasPermission) {
      fetchVersions();
    }
  }, [hasPermission]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const token = auth.getToken();
      const res = await fetch('http://localhost:3000/api/app-versions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setVersions(data.versions);
    } catch (error) {
      console.error('버전 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = auth.getToken();
      const url = editingId
        ? `http://localhost:3000/api/app-versions/${editingId}`
        : 'http://localhost:3000/api/app-versions';

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          updateMessage: form.updateMessage || undefined,
          downloadUrl: form.downloadUrl || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      alert(editingId ? '버전이 수정되었습니다' : '버전이 등록되었습니다');
      resetForm();
      fetchVersions();
    } catch (error: any) {
      alert(error.message || '버전 저장에 실패했습니다');
    }
  };

  const deleteVersion = async (id: string) => {
    if (!confirm('이 버전을 삭제하시겠습니까?')) return;

    try {
      const token = auth.getToken();
      const res = await fetch(`http://localhost:3000/api/app-versions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      alert('버전이 삭제되었습니다');
      fetchVersions();
    } catch (error) {
      alert('버전 삭제에 실패했습니다');
    }
  };

  const editVersion = (version: AppVersion) => {
    setForm({
      platform: version.platform,
      version: version.version,
      buildNumber: version.buildNumber,
      isForceUpdate: version.isForceUpdate,
      updateMessage: version.updateMessage || '',
      downloadUrl: version.downloadUrl || '',
    });
    setEditingId(version.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      platform: 'IOS',
      version: '',
      buildNumber: 1,
      isForceUpdate: false,
      updateMessage: '',
      downloadUrl: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      WEB: '웹',
      IOS: 'iOS',
      ANDROID: 'Android',
    };
    return labels[platform] || platform;
  };

  const getPlatformBadgeColor = (platform: string) => {
    const colors: Record<string, string> = {
      WEB: 'bg-blue-100 text-blue-800',
      IOS: 'bg-gray-100 text-gray-800',
      ANDROID: 'bg-green-100 text-green-800',
    };
    return colors[platform] || 'bg-gray-100 text-gray-800';
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
      <h1 className="text-3xl font-bold mb-8">앱 버전 관리</h1>

      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">iOS/Android 앱 버전을 관리하고 강제 업데이트를 설정합니다</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? '취소' : '버전 등록'}
        </button>
      </div>

      {/* 버전 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-bold mb-4">
            {editingId ? '버전 수정' : '버전 등록'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  플랫폼 *
                </label>
                <select
                  value={form.platform}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      platform: e.target.value as 'WEB' | 'IOS' | 'ANDROID',
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                  disabled={!!editingId}
                >
                  <option value="IOS">iOS</option>
                  <option value="ANDROID">Android</option>
                  <option value="WEB">웹</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  버전 *
                </label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="1.0.0"
                  required
                  disabled={!!editingId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  빌드 번호 *
                </label>
                <input
                  type="number"
                  value={form.buildNumber}
                  onChange={(e) =>
                    setForm({ ...form, buildNumber: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  강제 업데이트
                </label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    checked={form.isForceUpdate}
                    onChange={(e) =>
                      setForm({ ...form, isForceUpdate: e.target.checked })
                    }
                    className="w-5 h-5"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    사용자가 업데이트 없이 앱을 사용할 수 없습니다
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  업데이트 메시지
                </label>
                <textarea
                  value={form.updateMessage}
                  onChange={(e) =>
                    setForm({ ...form, updateMessage: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="새로운 기능이 추가되었습니다. 지금 업데이트하세요!"
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  다운로드 URL
                </label>
                <input
                  type="url"
                  value={form.downloadUrl}
                  onChange={(e) =>
                    setForm({ ...form, downloadUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="https://apps.apple.com/... 또는 https://play.google.com/..."
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingId ? '수정' : '등록'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 버전 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : versions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            등록된 버전이 없습니다
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  플랫폼
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  버전
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  빌드 번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  강제 업데이트
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  업데이트 메시지
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  등록일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {versions.map((version) => (
                <tr key={version.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPlatformBadgeColor(
                        version.platform
                      )}`}
                    >
                      {getPlatformLabel(version.platform)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {version.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {version.buildNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {version.isForceUpdate ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                        강제
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        선택
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm max-w-xs truncate">
                    {version.updateMessage || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(version.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editVersion(version)}
                        className="text-green-600 hover:text-green-800"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => deleteVersion(version.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                      {version.downloadUrl && (
                        <a
                          href={version.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          스토어
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API 사용 가이드 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3 text-blue-900">
          클라이언트 API 사용 가이드
        </h3>
        <div className="space-y-3 text-sm text-blue-900">
          <div>
            <p className="font-medium mb-1">1. 최신 버전 조회:</p>
            <code className="bg-blue-100 px-2 py-1 rounded">
              GET /api/app-versions/latest/:platform
            </code>
            <p className="text-xs text-blue-700 mt-1">
              예: /api/app-versions/latest/IOS
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">2. 버전 체크:</p>
            <code className="bg-blue-100 px-2 py-1 rounded">
              GET /api/app-versions/check/:platform?version=1.0.0&buildNumber=1
            </code>
            <p className="text-xs text-blue-700 mt-1">
              업데이트 필요 여부, 강제 업데이트 여부를 반환합니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
