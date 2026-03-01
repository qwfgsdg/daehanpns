/**
 * 채팅 관련 Hook
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useChatStore, useAuthStore } from '@/store';
import { getChatRooms, getChatMessages, getPublicChatRooms, leaveRoom as leaveRoomApi } from '@/lib/api';
import {
  initSocket,
  setupChatHandlers,
  cleanupChatHandlers,
  disconnectSocket,
  joinRoom,
  leaveRoom as leaveRoomSocket,
} from '@/lib/socket';

export const useChat = (roomId?: string) => {
  const {
    rooms,
    messages,
    currentRoomId,
    typingUsers,
    hasMoreMessages,
    setRooms,
    setMessages,
    setCurrentRoom,
    prependMessages,
    setHasMore,
    removeRoom,
  } = useChatStore();

  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const socketInitRef = useRef<Promise<any> | null>(null);

  // Socket 초기화 (로그인 시)
  useEffect(() => {
    if (isAuthenticated) {
      const init = async () => {
        try {
          socketInitRef.current = initSocket();
          await socketInitRef.current;
          setupChatHandlers();
          setSocketReady(true);
        } catch (err) {
          console.error('Socket init failed:', err);
        }
      };
      init();

      return () => {
        cleanupChatHandlers();
        disconnectSocket();
        setSocketReady(false);
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
          // 무한 스크롤: 기존 메시지 앞에 추가 (중복 제거됨)
          prependMessages(roomId, data);
        }
        // 응답 개수가 limit 미만이면 더 이상 메시지 없음
        if (data.length < limit) {
          setHasMore(roomId, false);
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
    [setMessages, prependMessages, setHasMore]
  );

  // 현재 방 입장 (소켓 준비 후)
  useEffect(() => {
    if (roomId) {
      setCurrentRoom(roomId);
      loadMessages(roomId);

      // 소켓이 준비되면 방 입장
      if (socketReady) {
        joinRoom(roomId);
      } else if (socketInitRef.current) {
        socketInitRef.current.then(() => joinRoom(roomId)).catch(() => {});
      }

      return () => {
        leaveRoomSocket(roomId);
      };
    } else {
      setCurrentRoom(null);
    }
  }, [roomId, socketReady, setCurrentRoom, loadMessages]);

  // 현재 방 정보 (rooms가 배열이 아닐 경우 방어)
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const currentRoom = safeRooms.find((r) => r.id === currentRoomId);
  const currentMessages = currentRoomId ? messages[currentRoomId] || [] : [];
  const currentTypingUsers = currentRoomId
    ? typingUsers[currentRoomId] || []
    : [];

  const hasMore = currentRoomId ? hasMoreMessages[currentRoomId] !== false : true;

  // 채팅방 나가기 (REST API + Socket + Store 제거)
  const handleLeaveRoom = useCallback(async (targetRoomId: string) => {
    await leaveRoomApi(targetRoomId);
    leaveRoomSocket(targetRoomId);
    removeRoom(targetRoomId);
  }, [removeRoom]);

  return {
    rooms: safeRooms,
    currentRoom,
    currentMessages,
    currentTypingUsers,
    hasMore,
    isLoading,
    error,
    loadRooms,
    loadPublicRooms,
    loadMessages,
    handleLeaveRoom,
  };
};
