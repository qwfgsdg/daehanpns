/**
 * 채팅 타입 정의
 */

export type ChatRoomType = '1:1' | '1:N';

export type ChatMemberRole = 'MASTER' | 'LEADER' | 'CO_LEADER' | 'MEMBER';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;          // 1:1 자유 or 1:N 방송
  isPublic: boolean;           // 공개방 여부
  masterId: string;            // 마스터 ID
  leaderIds: string[];         // 방장 IDs
  coLeaderIds: string[];       // 부방장 IDs
  memberIds: string[];         // 전체 멤버 IDs
  notice?: string;             // 공지사항
  lastMessage?: ChatMessage;
  unreadCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType?: 'USER' | 'ADMIN';
  senderRole: ChatMemberRole;  // 역할 (뱃지 표시용)
  type: MessageType;
  content: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  reactions?: EmojiReaction[]; // 이모지 반응
  sender?: {
    id: string;
    name: string;
    profileImage?: string;
    isAdmin: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmojiReaction {
  emoji: '👍' | '❤️' | '😊' | '🎉' | '👏';
  userId: string;
  userName: string;
  createdAt: string;
}

export interface SystemMessageData {
  type: 'JOIN' | 'LEAVE' | 'ROLE_CHANGE';
  userName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatMember {
  userId: string;
  userName: string;
  role: ChatMemberRole;
  profileImage?: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  userName: string;
}
