/**
 * 권한 체크 Hook (백엔드 ChatParticipant.ownerType 기반)
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/store';
import { ChatRoom, OwnerType } from '@/types';

export const usePermission = (room?: ChatRoom) => {
  const { user } = useAuthStore();

  // 내 역할 계산 (participants 배열에서 ownerType 조회)
  const myRole = useMemo<OwnerType>(() => {
    if (!room || !user) return 'MEMBER';

    const me = room.participants?.find((p) => p.userId === user.id);
    return me?.ownerType || 'MEMBER';
  }, [room, user]);

  // 역할 확인
  const isOwner = myRole === 'OWNER';
  const isViceOwner = myRole === 'VICE_OWNER';
  const isAdmin = isOwner || isViceOwner;

  // 메시지 전송 가능 여부
  const canSendMessage = useMemo(() => {
    if (!room) return false;

    // TWO_WAY, ONE_TO_ONE — 모두 가능
    if (room.type === 'TWO_WAY' || room.type === 'ONE_TO_ONE') return true;

    // ONE_TO_N 방송 — 방장/부방장만 가능
    if (room.type === 'ONE_TO_N') return isAdmin;

    return false;
  }, [room, isAdmin]);

  // 이모지 반응 가능 여부 (모두 가능)
  const canReact = useMemo(() => {
    if (!room) return false;
    return true;
  }, [room]);

  // 공지사항 수정 가능 여부
  const canEditNotice = isAdmin;

  // 멤버 관리 가능 여부 (초대/강퇴)
  const canManageMembers = isAdmin;

  // 채팅방 설정 변경 가능 여부
  const canEditRoom = isOwner;

  // 채팅방 삭제 가능 여부
  const canDeleteRoom = isOwner;

  return {
    myRole,
    isOwner,
    isViceOwner,
    isAdmin,
    canSendMessage,
    canReact,
    canEditNotice,
    canManageMembers,
    canEditRoom,
    canDeleteRoom,
  };
};
