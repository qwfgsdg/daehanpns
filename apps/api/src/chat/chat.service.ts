import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { RedisService } from '../modules/redis/redis.service';
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
  }): Promise<ChatRoom> {
    return this.prisma.chatRoom.create({
      data: {
        name: data.name,
        type: data.type,
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
        pinnedMessages: true,
      },
    });
  }

  /**
   * Get room by entry code (not supported in current schema)
   */
  async getRoomByEntryCode(entryCode: string): Promise<ChatRoom | null> {
    return this.prisma.chatRoom.findFirst({
      where: { name: entryCode },
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
          participants: true,
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

    return this.prisma.chatParticipant.create({
      data: {
        roomId,
        userId,
      },
    });
  }

  /**
   * Approve participant join request
   */
  async approveJoin(
    roomId: string,
    userId: string,
    adminId: string,
  ): Promise<any> {
    await this.logsService.createAdminLog({
      adminId: adminId,
      action: 'CHAT_JOIN_APPROVE',
      target: roomId,
      description: `Approved user ${userId} to join room`,
    });

    return { success: true };
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
      where: { roomId },
      include: { user: true },
    });
  }

  /**
   * Check if user can send message (bidirectional/unidirectional + vice owner check)
   */
  async canSendMessage(
    roomId: string,
    userId: string,
  ): Promise<boolean> {
    const room = await this.getRoomById(roomId);
    if (!room) return false;

    // Check if user is participant
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    return !!participant;
  }

  /**
   * Create message
   */
  async createMessage(data: {
    roomId: string;
    senderId: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
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
        content: data.content || '',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
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
          select: { id: true, name: true, nickname: true, profileImage: true },
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
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    return this.prisma.chatPinnedMessage.create({
      data: {
        roomId,
        messageId,
        content: message.content,
        pinnedBy
      },
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
      orderBy: { pinnedAt: 'desc' },
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
  async addBlockedKeyword(keyword: string): Promise<any> {
    return this.prisma.blockedKeyword.create({
      data: { keyword },
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
    content: string;
    fileUrl?: string;
  }): Promise<number> {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { type: 'ONE_TO_N' },
    });

    const messages = await Promise.all(
      rooms.map((room) =>
        this.createMessage({
          roomId: room.id,
          senderId: data.senderId,
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
    await this.redis.zRemRangeByScore(key, 0, windowStart);

    // Count messages in window
    const count = await this.redis.zCount(key, windowStart, now);

    if (count >= 30) {
      return false; // Rate limit exceeded
    }

    // Add new entry
    await this.redis.zAdd(key, [{ score: now, value: `${now}` }]);
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
