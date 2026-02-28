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
   * Get all rooms with filters (관리자용)
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
   * Get my rooms (내가 참여한 채팅방만)
   */
  async getMyRooms(userId: string, params: {
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ChatRoomWhereInput = {
      participants: {
        some: {
          userId,
          leftAt: null,
          isKicked: false,
        },
      },
    };

    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          participants: {
            where: { leftAt: null, isKicked: false },
            include: { user: { select: { id: true, name: true, nickname: true, profileImage: true } } },
          },
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              participants: { where: { leftAt: null, isKicked: false } },
            },
          },
        },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    return { rooms, total };
  }

  /**
   * Get public rooms (공개 채팅방 탐색용)
   */
  async getPublicRooms(params: {
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ChatRoomWhereInput = {
      type: 'ONE_TO_N',
      isActive: true,
    };

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
          _count: {
            select: {
              participants: { where: { leftAt: null, isKicked: false } },
            },
          },
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
   * Join room (권한 체크 포함)
   */
  async joinRoom(roomId: string, userId: string): Promise<any> {
    const room = await this.getRoomById(roomId);

    if (!room) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    // 기존 참여자 레코드 확인
    const existing = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existing) {
      // 강퇴된 경우 재입장 불가
      if (existing.isKicked) {
        throw new Error('강퇴된 채팅방에는 다시 입장할 수 없습니다.');
      }
      // 퇴장한 경우 재활성화
      if (existing.leftAt) {
        return this.prisma.chatParticipant.update({
          where: { id: existing.id },
          data: { leftAt: null },
        });
      }
      // 이미 활성 참여자
      return existing;
    }

    // 방 타입별 권한 체크
    if (room.type === 'ONE_TO_N') {
      // Expert 유료방 구독 체크
      const hasAccess = await this.checkSubscriptionAccess(roomId, userId);
      if (!hasAccess) {
        throw new Error('구독이 필요한 채팅방입니다.');
      }
      // 공개방 자유 입장 (MEMBER = 읽기전용)
      return this.prisma.chatParticipant.create({
        data: {
          roomId,
          userId,
          ownerType: 'MEMBER',
        },
      });
    }

    // ONE_TO_ONE, TWO_WAY: 초대 전용
    throw new Error('초대 전용 채팅방입니다.');
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
   * Leave room (soft delete)
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await this.prisma.chatParticipant.update({
      where: {
        roomId_userId: { roomId, userId },
      },
      data: { leftAt: new Date() },
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
   * Check if user can send message
   * Returns detailed result with permission info and shadow ban status
   */
  async canSendMessage(
    roomId: string,
    userId: string,
    userType?: string,
  ): Promise<{ allowed: boolean; reason?: string; isShadowBanned?: boolean }> {
    // 1. Admin은 방 존재하면 무조건 허용
    if (userType === 'admin') {
      const room = await this.getRoomById(roomId);
      if (!room) return { allowed: false, reason: '존재하지 않는 채팅방입니다' };
      return { allowed: true };
    }

    const room = await this.getRoomById(roomId);
    if (!room) return { allowed: false, reason: '존재하지 않는 채팅방입니다' };

    // 2. Participant 조회
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!participant) return { allowed: false, reason: '참여 권한이 없습니다' };
    if (participant.isKicked) return { allowed: false, reason: '강퇴된 채팅방입니다' };
    if (participant.leftAt) return { allowed: false, reason: '퇴장한 채팅방입니다' };

    // 3. 방 타입별 권한 체크
    if (room.type === 'ONE_TO_N') {
      // 1:N 방송방: OWNER, VICE_OWNER만 전송 가능
      if (participant.ownerType !== 'OWNER' && participant.ownerType !== 'VICE_OWNER') {
        return { allowed: false, reason: '읽기 전용 채팅방입니다' };
      }
    }
    // ONE_TO_ONE, TWO_WAY: 모든 참여자 전송 가능

    // 4. 쉐도우밴 체크 — 전송은 허용하되 플래그 반환
    if (participant.isShadowBanned) {
      return { allowed: true, isShadowBanned: true };
    }

    return { allowed: true };
  }

  /**
   * Check subscription access for expert rooms
   */
  async checkSubscriptionAccess(roomId: string, userId: string): Promise<boolean> {
    // Redis 캐시 체크
    const cacheKey = `sub_check:${userId}:${roomId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached === '1';

    // Expert 방인지 확인
    const expert = await this.prisma.expert.findFirst({
      where: {
        OR: [{ vipRoomId: roomId }, { vvipRoomId: roomId }],
      },
    });

    // Expert 방이 아니면 자유 접근
    if (!expert) {
      await this.redis.set(cacheKey, '1', 300);
      return true;
    }

    // Subscription 테이블에서 활성 구독 확인
    const now = new Date();
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        expertId: expert.id,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
    });

    const hasAccess = !!subscription;
    await this.redis.set(cacheKey, hasAccess ? '1' : '0', 300);
    return hasAccess;
  }

  /**
   * Get read status for a room (active participants with lastReadAt)
   */
  async getReadStatus(roomId: string): Promise<{
    totalActive: number;
    participants: Array<{ userId: string; lastReadAt: string | null }>;
  }> {
    const participants = await this.prisma.chatParticipant.findMany({
      where: {
        roomId,
        leftAt: null,
        isKicked: false,
      },
      select: {
        userId: true,
        lastReadAt: true,
      },
    });

    return {
      totalActive: participants.length,
      participants: participants.map(p => ({
        userId: p.userId,
        lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
      })),
    };
  }

  /**
   * Soft delete message with deletedBy tracking
   */
  async deleteMessageWithTracker(id: string, deletedBy: string): Promise<ChatMessage> {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy },
    });
  }

  /**
   * Create message
   */
  async createMessage(data: {
    roomId: string;
    senderId: string;
    senderType?: 'USER' | 'ADMIN';
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
        senderType: data.senderType || 'USER',
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

    const messages = await this.prisma.chatMessage.findMany({
      where,
      skip: params.skip || 0,
      take: params.take || 50,
      orderBy: { createdAt: 'desc' },
    });

    return this.resolveSenderInfo(messages);
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
   * Resolve sender info for messages (User or Admin based on senderType)
   */
  async resolveSenderInfo(messages: ChatMessage[]): Promise<any[]> {
    const userIds = messages.filter(m => m.senderType === 'USER').map(m => m.senderId);
    const adminIds = messages.filter(m => m.senderType === 'ADMIN').map(m => m.senderId);

    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: [...new Set(userIds)] } },
          select: { id: true, name: true, nickname: true, profileImage: true },
        })
      : [];

    const admins = adminIds.length > 0
      ? await this.prisma.admin.findMany({
          where: { id: { in: [...new Set(adminIds)] } },
          select: { id: true, realName: true, salesName: true, logoUrl: true },
        })
      : [];

    const userMap = new Map(users.map((u: any) => [u.id, u]));
    const adminMap = new Map(admins.map((a: any) => [a.id, a]));

    return messages.map(msg => {
      let sender: any = null;
      if (msg.senderType === 'ADMIN') {
        const admin: any = adminMap.get(msg.senderId);
        sender = admin
          ? { id: admin.id, name: admin.salesName || admin.realName, profileImage: admin.logoUrl, isAdmin: true }
          : { id: msg.senderId, name: '관리자', profileImage: null, isAdmin: true };
      } else {
        const user: any = userMap.get(msg.senderId);
        sender = user
          ? { id: user.id, name: user.nickname || user.name, profileImage: user.profileImage, isAdmin: false }
          : { id: msg.senderId, name: '알 수 없음', profileImage: null, isAdmin: false };
      }
      return { ...msg, sender };
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
