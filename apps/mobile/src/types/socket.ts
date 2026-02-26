/**
 * Socket.io 이벤트 타입 정의 (백엔드 chat.gateway.ts 일치)
 */

import { ChatMessage } from './chat';

// Client → Server 이벤트
export interface ClientToServerEvents {
  'room:join': (data: { roomId: string }) => void;
  'room:leave': (data: { roomId: string }) => void;
  'room:read': (data: { roomId: string }) => void;
  'room:approve': (data: { roomId: string; userId: string }) => void;

  'message:send': (data: {
    roomId: string;
    content?: string;
    fileUrl?: string;
    fileType?: string;
    fileName?: string;
  }) => void;
  'message:delete': (data: { messageId: string; roomId: string }) => void;
  'message:delete_own': (data: { messageId: string; roomId: string }) => void;
  'message:pin': (data: { roomId: string; messageId: string }) => void;
  'message:unpin': (data: { messageId: string; roomId: string }) => void;

  'typing:start': (data: { roomId: string }) => void;
  'typing:stop': (data: { roomId: string }) => void;

  'participant:force_disconnect': (data: {
    roomId: string;
    userId: string;
  }) => void;
}

// Server → Client 이벤트
export interface ServerToClientEvents {
  'message:new': (data: {
    message: ChatMessage & { sender?: MessageSender };
    timestamp: string;
  }) => void;
  'message:deleted': (data: {
    messageId: string;
    timestamp: string;
  }) => void;
  'message:pinned': (data: {
    messageId: string;
    timestamp: string;
  }) => void;
  'message:unpinned': (data: {
    messageId: string;
    timestamp: string;
  }) => void;

  'room:user_joined': (data: {
    roomId: string;
    userId: string;
    userType: string;
    timestamp: string;
  }) => void;
  'room:user_left': (data: {
    roomId: string;
    userId: string;
    userType: string;
    timestamp: string;
  }) => void;
  'room:user_read': (data: {
    roomId: string;
    userId: string;
    lastReadAt: string;
  }) => void;
  'room:kicked': (data: {
    roomId: string;
    timestamp: string;
  }) => void;
  'room:approved': (data: {
    roomId: string;
    timestamp: string;
  }) => void;

  'typing:user_typing': (data: {
    roomId: string;
    userId: string;
  }) => void;
  'typing:user_stopped': (data: {
    roomId: string;
    userId: string;
  }) => void;

  'user:status_changed': (data: {
    userId: string;
    isOnline: boolean;
    timestamp: string;
  }) => void;

  error: (error: {
    message: string;
    code?: string;
  }) => void;
}

// 메시지 발신자 정보
export interface MessageSender {
  id: string;
  name: string;
  profileImage?: string | null;
  isAdmin: boolean;
}
