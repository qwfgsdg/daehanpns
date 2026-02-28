/**
 * Socket.io 클라이언트 (백엔드 chat.gateway.ts 이벤트명 일치)
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_CONFIG } from '@/constants';
import { useSocketStore } from '@/store';
import { getAccessToken } from '@/lib/auth/storage';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

/**
 * Socket 초기화 및 연결
 */
export const initSocket = async (): Promise<TypedSocket> => {
  if (socket?.connected) {
    return socket;
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
    reconnectionDelayMax: SOCKET_CONFIG.RECONNECTION_DELAY_MAX,
    reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
  }) as TypedSocket;

  // 연결 이벤트
  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    useSocketStore.getState().setConnected(true);
    useSocketStore.getState().resetReconnectAttempts();
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    useSocketStore.getState().setConnected(false);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    useSocketStore.getState().incrementReconnectAttempts();
    useSocketStore.getState().setError(error.message);
  });

  (socket.io as any).on('reconnect', (attemptNumber: number) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    useSocketStore.getState().resetReconnectAttempts();
  });

  (socket.io as any).on('reconnect_failed', () => {
    console.error('Socket reconnection failed');
    useSocketStore.getState().setError('재연결에 실패했습니다');
  });

  return socket;
};

/**
 * Socket 인스턴스 가져오기
 */
export const getSocket = (): TypedSocket | null => {
  return socket;
};

/**
 * Socket 연결 종료
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    useSocketStore.getState().setConnected(false);
  }
};

/**
 * Socket 연결 상태 확인
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};

/**
 * 방에 입장
 */
export const joinRoom = (roomId: string): void => {
  const s = getSocket();
  if (s) s.emit('room:join', { roomId });
};

/**
 * 방에서 퇴장
 */
export const leaveRoom = (roomId: string): void => {
  const s = getSocket();
  if (s) s.emit('room:leave', { roomId });
};
