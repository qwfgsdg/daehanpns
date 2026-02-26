/**
 * 채팅 관련 Hook
 */

import { useEffect, useState, useCallback } from 'react';
import { useChatStore, useAuthStore } from '@/store';
import { getChatRooms, getChatMessages, getPublicChatRooms } from '@/lib/api';
import {
  initSocket,
  setupChatHandlers,
  cleanupChatHandlers,
  disconnectSocket,
  joinRoom,
  leaveRoom,
} from '@/lib/socket';

export const useChat = (roomId?: string) => {
  const {
    rooms,
    messages,
    currentRoomId,
    typingUsers,
    setRooms,
    setMessages,
    setCurrentRoom,
    prependMessages,
  } = useChatStore();

  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Socket 초기화 (로그인 시)
  useEffect(() => {
    if (isAuthenticated) {
      const init = async () => {
        try {
          await initSocket();
          setupChatHandlers();
        } catch (err) {
          console.error('Socket init failed:', err);
        }
      };
      init();

      return () => {
        cleanupChatHandlers();
        disconnectSocket();
      };
    }
  }, [isAuthenticated]);

  // 채팅방 목록 로드
  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getChatRooms();
      setRooms(data);
    } catch (err) {
      setError('채팅방 목록을 불러오지 못했습니다');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [setRooms]);

  // 공개 채팅방 목록 로드
  const loadPublicRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicChatRooms();
      return data;
    } catch (err) {
      setError('공개 채팅방 목록을 불러오지 못했습니다');
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 메시지 로드
  const loadMessages = useCallback(
    async (roomId: string, offset = 0, limit = 50) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getChatMessages(roomId, offset, limit);
        if (offset === 0) {
          setMessages(roomId, data);
        } else {
          // 무한 스크롤: 기존 메시지 앞에 추가
          prependMessages(roomId, data);
        }
        return data;
      } catch (err) {
        setError('메시지를 불러오지 못했습니다');
        console.error(err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [setMessages, prependMessages]
  );

  // 현재 방 입장
  useEffect(() => {
    if (roomId) {
      setCurrentRoom(roomId);
      joinRoom(roomId);
      loadMessages(roomId);

      return () => {
        leaveRoom(roomId);
      };
    } else {
      setCurrentRoom(null);
    }
  }, [roomId, setCurrentRoom, loadMessages]);

  // 현재 방 정보
  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const currentMessages = currentRoomId ? messages[currentRoomId] || [] : [];
  const currentTypingUsers = currentRoomId
    ? typingUsers[currentRoomId] || []
    : [];

  return {
    rooms,
    currentRoom,
    currentMessages,
    currentTypingUsers,
    isLoading,
    error,
    loadRooms,
    loadPublicRooms,
    loadMessages,
  };
};
