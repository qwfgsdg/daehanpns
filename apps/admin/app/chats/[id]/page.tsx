'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TabType = 'participants' | 'messages' | 'pinned' | 'info';

export default function ChatDetailPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [chat, setChat] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('participants');

  // 참가자 관련
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsTotal, setParticipantsTotal] = useState(0);
  const [participantSearch, setParticipantSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [newParticipantRole, setNewParticipantRole] = useState('MEMBER');

  // 메시지 관련
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesCursor, setMessagesCursor] = useState<string | undefined>();
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageKeyword, setMessageKeyword] = useState('');
  const [messageStartDate, setMessageStartDate] = useState('');
  const [messageEndDate, setMessageEndDate] = useState('');
  const [messageSenderId, setMessageSenderId] = useState('');
  const [messageHasFile, setMessageHasFile] = useState<boolean | undefined>();
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [expandedDeletedMessages, setExpandedDeletedMessages] = useState<Set<string>>(new Set());

  // 고정 메시지 관련
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);

  // 모달 상태
  const [showKickModal, setShowKickModal] = useState(false);
  const [kickTarget, setKickTarget] = useState<any>(null);
  const [kickReason, setKickReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    image: '',
    maxParticipants: '',
  });

  // 무한 스크롤 ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver>();

  const lastMessageElementRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreMessages) {
        loadMoreMessages();
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMoreMessages]);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadChat();
  }, [roomId, router]);

  useEffect(() => {
    if (activeTab === 'participants') {
      loadParticipants();
    } else if (activeTab === 'messages') {
      loadMessages();
    } else if (activeTab === 'pinned') {
      loadPinnedMessages();
    }
  }, [activeTab]);

  const loadChat = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getChat(roomId);
      setChat(data);
      setEditForm({
        name: data.name || '',
        description: data.description || '',
        image: data.image || '',
        maxParticipants: data.maxParticipants?.toString() || '',
      });
    } catch (error) {
      console.error('Failed to load chat:', error);
      alert('채팅방 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const ownerType = roleFilter === 'OWNER' ? 'OWNER' : roleFilter === 'VICE_OWNER' ? 'VICE_OWNER' : roleFilter === 'MEMBER' ? 'MEMBER' : undefined;
      const isKicked = statusFilter === 'kicked' ? true : undefined;
      const isShadowBanned = statusFilter === 'shadowbanned' ? true : undefined;

      const response = await ApiClient.getParticipants(roomId, {
        search: participantSearch || undefined,
        ownerType,
        isKicked,
        isShadowBanned,
        take: 50,
      });
      setParticipants(response.participants);
      setParticipantsTotal(response.total);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await ApiClient.getMessages(roomId, {
        limit: 50,
        keyword: messageKeyword || undefined,
        startDate: messageStartDate || undefined,
        endDate: messageEndDate || undefined,
        senderId: messageSenderId || undefined,
        hasFile: messageHasFile,
        includeDeleted,
      });
      setMessages(response.messages);
      setMessagesCursor(response.nextCursor);
      setHasMoreMessages(response.hasMore);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadMoreMessages = async () => {
    if (!messagesCursor) return;

    try {
      const response = await ApiClient.getMessages(roomId, {
        cursor: messagesCursor,
        limit: 50,
        keyword: messageKeyword || undefined,
        startDate: messageStartDate || undefined,
        endDate: messageEndDate || undefined,
        senderId: messageSenderId || undefined,
        hasFile: messageHasFile,
        includeDeleted,
      });
      setMessages(prev => [...prev, ...response.messages]);
      setMessagesCursor(response.nextCursor);
      setHasMoreMessages(response.hasMore);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    }
  };

  const loadPinnedMessages = async () => {
    try {
      const response = await ApiClient.getPinnedMessages(roomId);
      setPinnedMessages(response.pinnedMessages);
    } catch (error) {
      console.error('Failed to load pinned messages:', error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!confirm(`역할을 ${newRole === 'OWNER' ? '방장' : newRole === 'VICE_OWNER' ? '부방장' : '일반'}으로 변경하시겠습니까?`)) return;

    try {
      await ApiClient.changeRole(roomId, userId, newRole);
      alert('역할이 변경되었습니다.');
      loadParticipants();
    } catch (error) {
      console.error('Failed to change role:', error);
      alert('역할 변경에 실패했습니다.');
    }
  };

  const handleKick = async () => {
    if (!kickReason.trim()) {
      alert('강퇴 사유를 입력해주세요.');
      return;
    }

    try {
      await ApiClient.kickParticipant(roomId, kickTarget.user.id, kickReason);
      alert('강퇴되었습니다.');
      setShowKickModal(false);
      setKickTarget(null);
      setKickReason('');
      loadParticipants();
      loadChat();
    } catch (error: any) {
      console.error('Failed to kick participant:', error);
      alert(error.message || '강퇴에 실패했습니다.');
    }
  };

  const handleUnkick = async (userId: string) => {
    if (!confirm('강퇴를 해제하시겠습니까?')) return;

    try {
      await ApiClient.unkickParticipant(roomId, userId);
      alert('강퇴가 해제되었습니다.');
      loadParticipants();
      loadChat();
    } catch (error) {
      console.error('Failed to unkick participant:', error);
      alert('강퇴 해제에 실패했습니다.');
    }
  };

  const handleShadowBan = async (userId: string) => {
    if (!confirm('이 회원을 쉐도우밴 하시겠습니까?')) return;

    try {
      await ApiClient.shadowBanParticipant(roomId, userId);
      alert('쉐도우밴이 설정되었습니다.');
      loadParticipants();
      loadChat();
    } catch (error) {
      console.error('Failed to shadow ban participant:', error);
      alert('쉐도우밴 설정에 실패했습니다.');
    }
  };

  const handleUnshadowBan = async (userId: string) => {
    if (!confirm('쉐도우밴을 해제하시겠습니까?')) return;

    try {
      await ApiClient.unshadowBanParticipant(roomId, userId);
      alert('쉐도우밴이 해제되었습니다.');
      loadParticipants();
      loadChat();
    } catch (error) {
      console.error('Failed to unshadow ban participant:', error);
      alert('쉐도우밴 해제에 실패했습니다.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('이 메시지를 삭제하시겠습니까? (되돌릴 수 없음)')) return;

    try {
      await ApiClient.deleteMessage(roomId, messageId);
      alert('메시지가 삭제되었습니다.');
      loadMessages();
      loadChat();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('메시지 삭제에 실패했습니다.');
    }
  };

  const handleBulkDeleteMessages = async () => {
    if (selectedMessageIds.length === 0) {
      alert('삭제할 메시지를 선택해주세요.');
      return;
    }

    if (selectedMessageIds.length > 100) {
      alert('한 번에 최대 100개까지 삭제할 수 있습니다.');
      return;
    }

    if (!confirm(`정말로 ${selectedMessageIds.length}개의 메시지를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      await ApiClient.bulkDeleteMessages(roomId, selectedMessageIds);
      alert('메시지가 삭제되었습니다.');
      setSelectedMessageIds([]);
      loadMessages();
      loadChat();
    } catch (error) {
      console.error('Failed to bulk delete messages:', error);
      alert('메시지 삭제에 실패했습니다.');
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await ApiClient.pinMessage(roomId, messageId);
      alert('메시지가 고정되었습니다.');
      loadMessages();
      loadPinnedMessages();
    } catch (error: any) {
      console.error('Failed to pin message:', error);
      alert(error.message || '메시지 고정에 실패했습니다.');
    }
  };

  const handleUnpinMessage = async (pinnedMessageId: string) => {
    if (!confirm('고정을 해제하시겠습니까?')) return;

    try {
      await ApiClient.unpinMessage(roomId, pinnedMessageId);
      alert('고정이 해제되었습니다.');
      loadPinnedMessages();
    } catch (error) {
      console.error('Failed to unpin message:', error);
      alert('고정 해제에 실패했습니다.');
    }
  };

  const handleUpdateChat = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await ApiClient.updateChat(roomId, {
        name: editForm.name || undefined,
        description: editForm.description || undefined,
        image: editForm.image || undefined,
        maxParticipants: editForm.maxParticipants ? parseInt(editForm.maxParticipants) : undefined,
      });
      alert('채팅방 정보가 수정되었습니다.');
      setShowEditModal(false);
      loadChat();
    } catch (error) {
      console.error('Failed to update chat:', error);
      alert('채팅방 정보 수정에 실패했습니다.');
    }
  };

  const handleToggleActive = async () => {
    if (!confirm(chat.isActive ? '비활성화하시겠습니까?' : '활성화하시겠습니까?')) return;

    try {
      if (chat.isActive) {
        await ApiClient.deactivateChat(roomId);
      } else {
        await ApiClient.activateChat(roomId);
      }
      alert(chat.isActive ? '비활성화되었습니다.' : '활성화되었습니다.');
      loadChat();
    } catch (error) {
      console.error('Failed to toggle active:', error);
      alert('활성화 상태 변경에 실패했습니다.');
    }
  };

  const searchUsers = async (search: string) => {
    if (!search.trim()) return;

    try {
      const response = await ApiClient.getUsers({ search, take: 20 });
      setAvailableUsers(response.users);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleAddParticipants = async () => {
    if (selectedUserIds.length === 0) {
      alert('참가자를 선택해주세요.');
      return;
    }

    try {
      await ApiClient.addParticipants(roomId, {
        userIds: selectedUserIds,
        ownerType: newParticipantRole,
      });
      alert('참가자가 추가되었습니다.');
      setShowAddParticipantModal(false);
      setSelectedUserIds([]);
      setAvailableUsers([]);
      loadParticipants();
      loadChat();
    } catch (error: any) {
      console.error('Failed to add participants:', error);
      alert(error.message || '참가자 추가에 실패했습니다.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ko-KR');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    if (phone.includes('-') || phone.includes('*')) return phone;
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  const toggleExpandedDeletedMessage = (messageId: string) => {
    const newSet = new Set(expandedDeletedMessages);
    if (newSet.has(messageId)) {
      newSet.delete(messageId);
    } else {
      newSet.add(messageId);
    }
    setExpandedDeletedMessages(newSet);
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

  if (!chat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">채팅방을 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/chats')} className="mt-4">
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
            채팅방 상세 - {chat.name || '(이름 없음)'}
          </h1>
          <Button variant="outline" onClick={() => router.push('/chats')}>
            목록으로
          </Button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">총 참가자</div>
            <div className="text-2xl font-bold">{chat.stats?.totalParticipants || 0}명</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">오늘 메시지</div>
            <div className="text-2xl font-bold">{chat.stats?.todayMessages || 0}개</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">7일 메시지</div>
            <div className="text-2xl font-bold">{chat.stats?.last7DaysMessages || 0}개</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">강퇴 인원</div>
            <div className="text-2xl font-bold text-red-600">{chat.stats?.kickedCount || 0}명</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">쉐도우밴</div>
            <div className="text-2xl font-bold text-orange-600">{chat.stats?.shadowBannedCount || 0}명</div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-8">
              <button
                onClick={() => setActiveTab('participants')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'participants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                참가자 관리
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'messages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                메시지 관리
              </button>
              <button
                onClick={() => setActiveTab('pinned')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pinned'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                고정 메시지
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                채팅방 정보
              </button>
            </nav>
          </div>
        </div>

        {/* 탭 1: 참가자 관리 */}
        {activeTab === 'participants' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">참가자 목록</h2>
                <Button onClick={() => setShowAddParticipantModal(true)}>
                  참가자 추가
                </Button>
              </div>

              {/* 필터 */}
              <div className="mb-4 flex gap-4">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">전체 역할</option>
                  <option value="OWNER">방장</option>
                  <option value="VICE_OWNER">부방장</option>
                  <option value="MEMBER">일반</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">전체 상태</option>
                  <option value="normal">정상</option>
                  <option value="kicked">강퇴됨</option>
                  <option value="shadowbanned">쉐도우밴</option>
                </select>
                <Input
                  type="text"
                  placeholder="회원 이름/닉네임 검색"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={loadParticipants}>검색</Button>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        프로필
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        닉네임
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        역할
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가입일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                            {participant.user.profileImage ? (
                              <img src={participant.user.profileImage} alt="" className="h-10 w-10 rounded-full" />
                            ) : (
                              participant.user.name?.charAt(0) || '?'
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {participant.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.user.nickname || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={participant.ownerType}
                            onChange={(e) => handleChangeRole(participant.user.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={participant.isKicked}
                          >
                            <option value="OWNER">방장</option>
                            <option value="VICE_OWNER">부방장</option>
                            <option value="MEMBER">일반</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {participant.isKicked ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">강퇴됨</span>
                          ) : participant.isShadowBanned ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">쉐도우밴</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">정상</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(participant.joinedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          {participant.isKicked ? (
                            <Button
                              variant="outline"
                              className="text-xs py-1 px-2"
                              onClick={() => handleUnkick(participant.user.id)}
                            >
                              해제
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                className="text-xs py-1 px-2"
                                onClick={() => {
                                  setKickTarget(participant);
                                  setShowKickModal(true);
                                }}
                              >
                                강퇴
                              </Button>
                              {participant.isShadowBanned ? (
                                <Button
                                  variant="outline"
                                  className="text-xs py-1 px-2"
                                  onClick={() => handleUnshadowBan(participant.user.id)}
                                >
                                  쉐도우밴 해제
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="text-xs py-1 px-2"
                                  onClick={() => handleShadowBan(participant.user.id)}
                                >
                                  쉐도우밴
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 메시지 관리 */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">메시지 목록</h2>
                <Button
                  onClick={handleBulkDeleteMessages}
                  disabled={selectedMessageIds.length === 0}
                  variant="outline"
                >
                  선택 삭제 ({selectedMessageIds.length})
                </Button>
              </div>

              {/* 검색 필터 */}
              <div className="mb-4 space-y-4">
                <div className="flex gap-4">
                  <Input
                    type="text"
                    placeholder="키워드 검색"
                    value={messageKeyword}
                    onChange={(e) => setMessageKeyword(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    placeholder="시작일"
                    value={messageStartDate}
                    onChange={(e) => setMessageStartDate(e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="종료일"
                    value={messageEndDate}
                    onChange={(e) => setMessageEndDate(e.target.value)}
                  />
                  <Button onClick={loadMessages}>검색</Button>
                </div>
                <div className="flex gap-4 items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={messageHasFile === true}
                      onChange={(e) => setMessageHasFile(e.target.checked ? true : undefined)}
                      className="mr-2"
                    />
                    파일 첨부만
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeDeleted}
                      onChange={(e) => setIncludeDeleted(e.target.checked)}
                      className="mr-2"
                    />
                    삭제된 메시지 포함
                  </label>
                </div>
              </div>

              {/* 메시지 목록 */}
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    ref={index === messages.length - 1 ? lastMessageElementRef : null}
                    className={`border rounded-lg p-4 ${message.isDeleted ? 'bg-gray-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMessageIds.includes(message.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMessageIds([...selectedMessageIds, message.id]);
                          } else {
                            setSelectedMessageIds(selectedMessageIds.filter(id => id !== message.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                        {message.sender.profileImage ? (
                          <img src={message.sender.profileImage} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          message.sender.name?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-medium">{message.sender.name}</span>
                            {message.sender.nickname && (
                              <span className="text-sm text-gray-500 ml-2">({message.sender.nickname})</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(message.createdAt)}</span>
                        </div>
                        {message.isDeleted ? (
                          <div>
                            <p className="text-gray-500">삭제된 메시지입니다 (관리자: {message.deletedBy}, {formatDate(message.deletedAt)})</p>
                            {expandedDeletedMessages.has(message.id) && (
                              <p className="text-gray-700 mt-2">{message.content}</p>
                            )}
                            <button
                              onClick={() => toggleExpandedDeletedMessage(message.id)}
                              className="text-blue-600 text-sm mt-1"
                            >
                              {expandedDeletedMessages.has(message.id) ? '숨기기' : '원본 보기'}
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-800">{message.content}</p>
                            {message.fileUrl && (
                              <div className="mt-2 p-2 bg-gray-100 rounded inline-block">
                                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm">
                                  📎 {message.fileName} ({(message.fileSize / 1024 / 1024).toFixed(2)}MB)
                                </a>
                              </div>
                            )}
                            <div className="mt-2 flex gap-2">
                              <Button
                                variant="outline"
                                className="text-xs py-1 px-2"
                                onClick={() => handlePinMessage(message.id)}
                              >
                                고정
                              </Button>
                              <Button
                                variant="outline"
                                className="text-xs py-1 px-2"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                삭제
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {hasMoreMessages && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* 탭 3: 고정 메시지 */}
        {activeTab === 'pinned' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">고정 메시지 ({pinnedMessages.length}/3)</h2>
              {pinnedMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">고정된 메시지가 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {pinnedMessages.map((pinned, index) => (
                    <div key={pinned.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📌</span>
                            <span className="font-medium">{index + 1}.</span>
                          </div>
                          <p className="text-gray-800 mb-2">{pinned.content}</p>
                          <p className="text-sm text-gray-500">
                            고정한 관리자: {pinned.pinnedBy} | {formatDate(pinned.pinnedAt)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="text-xs py-1 px-2"
                          onClick={() => handleUnpinMessage(pinned.id)}
                        >
                          고정 해제
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 4: 채팅방 정보 */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">채팅방 정보</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-500">채팅방 이름</label>
                  <p className="text-base font-medium">{chat.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">채팅방 유형</label>
                  <p className="text-base font-medium">{chat.type === 'ONE_TO_N' ? '1:N' : '1:1'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">설명</label>
                  <p className="text-base font-medium">{chat.description || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">이미지</label>
                  <p className="text-base font-medium">
                    {chat.image ? (
                      <img src={chat.image} alt="" className="h-20 w-20 rounded" />
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">최대 인원</label>
                  <p className="text-base font-medium">{chat.maxParticipants || '무제한'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">생성일</label>
                  <p className="text-base font-medium">{formatDate(chat.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">수정일</label>
                  <p className="text-base font-medium">{formatDate(chat.updatedAt)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowEditModal(true)}>
                  정보 수정
                </Button>
                <Button variant="outline" onClick={handleToggleActive}>
                  {chat.isActive ? '비활성화' : '활성화'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 강퇴 모달 */}
      {showKickModal && kickTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">회원 강퇴</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                회원: <span className="font-medium">{kickTarget.user.name}</span>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                강퇴 사유 (필수)
              </label>
              <textarea
                value={kickReason}
                onChange={(e) => setKickReason(e.target.value)}
                placeholder="강퇴 사유를 입력하세요"
                className="w-full px-3 py-2 border rounded-md resize-none"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowKickModal(false);
                  setKickTarget(null);
                  setKickReason('');
                }}
              >
                취소
              </Button>
              <Button onClick={handleKick}>
                강퇴 실행
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 정보 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">채팅방 정보 수정</h3>
            <form onSubmit={handleUpdateChat} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채팅방 이름
                </label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="채팅방 이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="채팅방 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL
                </label>
                <Input
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  최대 인원
                </label>
                <Input
                  type="number"
                  min="2"
                  value={editForm.maxParticipants}
                  onChange={(e) => setEditForm({ ...editForm, maxParticipants: e.target.value })}
                  placeholder="무제한"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  취소
                </Button>
                <Button type="submit">
                  저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 참가자 추가 모달 */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">참가자 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회원 검색
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="회원 이름 또는 전화번호"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchUsers((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                  <Button onClick={(e) => {
                    const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                    searchUsers(input.value);
                  }}>
                    검색
                  </Button>
                </div>
              </div>

              {availableUsers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    검색 결과
                  </label>
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {availableUsers.map((user) => (
                      <label key={user.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, user.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                            }
                          }}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{formatPhone(user.phone)}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  역할
                </label>
                <select
                  value={newParticipantRole}
                  onChange={(e) => setNewParticipantRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="MEMBER">일반</option>
                  <option value="VICE_OWNER">부방장</option>
                  <option value="OWNER">방장</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddParticipantModal(false);
                    setSelectedUserIds([]);
                    setAvailableUsers([]);
                  }}
                >
                  취소
                </Button>
                <Button onClick={handleAddParticipants}>
                  추가 ({selectedUserIds.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
