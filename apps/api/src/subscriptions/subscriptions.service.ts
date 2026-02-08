import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { Subscription, RoomType, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Create subscription
   */
  async createSubscription(
    data: {
      userId: string;
      expertId: string;
      roomType: RoomType;
      durationMonths: number;
      startDate: Date;
      depositName?: string;
      depositAmount?: number;
      adminMemo?: string;
    },
    adminId: string,
  ): Promise<Subscription> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // Validate expert exists
    const expert = await this.prisma.expert.findUnique({
      where: { id: data.expertId },
    });

    if (!expert || !expert.isActive) {
      throw new NotFoundException('활성화된 전문가를 찾을 수 없습니다');
    }

    // Validate room exists
    const roomId = data.roomType === 'VIP' ? expert.vipRoomId : expert.vvipRoomId;
    if (!roomId) {
      throw new BadRequestException(`전문가의 ${data.roomType} 채팅방이 설정되지 않았습니다`);
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room || !room.isActive) {
      throw new BadRequestException('채팅방을 찾을 수 없거나 비활성화되었습니다');
    }

    // Check for active subscription for the same expert and room type
    const existingActiveSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: data.userId,
        expertId: data.expertId,
        roomType: data.roomType,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
    });

    if (existingActiveSubscription) {
      throw new BadRequestException(
        `이미 활성화된 ${data.roomType} 구독이 있습니다`,
      );
    }

    // Calculate end date
    const endDate = new Date(data.startDate);
    endDate.setMonth(endDate.getMonth() + data.durationMonths);

    // Create subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: data.userId,
        expertId: data.expertId,
        roomType: data.roomType,
        status: 'ACTIVE',
        startDate: data.startDate,
        endDate,
        durationMonths: data.durationMonths,
        createdBy: adminId,
        depositName: data.depositName,
        depositAmount: data.depositAmount,
        adminMemo: data.adminMemo,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
          },
        },
        expert: true,
      },
    });

    // Add user to chat room
    await this.addUserToRoom(data.userId, roomId);

    // Log action
    await this.logsService.createAdminLog({
      adminId,
      action: 'SUBSCRIPTION_CREATE',
      target: subscription.id,
      description: `구독 생성: ${user.name} (${user.phone}) - ${expert.name} ${data.roomType} ${data.durationMonths}개월`,
    });

    return subscription;
  }

  /**
   * List subscriptions with filters
   */
  async findAll(params: {
    userId?: string;
    expertId?: string;
    status?: SubscriptionStatus;
    roomType?: RoomType;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};

    if (params.userId) where.userId = params.userId;
    if (params.expertId) where.expertId = params.expertId;
    if (params.status) where.status = params.status;
    if (params.roomType) where.roomType = params.roomType;

    if (params.search) {
      where.OR = [
        { user: { name: { contains: params.search, mode: 'insensitive' } } },
        { user: { nickname: { contains: params.search, mode: 'insensitive' } } },
        { user: { phone: { contains: params.search } } },
        { expert: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
              phone: true,
            },
          },
          expert: true,
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  /**
   * Find subscription by ID (with user and expert details)
   */
  async findById(id: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
        expert: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('구독을 찾을 수 없습니다');
    }

    return subscription;
  }

  /**
   * Find subscriptions by userId
   */
  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        expert: true,
      },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<Subscription> {
    const subscription = await this.findById(id);

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('이미 취소된 구독입니다');
    }

    if (subscription.status === 'EXPIRED') {
      throw new BadRequestException('이미 만료된 구독입니다');
    }

    // Remove user from room
    const roomId =
      subscription.roomType === 'VIP'
        ? subscription.expert.vipRoomId
        : subscription.expert.vvipRoomId;

    if (roomId) {
      await this.removeUserFromRoom(subscription.userId, roomId);
    }

    // Update subscription
    const cancelled = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: adminId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
          },
        },
        expert: true,
      },
    });

    // Log action
    await this.logsService.createAdminLog({
      adminId,
      action: 'SUBSCRIPTION_CANCEL',
      target: id,
      description: `구독 취소: ${subscription.user.name} - ${subscription.expert.name} ${subscription.roomType}${reason ? ` (사유: ${reason})` : ''}`,
    });

    return cancelled;
  }

  /**
   * Extend subscription duration
   */
  async extendSubscription(
    id: string,
    additionalMonths: number,
    adminId: string,
  ): Promise<Subscription> {
    if (additionalMonths <= 0) {
      throw new BadRequestException('연장 기간은 1개월 이상이어야 합니다');
    }

    const subscription = await this.findById(id);

    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException('활성 구독만 연장할 수 있습니다');
    }

    // Extend end date
    const newEndDate = new Date(subscription.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);

    const extended = await this.prisma.subscription.update({
      where: { id },
      data: {
        endDate: newEndDate,
        durationMonths: subscription.durationMonths + additionalMonths,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
          },
        },
        expert: true,
      },
    });

    // Log action
    await this.logsService.createAdminLog({
      adminId,
      action: 'SUBSCRIPTION_EXTEND',
      target: id,
      description: `구독 연장: ${subscription.user.name} - ${subscription.expert.name} ${subscription.roomType} +${additionalMonths}개월`,
    });

    return extended;
  }

  /**
   * Convert between VIP and VVIP (cancel old, create new with remaining months)
   */
  async convertSubscription(
    id: string,
    newRoomType: RoomType,
    adminId: string,
  ): Promise<Subscription> {
    const oldSubscription = await this.findById(id);

    if (oldSubscription.status !== 'ACTIVE') {
      throw new BadRequestException('활성 구독만 전환할 수 있습니다');
    }

    if (oldSubscription.roomType === newRoomType) {
      throw new BadRequestException('동일한 등급으로 전환할 수 없습니다');
    }

    // Calculate remaining months (rounded up)
    const now = new Date();
    const remainingDays = Math.ceil(
      (oldSubscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const remainingMonths = Math.ceil(remainingDays / 30);

    if (remainingMonths <= 0) {
      throw new BadRequestException('남은 구독 기간이 없습니다');
    }

    // Cancel old subscription
    const oldRoomId =
      oldSubscription.roomType === 'VIP'
        ? oldSubscription.expert.vipRoomId
        : oldSubscription.expert.vvipRoomId;

    if (oldRoomId) {
      await this.removeUserFromRoom(oldSubscription.userId, oldRoomId);
    }

    await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: adminId,
      },
    });

    // Create new subscription with remaining months
    const newSubscription = await this.createSubscription(
      {
        userId: oldSubscription.userId,
        expertId: oldSubscription.expertId,
        roomType: newRoomType,
        durationMonths: remainingMonths,
        startDate: new Date(),
      },
      adminId,
    );

    // Log action
    await this.logsService.createAdminLog({
      adminId,
      action: 'SUBSCRIPTION_CONVERT',
      target: newSubscription.id,
      description: `구독 전환: ${oldSubscription.user.name} - ${oldSubscription.expert.name} ${oldSubscription.roomType} → ${newRoomType} (${remainingMonths}개월 이전)`,
    });

    return newSubscription;
  }

  /**
   * Expire subscriptions (for scheduler)
   */
  async expireSubscriptions(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Get expired subscriptions to remove users from rooms
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'EXPIRED',
        endDate: { lt: now, gte: new Date(now.getTime() - 60000) }, // Last minute
      },
      include: {
        expert: true,
      },
    });

    // Remove users from rooms
    for (const subscription of expiredSubscriptions) {
      const roomId =
        subscription.roomType === 'VIP'
          ? subscription.expert.vipRoomId
          : subscription.expert.vvipRoomId;

      if (roomId) {
        await this.removeUserFromRoom(subscription.userId, roomId);
      }
    }

    return result.count;
  }

  /**
   * Notify expiring subscriptions (3 days before)
   */
  async notifyExpiringSubscriptions(): Promise<number> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);

    const expiringSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: threeDaysFromNow,
          lt: fourDaysFromNow,
        },
      },
      include: {
        user: true,
        expert: true,
      },
    });

    // Create notifications
    for (const subscription of expiringSubscriptions) {
      await this.prisma.notification.create({
        data: {
          userId: subscription.userId,
          type: 'SUBSCRIPTION',
          category: 'SUBSCRIPTION_EXPIRED',
          title: '구독 만료 예정',
          body: `${subscription.expert.name} ${subscription.roomType} 구독이 3일 후 만료됩니다.`,
          data: {
            subscriptionId: subscription.id,
            expertId: subscription.expertId,
            roomType: subscription.roomType,
            endDate: subscription.endDate.toISOString(),
          },
        },
      });
    }

    return expiringSubscriptions.length;
  }

  /**
   * Get subscription statistics
   */
  async getStats() {
    const [
      totalActive,
      totalExpired,
      totalCancelled,
      vipActive,
      vvipActive,
      expiringIn7Days,
    ] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', roomType: 'VIP' },
      }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', roomType: 'VVIP' },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      totalActive,
      totalExpired,
      totalCancelled,
      vipActive,
      vvipActive,
      expiringIn7Days,
    };
  }

  /**
   * Private: Add user to room
   */
  private async addUserToRoom(userId: string, roomId: string): Promise<void> {
    // Check if already a participant
    const existing = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (existing) {
      // If user left before, rejoin
      if (existing.leftAt) {
        await this.prisma.chatParticipant.update({
          where: { id: existing.id },
          data: {
            leftAt: null,
            joinedAt: new Date(),
          },
        });
      }
      return;
    }

    // Add as new participant
    await this.prisma.chatParticipant.create({
      data: {
        roomId,
        userId,
        ownerType: 'MEMBER',
        joinedAt: new Date(),
      },
    });
  }

  /**
   * Private: Remove user from room
   */
  private async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (participant) {
      await this.prisma.chatParticipant.update({
        where: { id: participant.id },
        data: {
          leftAt: new Date(),
        },
      });
    }
  }

  /**
   * Auto-expire subscriptions (Cron job - runs daily at 3 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async autoExpireSubscriptions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Find expired subscriptions
      const expiredSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lt: today,
          },
        },
        include: {
          user: true,
          expert: true,
        },
      });

      console.log(`[Cron] Found ${expiredSubscriptions.length} expired subscriptions`);

      // Update status to EXPIRED
      for (const subscription of expiredSubscriptions) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });

        // Remove user from chat room
        const roomId = subscription.roomType === 'VIP'
          ? subscription.expert.vipRoomId
          : subscription.expert.vvipRoomId;

        if (roomId) {
          await this.removeUserFromRoom(subscription.userId, roomId);
        }

        console.log(`[Cron] Expired subscription: ${subscription.user.name} - ${subscription.expert.name} ${subscription.roomType}`);
      }

      console.log(`[Cron] Auto-expire completed: ${expiredSubscriptions.length} subscriptions expired`);
    } catch (error) {
      console.error('[Cron] Auto-expire failed:', error);
    }
  }
}
