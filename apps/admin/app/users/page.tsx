'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadUsers();
  }, [page, router]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await ApiClient.getUsers({
        search: search || undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: 'createdAt:desc',
      });
      setUsers(response.users);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleBanToggle = async (user: any) => {
    const action = user.isBanned ? '차단 해제' : '차단';
    const reason = user.isBanned ? '' : prompt('차단 사유를 입력하세요:');

    if (!user.isBanned && !reason) {
      return;
    }

    if (!confirm(`${user.name}님을 ${action}하시겠습니까?`)) {
      return;
    }

    try {
      if (user.isBanned) {
        await ApiClient.unbanUser(user.id);
      } else {
        await ApiClient.banUser(user.id, reason || '사유 없음');
      }
      alert(`${action}되었습니다.`);
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle ban:', error);
      alert(`${action}에 실패했습니다.`);
    }
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`${user.name}님을 삭제하시겠습니까?\n\n삭제된 회원은 복구할 수 없습니다.`)) {
      return;
    }

    try {
      await ApiClient.deleteUser(user.id);
      alert('삭제되었습니다.');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR');
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            회원 관리
          </h1>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            대시보드로
          </Button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              type="text"
              placeholder="이름, 전화번호, 닉네임으로 검색"
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
                setPage(1);
                loadUsers();
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
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              회원이 없습니다.
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전화번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      닉네임
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      소속코드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      회원 유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      담당자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPhone(user.phone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.nickname || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.affiliateCode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.memberType === 'STOCK' ? 'bg-blue-100 text-blue-800' :
                          user.memberType === 'COIN' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {user.memberType === 'STOCK' ? '주식' :
                           user.memberType === 'COIN' ? '코인' :
                           user.memberType === 'HYBRID' ? '하이브리드' : '-'}
                        </span>
                        {user.memberType === 'STOCK' && user.showCoinRooms && (
                          <span className="ml-1 text-xs text-gray-500">💰</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.manager ? `${user.manager.salesName} (${user.manager.region})` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isBanned ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            차단됨
                          </span>
                        ) : user.isActive ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            활성
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            비활성
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2"
                            onClick={() => router.push(`/users/${user.id}`)}
                          >
                            상세
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2"
                            onClick={() => handleBanToggle(user)}
                          >
                            {user.isBanned ? '해제' : '차단'}
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(user)}
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
    </div>
  );
}
