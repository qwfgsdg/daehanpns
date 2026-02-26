/**
 * 채팅 타입 정의 (백엔드 Prisma 모델 일치)
 */

export type ChatRoomType = 'ONE_TO_N' | 'ONE_TO_ONE' | 'TWO_WAY';

export type RoomCategory = 'STOCK' | 'COIN';

export type OwnerType = 'OWNER' | 'VICE_OWNER' | 'MEMBER';

export type SenderType = 'USER' | 'ADMIN';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  category: RoomCategory;
  description?: string;
  image?: string;
  isActive: boolean;
  maxParticipants?: number;
  participants?: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  memberCount: number;
  notice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  id: string;
  roomId: string;
  userId: string;
  ownerType: OwnerType;
  joinedAt: string;
  lastReadAt?: string;
  leftAt?: string;
  isKicked: boolean;
  isShadowBanned: boolean;
  user?: {
    id: string;
    name: string;
    nickname?: string;
    profileImage?: string;
  };
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isDeleted: boolean;
  type: MessageType;
  reactions?: EmojiReaction[];
  sender?: {
    id: string;
    name: string;
    profileImage?: string;
    isAdmin: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatPinnedMessage {
  id: string;
  roomId: string;
  messageId: string;
  content: string;
  pinnedBy: string;
  pinnedAt: string;
}

export interface EmojiReaction {
  emoji: string;
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

export interface TypingIndicator {
  roomId: string;
  userId: string;
  userName: string;
}
