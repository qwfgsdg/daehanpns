/**
 * Socket.io 이벤트 핸들러 (백엔드 chat.gateway.ts 이벤트명 일치)
 */

import { getSocket } from './client';
import { useChatStore } from '@/store';
import { ChatMessage } from '@/types';

/**
 * 채팅 이벤트 핸들러 설정
 */
export const setupChatHandlers = () => {
  const socket = getSocket();
  const chatStore = useChatStore.getState();

  // 새 메시지 수신
  socket.on('message:new', ({ message, timestamp }) => {
    console.log('New message:', message.id);
    chatStore.addMessage(message.roomId, message);

    // 현재 보고 있는 방이 아니면 unread 증가
    if (chatStore.currentRoomId !== message.roomId) {
      const room = chatStore.rooms.find((r) => r.id === message.roomId);
      if (room) {
        chatStore.updateRoom(message.roomId, {
          unreadCount: (room.unreadCount || 0) + 1,
          lastMessage: message,
        });
      }
    }
  });

  // 메시지 삭제
  socket.on('message:deleted', ({ messageId }) => {
    const roomId = chatStore.currentRoomId;
    if (roomId) {
      chatStore.updateMessage(roomId, messageId, { isDeleted: true });
    }
  });

  // 메시지 고정
  socket.on('message:pinned', ({ messageId }) => {
    console.log('Message pinned:', messageId);
  });

  // 메시지 고정 해제
  socket.on('message:unpinned', ({ messageId }) => {
    console.log('Message unpinned:', messageId);
  });

  // 읽음 처리
  socket.on('room:user_read', ({ roomId, userId, lastReadAt }) => {
    console.log('User read:', userId, 'in room:', roomId);
  });

  // 타이핑 중
  socket.on('typing:user_typing', ({ roomId, userId }) => {
    // userId로 userName 매핑 필요 — 참여자 목록에서 조회
    const room = chatStore.rooms.find((r) => r.id === roomId);
    const participant = room?.participants?.find((p) => p.userId === userId);
    const userName = participant?.user?.nickname || participant?.user?.name || userId;
    chatStore.addTypingUser(roomId, userName);
  });

  // 타이핑 중지
  socket.on('typing:user_stopped', ({ roomId, userId }) => {
    const room = chatStore.rooms.find((r) => r.id === roomId);
    const participant = room?.participants?.find((p) => p.userId === userId);
    const userName = participant?.user?.nickname || participant?.user?.name || userId;
    chatStore.removeTypingUser(roomId, userName);
  });

  // 사용자 입장
  socket.on('room:user_joined', ({ roomId, userId, userType, timestamp }) => {
    if (chatStore.currentRoomId === roomId) {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        roomId,
        senderId: 'system',
        senderType: 'USER',
        type: 'SYSTEM',
        content: `사용자가 입장하셨습니다`,
        isDeleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      chatStore.addMessage(roomId, systemMessage);
    }
  });

  // 사용자 퇴장
  socket.on('room:user_left', ({ roomId, userId, userType, timestamp }) => {
    if (chatStore.currentRoomId === roomId) {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        roomId,
        senderId: 'system',
        senderType: 'USER',
        type: 'SYSTEM',
        content: `사용자가 퇴장하셨습니다`,
        isDeleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      chatStore.addMessage(roomId, systemMessage);
    }
  });

  // 강퇴됨
  socket.on('room:kicked', ({ roomId }) => {
    console.log('Kicked from room:', roomId);
    chatStore.removeRoom(roomId);
  });

  // 입장 승인됨
  socket.on('room:approved', ({ roomId }) => {
    console.log('Approved in room:', roomId);
  });

  // 유저 온라인 상태 변경
  socket.on('user:status_changed', ({ userId, isOnline }) => {
    console.log('User status changed:', userId, isOnline);
  });

  // 에러 처리
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};

/**
 * 채팅 이벤트 핸들러 정리
 */
export const cleanupChatHandlers = () => {
  const socket = getSocket();

  socket.off('message:new');
  socket.off('message:deleted');
  socket.off('message:pinned');
  socket.off('message:unpinned');
  socket.off('room:user_joined');
  socket.off('room:user_left');
  socket.off('room:user_read');
  socket.off('room:kicked');
  socket.off('room:approved');
  socket.off('typing:user_typing');
  socket.off('typing:user_stopped');
  socket.off('user:status_changed');
  socket.off('error');
};

/**
 * 메시지 전송
 */
export const sendMessage = (
  roomId: string,
  content: string,
  fileUrl?: string,
  fileType?: string,
  fileName?: string
) => {
  const socket = getSocket();
  socket.emit('message:send', {
    roomId,
    content,
    fileUrl,
    fileType,
    fileName,
  });
};

/**
 * 내 메시지 삭제
 */
export const deleteOwnMessage = (messageId: string, roomId: string) => {
  const socket = getSocket();
  socket.emit('message:delete_own', { messageId, roomId });
};

/**
 * 메시지 고정
 */
export const pinMessage = (roomId: string, messageId: string) => {
  const socket = getSocket();
  socket.emit('message:pin', { roomId, messageId });
};

/**
 * 메시지 고정 해제
 */
export const unpinMessage = (messageId: string, roomId: string) => {
  const socket = getSocket();
  socket.emit('message:unpin', { messageId, roomId });
};

/**
 * 타이핑 시작
 */
export const startTyping = (roomId: string) => {
  const socket = getSocket();
  socket.emit('typing:start', { roomId });
};

/**
 * 타이핑 중지
 */
export const stopTyping = (roomId: string) => {
  const socket = getSocket();
  socket.emit('typing:stop', { roomId });
};

/**
 * 읽음 처리
 */
export const markAsRead = (roomId: string) => {
  const socket = getSocket();
  socket.emit('room:read', { roomId });
};
