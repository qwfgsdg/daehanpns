'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/contexts/SocketContext';
import { ApiClient } from '@/lib/api';

interface ChatHeaderProps {
  room: any;
}

interface Participant {
  id: string;
  userId: string;
  ownerType: string;
  isKicked: boolean;
  isShadowBanned: boolean;
  kickReason?: string;
  user?: {
    id: string;
    name: string;
    nickname?: string;
    profileImage?: string;
  };
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  ONE_TO_N: '1:N 방송',
  ONE_TO_ONE: '1:1',
  TWO_WAY: '양방향',
};

const OWNER_TYPE_LABELS: Record<string, string> = {
  OWNER: '방장',
  VICE_OWNER: '부방장',
  MEMBER: '멤버',
};

export function ChatHeader({ room }: ChatHeaderProps) {
  const router = useRouter();
  const { forceDisconnectParticipant } = useSocket();
  const [showPanel, setShowPanel] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [kickModal, setKickModal] = useState<{ userId: string; name: string } | null>(null);
  const [kickReason, setKickReason] = useState('');

  const loadParticipants = useCallback(async () => {
    if (!room?.id) return;
    setIsLoading(true);
    try {
      const result = await ApiClient.getParticipants(room.id);
      setParticipants(result.participants || result || []);
    } catch (error) {
      console.error('Failed to load participants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [room?.id]);

  useEffect(() => {
    if (showPanel) {
      loadParticipants();
    }
  }, [showPanel, loadParticipants]);

  const handleKick = async () => {
    if (!kickModal || !kickReason.trim()) return;
    try {
      await ApiClient.kickParticipant(room.id, kickModal.userId, kickReason);
      forceDisconnectParticipant(room.id, kickModal.userId);
      setKickModal(null);
      setKickReason('');
      loadParticipants();
    } catch (error) {
      console.error('Failed to kick participant:', error);
      alert('강퇴에 실패했습니다');
    }
  };

  const handleUnkick = async (userId: string) => {
    try {
      await ApiClient.unkickParticipant(room.id, userId);
      loadParticipants();
    } catch (error) {
      console.error('Failed to unkick participant:', error);
    }
  };

  const handleShadowBan = async (userId: string) => {
    try {
      await ApiClient.shadowBanParticipant(room.id, userId);
      loadParticipants();
    } catch (error) {
      console.error('Failed to shadow ban:', error);
    }
  };

  const handleUnshadowBan = async (userId: string) => {
    try {
      await ApiClient.unshadowBanParticipant(room.id, userId);
      loadParticipants();
    } catch (error) {
      console.error('Failed to unshadow ban:', error);
    }
  };

  const filteredParticipants = participants.filter(p => {
    if (!search) return true;
    const name = p.user?.nickname || p.user?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">{room.name || '이름 없음'}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{ROOM_TYPE_LABELS[room.type] || room.type}</span>
              <span>|</span>
              <span>참여자 {room.participants?.length || 0}명</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showPanel
                ? 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            참여자
          </button>
          <button
            onClick={() => router.push(`/chats/${room.id}`)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            관리
          </button>
        </div>
      </div>

      {/* Participant side panel */}
      {showPanel && (
        <div className="bg-white border-b px-4 py-3 max-h-80 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">참여자 목록</h3>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 text-sm">
              닫기
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-full px-3 py-1.5 text-xs border rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          {isLoading ? (
            <div className="text-center py-4 text-xs text-gray-400">로딩 중...</div>
          ) : (
            <div className="space-y-1.5">
              {filteredParticipants.map((p) => {
                const name = p.user?.nickname || p.user?.name || '알 수 없음';
                return (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-900 truncate">{name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.ownerType === 'OWNER' ? 'bg-yellow-100 text-yellow-700' :
                        p.ownerType === 'VICE_OWNER' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {OWNER_TYPE_LABELS[p.ownerType] || p.ownerType}
                      </span>
                      {p.isShadowBanned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-medium">
                          쉐도우밴
                        </span>
                      )}
                      {p.isKicked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                          강퇴됨
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.isKicked ? (
                        <button
                          onClick={() => handleUnkick(p.userId)}
                          className="text-[10px] px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          복구
                        </button>
                      ) : (
                        <>
                          {p.isShadowBanned ? (
                            <button
                              onClick={() => handleUnshadowBan(p.userId)}
                              className="text-[10px] px-2 py-1 text-orange-600 hover:bg-orange-50 rounded"
                            >
                              밴해제
                            </button>
                          ) : (
                            p.ownerType === 'MEMBER' && (
                              <button
                                onClick={() => handleShadowBan(p.userId)}
                                className="text-[10px] px-2 py-1 text-orange-500 hover:bg-orange-50 rounded"
                              >
                                쉐도우밴
                              </button>
                            )
                          )}
                          {p.ownerType !== 'OWNER' && (
                            <button
                              onClick={() => setKickModal({ userId: p.userId, name })}
                              className="text-[10px] px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              강퇴
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredParticipants.length === 0 && (
                <div className="text-center py-2 text-xs text-gray-400">참여자가 없습니다</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Kick confirmation modal */}
      {kickModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-80 shadow-xl">
            <h3 className="text-sm font-semibold mb-3">참여자 강퇴</h3>
            <p className="text-xs text-gray-500 mb-3">
              <strong>{kickModal.name}</strong> 님을 강퇴합니다.
            </p>
            <textarea
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
              placeholder="강퇴 사유를 입력하세요"
              rows={3}
              className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 resize-none mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setKickModal(null); setKickReason(''); }}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleKick}
                disabled={!kickReason.trim()}
                className="px-3 py-1.5 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                강퇴
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
