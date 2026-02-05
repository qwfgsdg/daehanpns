import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { RedisService } from '../redis/redis.service';
import { ChatRoom, ChatMessage, ChatType, OwnerType, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create chat room
   */
  async createRoom(data: {
    name: string;
    type: ChatType;
    ownerId: string;
    ownerType: OwnerType;
    isApprovalRequired?: boolean;
    isBidirectional?: boolean;
  }): Promise<ChatRoom> {
    const entryCode = data.type === 'GROUP' ? nanoid(8) : null;

    return this.prisma.chatRoom.create({
      data: {
        name: data.name,
        type: data.type,
        entryCode,
        ownerId: data.ownerId,
        ownerType: data.ownerType,
        isApprovalRequired: data.isApprovalRequired || false,
        isBidirectional: data.isBidirectional !== false,
      },
    });
  }

  /**
   * Get room by ID
   */
  async getRoomById(id: string): Promise<ChatRoom | null> {
    return this.prisma.chatRoom.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: true },
        },
        pinnedMessages: {
          include: { message: true },
        },
      },
    });
  }

  /**
   * Get room by entry code
   */
  async getRoomByEntryCode(entryCode: string): Promise<ChatRoom | null> {
    return this.prisma.chatRoom.findUnique({
      where: { entryCode },
    });
  }

  /**
   * Get all rooms with filters
   */
  async getRooms(params: {
    type?: ChatType;
    ownerId?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ChatRoomWhereInput = {};

    if (params.type) where.type = params.type;
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: { where: { isApproved: true } },
        },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    return { rooms, total };
  }

  /**
   * Update room
   */
  async updateRoom(
    id: string,
    data: Prisma.ChatRoomUpdateInput,
  ): Promise<ChatRoom> {
    return this.prisma.chatRoom.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete room
   */
  async deleteRoom(id: string): Promise<void> {
    await this.prisma.chatRoom.delete({ where: { id } });
  }

  /**
   * Join room
   */
  async joinRoom(roomId: string, userId: string): Promise<any> {
    const room = await this.getRoomById(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    const isApproved = !room.isApprovalRequired;

    return this.prisma.chatParticipant.create({
      data: {
        roomId,
        userId,
        isApproved,
      },
    });
  }

  /**
   * Approve participant join request
   */
  async approveJoin(
    roomId: string,
    userId: string,
    actorId: string,
  ): Promise<any> {
    const updated = await this.prisma.chatParticipant.update({
      where: {
        roomId_userId: { roomId, userId },
      },
      data: { isApproved: true },
    });

    await this.logsService.create({
      actorId,
      actionType: 'CHAT_JOIN_APPROVE',
      targetType: 'chat_room',
      targetId: roomId,
      details: { userId },
    });

    return updated;
  }

  /**
   * Leave room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await this.prisma.chatParticipant.delete({
      where: {
        roomId_userId: { roomId, userId },
      },
    });
  }

  /**
   * Get room participants
   */
  async getParticipants(roomId: string): Promise<any[]> {
    return this.prisma.chatParticipant.findMany({
      where: { roomId, isApproved: true },
      include: { user: true },
    });
  }

  /**
   * Check if user can send message (bidirectional/unidirectional + vice owner check)
   */
  async canSendMessage(
    roomId: string,
    userId: string,
    userType: OwnerType,
  ): Promise<boolean> {
    const room = await this.getRoomById(roomId);

    if (!room) return false;

    // If bidirectional, anyone can send
    if (room.isBidirectional) return true;

    // If unidirectional, only owner or vice owners can send
    if (room.ownerId === userId && room.ownerType === userType) {
      return true;
    }

    // TODO: Check vice owner status
    // For now, only room owner can send in unidirectional mode
    return false;
  }

  /**
   * Create message
   */
  async createMessage(data: {
    roomId: string;
    senderId: string;
    senderType: OwnerType;
    content?: string;
    fileUrl?: string;
    fileType?: string;
    fileName?: string;
  }): Promise<ChatMessage> {
    // Check bad words filter
    if (data.content) {
      const hasBadWord = await this.checkBadWords(data.content);
      if (hasBadWord) {
        throw new Error('Message contains blocked keywords');
      }
    }

    return this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: data.senderId,
        senderType: data.senderType,
        content: data.content,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileName: data.fileName,
      },
    });
  }

  /**
   * Get messages
   */
  async getMessages(params: {
    roomId: string;
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<ChatMessage[]> {
    const where: Prisma.ChatMessageWhereInput = {
      roomId: params.roomId,
      isDeleted: false,
    };

    if (params.search) {
      where.content = { contains: params.search, mode: 'insensitive' };
    }

    return this.prisma.chatMessage.findMany({
      where,
      skip: params.skip || 0,
      take: params.take || 50,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, nickname: true, profileImageUrl: true },
        },
      },
    });
  }

  /**
   * Delete message
   */
  async deleteMessage(id: string): Promise<ChatMessage> {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Pin message
   */
  async pinMessage(
    roomId: string,
    messageId: string,
    pinnedBy: string,
  ): Promise<any> {
    return this.prisma.chatPinnedMessage.create({
      data: { roomId, messageId, pinnedBy },
    });
  }

  /**
   * Unpin message
   */
  async unpinMessage(messageId: string): Promise<void> {
    await this.prisma.chatPinnedMessage.deleteMany({
      where: { messageId },
    });
  }

  /**
   * Get pinned messages
   */
  async getPinnedMessages(roomId: string): Promise<any[]> {
    return this.prisma.chatPinnedMessage.findMany({
      where: { roomId },
      include: { message: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check bad words filter
   */
  async checkBadWords(content: string): Promise<boolean> {
    const keywords = await this.prisma.blockedKeyword.findMany();
    return keywords.some((k) => content.includes(k.keyword));
  }

  /**
   * Add blocked keyword
   */
  async addBlockedKeyword(keyword: string, createdBy: string): Promise<any> {
    return this.prisma.blockedKeyword.create({
      data: { keyword, createdBy },
    });
  }

  /**
   * Get blocked keywords
   */
  async getBlockedKeywords(): Promise<any[]> {
    return this.prisma.blockedKeyword.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete blocked keyword
   */
  async deleteBlockedKeyword(id: string): Promise<void> {
    await this.prisma.blockedKeyword.delete({ where: { id } });
  }

  /**
   * Broadcast message to all rooms
   */
  async broadcastMessage(data: {
    senderId: string;
    senderType: OwnerType;
    content: string;
    fileUrl?: string;
  }): Promise<number> {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { type: 'GROUP' },
    });

    const messages = await Promise.all(
      rooms.map((room) =>
        this.createMessage({
          roomId: room.id,
          senderId: data.senderId,
          senderType: data.senderType,
          content: data.content,
          fileUrl: data.fileUrl,
        }),
      ),
    );

    return messages.length;
  }

  /**
   * Check rate limit (30 messages per 30 seconds)
   */
  async checkRateLimit(userId: string): Promise<boolean> {
    const key = `rate_limit:${userId}`;
    const now = Date.now();
    const windowStart = now - 30000; // 30 seconds ago

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count messages in window
    const count = await this.redis.zcount(key, windowStart, now);

    if (count >= 30) {
      return false; // Rate limit exceeded
    }

    // Add new entry
    await this.redis.zadd(key, now, `${now}`);
    await this.redis.expire(key, 30);

    return true;
  }

  /**
   * Update last read timestamp
   */
  async updateLastRead(roomId: string, userId: string): Promise<void> {
    await this.prisma.chatParticipant.update({
      where: {
        roomId_userId: { roomId, userId },
      },
      data: { lastReadAt: new Date() },
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });

    if (!participant || !participant.lastReadAt) {
      return 0;
    }

    return this.prisma.chatMessage.count({
      where: {
        roomId,
        createdAt: { gt: participant.lastReadAt },
        isDeleted: false,
      },
    });
  }
}
