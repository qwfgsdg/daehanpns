import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';

@Injectable()
export class ChatMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 메시지 목록 조회 (무한 스크롤)
   */
  async findAll(
    roomId: string,
    params?: {
      cursor?: string;
      limit?: number;
      keyword?: string;
      startDate?: string;
      endDate?: string;
      senderId?: string;
      hasFile?: boolean;
      includeDeleted?: boolean;
    },
  ) {
    const limit = Math.min(params?.limit || 50, 100);
    const where: any = {
      roomId,
    };

    // 삭제된 메시지 포함 여부
    if (params?.includeDeleted === false) {
      where.isDeleted = false;
    }

    if (params?.keyword) {
      where.content = {
        contains: params.keyword,
        mode: 'insensitive',
      };
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    if (params?.senderId) {
      where.senderId = params.senderId;
    }

    if (params?.hasFile !== undefined) {
      if (params.hasFile) {
        where.fileUrl = { not: null };
      } else {
        where.fileUrl = null;
      }
    }

    if (params?.cursor) {
      where.id = {
        lt: params.cursor,
      };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Resolve sender info based on senderType
    const resolvedMessages = await this.resolveSenderInfo(items);

    return {
      messages: resolvedMessages,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Resolve sender info for messages (User or Admin based on senderType)
   */
  private async resolveSenderInfo(messages: any[]): Promise<any[]> {
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
   * 메시지 삭제 (Soft Delete)
   */
  async deleteMessage(
    roomId: string,
    messageId: string,
    adminId: string,
  ) {
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        roomId,
      },
    });

    if (!message) {
      throw new NotFoundException('메시지를 찾을 수 없습니다');
    }

    if (message.isDeleted) {
      throw new BadRequestException('이미 삭제된 메시지입니다');
    }

    // 파일이 있으면 30일 후 삭제 예정 시간 설정
    const fileDeletedAt = message.fileUrl
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

    const deleted = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: adminId,
        fileDeletedAt,
      },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_MESSAGE_DELETE',
      target: messageId,
      description: `메시지 삭제: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
    });

    return deleted;
  }

  /**
   * 메시지 일괄 삭제
   */
  async bulkDeleteMessages(
    roomId: string,
    messageIds: string[],
    adminId: string,
  ) {
    if (!messageIds || messageIds.length === 0) {
      throw new BadRequestException('삭제할 메시지를 선택해주세요');
    }

    if (messageIds.length > 100) {
      throw new BadRequestException('최대 100개까지만 삭제할 수 있습니다');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        id: { in: messageIds },
        roomId,
      },
    });

    if (messages.length !== messageIds.length) {
      throw new BadRequestException('일부 메시지를 찾을 수 없습니다');
    }

    let successCount = 0;
    let failedCount = 0;
    const failedIds: string[] = [];

    for (const messageId of messageIds) {
      try {
        await this.deleteMessage(roomId, messageId, adminId);
        successCount++;
      } catch (error) {
        failedCount++;
        failedIds.push(messageId);
      }
    }

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_MESSAGE_BULK_DELETE',
      target: roomId,
      description: `메시지 일괄 삭제: ${successCount}개 성공, ${failedCount}개 실패`,
    });

    return {
      totalCount: messageIds.length,
      successCount,
      failedCount,
      failedIds,
    };
  }

  /**
   * 고정 메시지 목록 조회
   */
  async getPinnedMessages(roomId: string) {
    const pinnedMessages = await this.prisma.chatPinnedMessage.findMany({
      where: { roomId },
      orderBy: { pinnedAt: 'desc' },
    });

    return { pinnedMessages };
  }

  /**
   * 메시지 고정
   */
  async pinMessage(
    roomId: string,
    messageId: string,
    adminId: string,
  ) {
    // 메시지 확인
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        roomId,
      },
    });

    if (!message) {
      throw new NotFoundException('메시지를 찾을 수 없습니다');
    }

    // 이미 고정된 메시지 수 확인
    const pinnedCount = await this.prisma.chatPinnedMessage.count({
      where: { roomId },
    });

    if (pinnedCount >= 3) {
      throw new BadRequestException('최대 3개까지 고정 가능합니다');
    }

    // 이미 고정된 메시지인지 확인
    const existingPin = await this.prisma.chatPinnedMessage.findFirst({
      where: {
        roomId,
        messageId,
      },
    });

    if (existingPin) {
      throw new BadRequestException('이미 고정된 메시지입니다');
    }

    const pinned = await this.prisma.chatPinnedMessage.create({
      data: {
        roomId,
        messageId,
        content: message.content,
        pinnedBy: adminId,
      },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_MESSAGE_PIN',
      target: messageId,
      description: '메시지 고정',
    });

    return pinned;
  }

  /**
   * 메시지 고정 해제
   */
  async unpinMessage(
    roomId: string,
    pinnedMessageId: string,
    adminId: string,
  ) {
    const pinnedMessage = await this.prisma.chatPinnedMessage.findFirst({
      where: {
        id: pinnedMessageId,
        roomId,
      },
    });

    if (!pinnedMessage) {
      throw new NotFoundException('고정된 메시지를 찾을 수 없습니다');
    }

    await this.prisma.chatPinnedMessage.delete({
      where: { id: pinnedMessageId },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_MESSAGE_UNPIN',
      target: pinnedMessageId,
      description: '메시지 고정 해제',
    });

    return { success: true };
  }
}
