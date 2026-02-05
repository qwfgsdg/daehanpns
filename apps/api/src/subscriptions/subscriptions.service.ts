import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import {
  Subscription,
  DiscountEvent,
  SubscriptionStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  // ==================== SUBSCRIPTIONS ====================

  /**
   * Create subscription request
   */
  async create(data: {
    userId: string;
    planName: string;
    discountEventId?: string;
  }): Promise<Subscription> {
    return this.prisma.subscription.create({
      data: {
        userId: data.userId,
        planName: data.planName,
        discountEventId: data.discountEventId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get all subscriptions with filters
   */
  async findAll(params: {
    userId?: string;
    status?: SubscriptionStatus;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.SubscriptionWhereInput = {};

    if (params.userId) where.userId = params.userId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { planName: { contains: params.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { nickname: { contains: params.search, mode: 'insensitive' } },
            ],
          },
        },
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
          discountEvent: true,
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  /**
   * Get subscription by ID
   */
  async findById(id: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: true,
        discountEvent: true,
      },
    });
  }

  /**
   * Approve subscription (수동 승인)
   */
  async approve(
    id: string,
    durationDays: number,
    adminId: string,
    adminMemo?: string,
  ): Promise<Subscription> {
    const before = await this.findById(id);
    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + durationDays);

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startAt,
        endAt,
        adminMemo,
      },
    });

    await this.logsService.create({
      actorId: adminId,
      actionType: 'SUBSCRIPTION_APPROVE',
      targetType: 'subscription',
      targetId: id,
      details: {
        before: before?.status,
        after: 'ACTIVE',
        durationDays,
        adminMemo,
      },
    });

    return updated;
  }

  /**
   * Reject subscription
   */
  async reject(
    id: string,
    adminId: string,
    adminMemo?: string,
  ): Promise<Subscription> {
    const before = await this.findById(id);
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'EXPIRED',
        adminMemo,
      },
    });

    await this.logsService.create({
      actorId: adminId,
      actionType: 'SUBSCRIPTION_REJECT',
      targetType: 'subscription',
      targetId: id,
      details: {
        before: before?.status,
        after: 'EXPIRED',
        adminMemo,
      },
    });

    return updated;
  }

  /**
   * Update subscription
   */
  async update(
    id: string,
    data: Prisma.SubscriptionUpdateInput,
    actorId?: string,
  ): Promise<Subscription> {
    const before = await this.findById(id);
    const updated = await this.prisma.subscription.update({
      where: { id },
      data,
    });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'SUBSCRIPTION_UPDATE',
        targetType: 'subscription',
        targetId: id,
        details: { before, after: updated },
      });
    }

    return updated;
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { discountEvent: true },
    });
  }

  /**
   * Get active subscription for user
   */
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const now = new Date();

    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: { discountEvent: true },
    });
  }

  /**
   * Get subscription stats
   */
  async getStats() {
    const [active, expired, pending] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.subscription.count({ where: { status: 'PENDING' } }),
    ]);

    return { active, expired, pending };
  }

  // ==================== DISCOUNT EVENTS ====================

  /**
   * Create discount event
   */
  async createDiscountEvent(data: {
    name: string;
    discountRate: number;
    startAt: Date;
    endAt: Date;
  }): Promise<DiscountEvent> {
    return this.prisma.discountEvent.create({
      data: {
        name: data.name,
        discountRate: data.discountRate,
        startAt: data.startAt,
        endAt: data.endAt,
      },
    });
  }

  /**
   * Get all discount events
   */
  async getDiscountEvents(params?: {
    skip?: number;
    take?: number;
  }): Promise<{ events: DiscountEvent[]; total: number }> {
    const [events, total] = await Promise.all([
      this.prisma.discountEvent.findMany({
        skip: params?.skip || 0,
        take: params?.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.discountEvent.count(),
    ]);

    return { events, total };
  }

  /**
   * Get active discount events
   */
  async getActiveDiscountEvents(): Promise<DiscountEvent[]> {
    const now = new Date();

    return this.prisma.discountEvent.findMany({
      where: {
        startAt: { lte: now },
        endAt: { gte: now },
      },
      orderBy: { discountRate: 'desc' },
    });
  }

  /**
   * Get discount event by ID
   */
  async getDiscountEventById(id: string): Promise<DiscountEvent | null> {
    return this.prisma.discountEvent.findUnique({ where: { id } });
  }

  /**
   * Update discount event
   */
  async updateDiscountEvent(
    id: string,
    data: Prisma.DiscountEventUpdateInput,
    actorId?: string,
  ): Promise<DiscountEvent> {
    const before = await this.getDiscountEventById(id);
    const updated = await this.prisma.discountEvent.update({
      where: { id },
      data,
    });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'DISCOUNT_EVENT_UPDATE',
        targetType: 'discount_event',
        targetId: id,
        details: { before, after: updated },
      });
    }

    return updated;
  }

  /**
   * Delete discount event
   */
  async deleteDiscountEvent(id: string, actorId?: string): Promise<void> {
    const event = await this.getDiscountEventById(id);

    await this.prisma.discountEvent.delete({ where: { id } });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'DISCOUNT_EVENT_DELETE',
        targetType: 'discount_event',
        targetId: id,
        details: { deleted: event },
      });
    }
  }
}
