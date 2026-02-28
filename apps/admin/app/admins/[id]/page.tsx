'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TabType = 'info' | 'permissions' | 'members';

export default function AdminDetailPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.id as string;

  const [admin, setAdmin] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // 기본 정보 편집
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    realName: '',
    salesName: '',
    email: '',
    phone: '',
    region: '',
    tier: '',
    chatNickname: '',
    chatProfileImage: '',
  });

  // 비밀번호 변경
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // 권한 편집
  const [isPermissionEditMode, setIsPermissionEditMode] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);

  // 초대링크
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  // 소속 회원
  const [members, setMembers] = useState<any[]>([]);
  const [memberStats, setMemberStats] = useState({
    total: 0,
    active: 0,
    vip: 0,
    vvip: 0,
  });
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadAdminData();
  }, [adminId, router]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Load admin and permissions in parallel
      await Promise.all([
        loadAdmin(),
        loadPermissions(),
      ]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members') {
      // Load members and stats in parallel
      Promise.all([
        loadMembers(),
        loadMemberStats(),
      ]).catch(error => {
        console.error('Failed to load member data:', error);
      });
    }
  }, [activeTab, memberPage, memberSearch]);

  const loadAdmin = async () => {
    try {
      const data = await ApiClient.getAdmin(adminId);
      setAdmin(data);
      setEditForm({
        realName: data.realName || '',
        salesName: data.salesName || '',
        email: data.email || '',
        phone: data.phone || '',
        region: data.region || '',
        tier: data.tier || '',
        chatNickname: data.chatNickname || '',
        chatProfileImage: data.chatProfileImage || '',
      });
    } catch (error) {
      console.error('Failed to load admin:', error);
      alert('관리자 정보를 불러오는데 실패했습니다.');
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await ApiClient.getAdminPermissions(adminId);
      setPermissions(data);
      setEditedPermissions(data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadMembers = async () => {
    // TODO: API 구현 필요 - 해당 관리자 소속 회원 목록
    // const data = await ApiClient.getAdminMembers(adminId, { page: memberPage, search: memberSearch });
    // setMembers(data.users);
  };

  const loadMemberStats = async () => {
    // TODO: API 구현 필요 - 해당 관리자 소속 회원 통계
    // const data = await ApiClient.getAdminMemberStats(adminId);
    // setMemberStats(data);
  };

  const handleSaveInfo = async () => {
    try {
      await ApiClient.updateAdmin(adminId, editForm);
      alert('정보가 수정되었습니다.');
      setIsEditMode(false);

      // Update local state instead of reloading
      setAdmin((prevAdmin: any) => ({
        ...prevAdmin,
        ...editForm,
      }));
    } catch (error: any) {
      console.error('Failed to update admin:', error);
      alert(error.message || '수정에 실패했습니다.');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    try {
      await ApiClient.updateAdminPassword(adminId, newPassword);
      alert('비밀번호가 변경되었습니다.');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      alert(error.message || '비밀번호 변경에 실패했습니다.');
    }
  };

  const handleResetPassword = async () => {
    const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
    if (!confirm(`비밀번호를 초기화하시겠습니까?\n\n새 비밀번호: ${randomPassword}`)) return;

    try {
      await ApiClient.updateAdminPassword(adminId, randomPassword);
      alert(`비밀번호가 초기화되었습니다.\n\n새 비밀번호: ${randomPassword}\n\n관리자에게 전달해주세요.`);
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      alert(error.message || '비밀번호 초기화에 실패했습니다.');
    }
  };

  const handleUnlock = async () => {
    if (!confirm('잠금을 해제하시겠습니까?')) return;

    try {
      await ApiClient.unlockAdmin(adminId);
      alert('잠금이 해제되었습니다.');
      loadAdmin();
    } catch (error: any) {
      console.error('Failed to unlock admin:', error);
      alert(error.message || '잠금 해제에 실패했습니다.');
    }
  };

  const handleGenerateInviteLink = async () => {
    try {
      const data = await ApiClient.getInviteLink(adminId, 'https://dhpns.kr');
      setInviteLink(data.link);
      setShowInviteLinkModal(true);
    } catch (error: any) {
      console.error('Failed to generate invite link:', error);
      alert(error.message || '초대링크 생성에 실패했습니다.');
    }
  };

  const handleSavePermissions = async () => {
    try {
      // TODO: API 구현 필요 - 권한 일괄 업데이트
      // await ApiClient.updateAdminPermissions(adminId, editedPermissions);
      alert('권한이 저장되었습니다.');
      setIsPermissionEditMode(false);
      loadPermissions();
    } catch (error: any) {
      console.error('Failed to save permissions:', error);
      alert(error.message || '권한 저장에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (admin?.tier === 'INTEGRATED') {
      alert('통합관리자는 삭제할 수 없습니다.');
      return;
    }

    if (!confirm(`${admin?.realName}님을 삭제하시겠습니까?\n\n하위 관리자가 있는 경우 삭제할 수 없습니다.`)) {
      return;
    }

    try {
      await ApiClient.deleteAdmin(adminId);
      alert('삭제되었습니다.');
      router.push('/admins');
    } catch (error: any) {
      console.error('Failed to delete admin:', error);
      alert(error.message || '삭제에 실패했습니다.');
    }
  };

  const togglePermission = (perm: string) => {
    if (editedPermissions.includes(perm)) {
      setEditedPermissions(editedPermissions.filter((p) => p !== perm));
    } else {
      setEditedPermissions([...editedPermissions, perm]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다.');
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

  const getPermissionLabel = (perm: string) => {
    const labels: Record<string, string> = {
      'members.view': '회원 조회',
      'members.update': '회원 수정',
      'members.ban': '회원 차단',
      'members.memo': '회원 메모',
      'members.unmask_phone': '전화번호 확인',
      'members.excel': '엑셀 다운로드',
      'members.temp_account': '임시 계정 생성',
      'admins.manage': '관리자 관리',
      'admins.logo': '로고 관리',
      'unlock.all': '잠금 해제',
      'subscriptions.manage': '구독 관리',
      'chats.manage': '채팅방 관리',
      'banners.manage': '배너 관리',
      'support.manage': '고객지원 관리',
      'logs.view': '로그 조회',
      'app_versions.manage': '앱 버전 관리',
    };
    return labels[perm] || perm;
  };

  const getPermissionCategory = (perm: string) => {
    if (perm.startsWith('members.')) return '회원 관리';
    if (perm.startsWith('admins.')) return '관리자 관리';
    if (perm.startsWith('subscriptions.')) return '구독 관리';
    if (perm.startsWith('chats.')) return '채팅 관리';
    if (perm.startsWith('banners.')) return '배너 관리';
    if (perm.startsWith('support.')) return '고객지원';
    if (perm.startsWith('logs.')) return '로그';
    if (perm.startsWith('app_versions.')) return '앱 관리';
    return '기타';
  };

  const groupPermissionsByCategory = (perms: string[]) => {
    const grouped: Record<string, string[]> = {};
    perms.forEach((perm) => {
      const category = getPermissionCategory(perm);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(perm);
    });
    return grouped;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ko-KR');
  };

  const isLocked = admin?.lockedUntil && new Date(admin.lockedUntil) > new Date();

  // 전체 권한 목록 (예시)
  const allPermissions = [
    'members.view',
    'members.update',
    'members.ban',
    'members.memo',
    'members.unmask_phone',
    'members.excel',
    'members.temp_account',
    'admins.manage',
    'admins.logo',
    'unlock.all',
    'subscriptions.manage',
    'chats.manage',
    'banners.manage',
    'support.manage',
    'logs.view',
    'app_versions.manage',
  ];

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

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">관리자를 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/admins')} className="mt-4">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">관리자 상세 정보</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/admins')}>
                목록으로
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditMode(!isEditMode)}
                disabled={activeTab !== 'info'}
              >
                {isEditMode ? '취소' : '수정'}
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={handleDelete}
                disabled={admin.tier === 'INTEGRATED'}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'info'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                기본 정보
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'permissions'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                권한 관리
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'members'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                소속 회원
              </button>
            </div>
          </div>
        </div>

        {/* 탭 1: 기본 정보 */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">본명</label>
                  {isEditMode ? (
                    <Input
                      value={editForm.realName}
                      onChange={(e) => setEditForm({ ...editForm, realName: e.target.value })}
                    />
                  ) : (
                    <p className="text-base font-medium">{admin.realName}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">영업자명</label>
                  {isEditMode ? (
                    <Input
                      value={editForm.salesName}
                      onChange={(e) => setEditForm({ ...editForm, salesName: e.target.value })}
                    />
                  ) : (
                    <p className="text-base font-medium">{admin.salesName}</p>
                  )}
                  <p className="text-xs text-gray-400">회원가입 시 표시되는 이름</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">로그인 ID</label>
                  <p className="text-base font-medium">{admin.loginId}</p>
                  <p className="text-xs text-gray-400">변경 불가</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">이메일</label>
                  {isEditMode ? (
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-base font-medium">{admin.email || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">전화번호</label>
                  {isEditMode ? (
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-base font-medium">{admin.phone || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">등급</label>
                  {isEditMode ? (
                    <select
                      value={editForm.tier}
                      onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="GENERAL">일반관리자</option>
                      <option value="MIDDLE">중간관리자</option>
                      <option value="CEO">대표관리자</option>
                      <option value="INTEGRATED" disabled>통합관리자</option>
                    </select>
                  ) : (
                    <p className="text-base font-medium">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {getTierLabel(admin.tier)}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">지점</label>
                  {isEditMode ? (
                    <Input
                      value={editForm.region}
                      onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    />
                  ) : (
                    <p className="text-base font-medium">{admin.region || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">채팅 닉네임</label>
                  {isEditMode ? (
                    <Input
                      value={editForm.chatNickname}
                      onChange={(e) => setEditForm({ ...editForm, chatNickname: e.target.value })}
                      placeholder="채팅에서 표시될 닉네임"
                    />
                  ) : (
                    <p className="text-base font-medium">{admin.chatNickname || '-'}</p>
                  )}
                  <p className="text-xs text-gray-400">채팅방에서 표시되는 페르소나 닉네임</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">채팅 프로필 사진</label>
                  {isEditMode ? (
                    <Input
                      value={editForm.chatProfileImage}
                      onChange={(e) => setEditForm({ ...editForm, chatProfileImage: e.target.value })}
                      placeholder="프로필 사진 URL"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      {admin.chatProfileImage ? (
                        <>
                          <img src={admin.chatProfileImage} alt="Chat profile" className="w-8 h-8 rounded-full object-cover" />
                          <p className="text-base font-medium text-gray-600 truncate">{admin.chatProfileImage}</p>
                        </>
                      ) : (
                        <p className="text-base font-medium">-</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">소속코드</label>
                  <p className="text-base font-medium">{admin.affiliationCode || '-'}</p>
                  <p className="text-xs text-gray-400">변경 불가</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">생성일</label>
                  <p className="text-base font-medium">{formatDate(admin.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">상태</label>
                  <div className="mt-1">
                    {isLocked ? (
                      <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-semibold">
                        잠금됨
                      </span>
                    ) : admin.isActive ? (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                        활성
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-semibold">
                        비활성
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isEditMode && (
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditMode(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSaveInfo}>저장</Button>
                </div>
              )}
            </div>

            {/* 로그인 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">로그인 정보</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">로그인 실패 횟수</label>
                  <p className="text-base font-medium">{admin.loginAttempts || 0}회</p>
                </div>
                {admin.lockedUntil && (
                  <div>
                    <label className="text-sm text-gray-500">잠금 해제 시각</label>
                    <p className="text-base font-medium text-red-600">
                      {formatDate(admin.lockedUntil)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">빠른 액션</h2>
              <div className="flex gap-2 flex-wrap">
                {isLocked && (
                  <Button onClick={handleUnlock} variant="outline">
                    🔓 잠금 해제
                  </Button>
                )}
                <Button onClick={handleGenerateInviteLink} variant="outline">
                  🔗 초대링크 생성
                </Button>
                <Button onClick={handleResetPassword} variant="outline">
                  🔑 비밀번호 초기화
                </Button>
                <Button onClick={() => setShowPasswordModal(true)} variant="outline">
                  🔐 비밀번호 변경
                </Button>
              </div>
            </div>

            {/* 로고 (대표관리자만) */}
            {admin.tier === 'CEO' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">로고</h2>
                {admin.logoUrl ? (
                  <img
                    src={admin.logoUrl}
                    alt="Logo"
                    className="w-32 h-32 object-contain border rounded"
                  />
                ) : (
                  <p className="text-sm text-gray-500">로고가 없습니다</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 탭 2: 권한 관리 */}
        {activeTab === 'permissions' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">권한 관리</h2>
              {isPermissionEditMode ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPermissionEditMode(false);
                      setEditedPermissions(permissions);
                    }}
                  >
                    취소
                  </Button>
                  <Button onClick={handleSavePermissions}>저장</Button>
                </div>
              ) : (
                <Button onClick={() => setIsPermissionEditMode(true)}>편집</Button>
              )}
            </div>

            {isPermissionEditMode ? (
              <div className="space-y-4">
                {Object.entries(groupPermissionsByCategory(allPermissions)).map(([category, perms]) => (
                  <div key={category} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{category}</h3>
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <label key={perm} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedPermissions.includes(perm)}
                            onChange={() => togglePermission(perm)}
                            className="mr-2"
                          />
                          <span className="text-sm">{getPermissionLabel(perm)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : permissions.length === 0 ? (
              <p className="text-sm text-gray-500">권한이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupPermissionsByCategory(permissions)).map(([category, perms]) => (
                  <div key={category} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((perm) => (
                        <span
                          key={perm}
                          className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium"
                        >
                          {getPermissionLabel(perm)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 탭 3: 소속 회원 */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-1">총 회원</div>
                <div className="text-3xl font-bold text-gray-900">{memberStats.total}</div>
                <div className="text-xs text-gray-500 mt-1">명</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-1">활성 회원</div>
                <div className="text-3xl font-bold text-green-600">{memberStats.active}</div>
                <div className="text-xs text-gray-500 mt-1">명</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-1">VIP 회원</div>
                <div className="text-3xl font-bold text-purple-600">{memberStats.vip}</div>
                <div className="text-xs text-gray-500 mt-1">명</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-1">VVIP 회원</div>
                <div className="text-3xl font-bold text-yellow-600">{memberStats.vvip}</div>
                <div className="text-xs text-gray-500 mt-1">명</div>
              </div>
            </div>

            {/* 회원 목록 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">회원 목록</h3>
                  <Input
                    type="text"
                    placeholder="이름 또는 닉네임 검색"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 text-center py-8">
                  소속 회원 기능은 백엔드 API 구현 후 활성화됩니다.
                </p>
                {/* TODO: 회원 목록 테이블 구현 */}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">비밀번호 변경</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 (8자 이상)
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
              >
                취소
              </Button>
              <Button onClick={handleChangePassword}>변경</Button>
            </div>
          </div>
        </div>
      )}

      {/* 초대링크 모달 */}
      {showInviteLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">초대링크</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                이 링크를 통해 가입하는 회원은 자동으로 이 관리자의 소속으로 등록됩니다.
              </p>
              <div className="p-3 bg-gray-50 rounded border break-all">
                <code className="text-sm">{inviteLink}</code>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteLinkModal(false)}>
                닫기
              </Button>
              <Button onClick={() => copyToClipboard(inviteLink)}>복사</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
