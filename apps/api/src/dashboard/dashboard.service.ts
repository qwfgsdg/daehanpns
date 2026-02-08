import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get online users count (users who logged in within last 5 minutes)
   */
  async getOnlineUsersCount(): Promise<number> {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    return this.prisma.user.count({
      where: {
        lastLoginAt: {
          gte: fiveMinutesAgo,
        },
        isActive: true,
      },
    });
  }

  /**
   * Get new users count for specified days
   */
  async getNewUsersCount(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.prisma.user.count({
      where: {
        createdAt: {
          gte: cutoffDate,
        },
      },
    });
  }

  /**
   * Get inactive users count (not logged in for specified days)
   */
  async getInactiveUsersCount(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.prisma.user.count({
      where: {
        OR: [
          {
            lastLoginAt: {
              lte: cutoffDate,
            },
          },
          {
            lastLoginAt: null,
            createdAt: {
              lte: cutoffDate,
            },
          },
        ],
        isActive: true,
      },
    });
  }

  /**
   * Get today's chat messages count
   */
  async getTodayChatMessagesCount(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.chatMessage.count({
      where: {
        createdAt: {
          gte: startOfDay,
        },
        isDeleted: false,
      },
    });
  }

  /**
   * Get active chat rooms count
   */
  async getActiveChatRoomsCount(): Promise<number> {
    return this.prisma.chatRoom.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    });
  }

  /**
   * Get today's active users count (users who sent messages today)
   */
  async getTodayActiveUsersCount(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.prisma.chatMessage.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
        },
        isDeleted: false,
      },
      select: {
        senderId: true,
      },
      distinct: ['senderId'],
    });

    return result.length;
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<{
    active: number;
    expired: number;
    cancelled: number;
  }> {
    const [active, expired, cancelled] = await Promise.all([
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.subscription.count({
        where: { status: 'EXPIRED' },
      }),
      this.prisma.subscription.count({
        where: { status: 'CANCELLED' },
      }),
    ]);

    return { active, expired, cancelled };
  }

  /**
   * Get user registration trend for last N days
   */
  async getRegistrationTrend(days: number): Promise<
    Array<{ date: string; count: number }>
  > {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: cutoffDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date
    const dateMap = new Map<string, number>();

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
    }

    // Count users per date
    users.forEach((user) => {
      const dateStr = user.createdAt.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    });

    // Convert to array and sort by date
    const result = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  /**
   * Get all dashboard statistics
   */
  async getDashboardStats() {
    const [
      onlineUsers,
      newUsersToday,
      newUsers7Days,
      newUsers30Days,
      inactiveUsers,
      todayChatMessages,
      activeChatRooms,
      todayActiveUsers,
      subscriptionStats,
      trend7Days,
      trend30Days,
    ] = await Promise.all([
      this.getOnlineUsersCount(),
      this.getNewUsersCount(1),
      this.getNewUsersCount(7),
      this.getNewUsersCount(30),
      this.getInactiveUsersCount(30),
      this.getTodayChatMessagesCount(),
      this.getActiveChatRoomsCount(),
      this.getTodayActiveUsersCount(),
      this.getSubscriptionStats(),
      this.getRegistrationTrend(7),
      this.getRegistrationTrend(30),
    ]);

    return {
      onlineUsers,
      newUsers: {
        today: newUsersToday,
        last7Days: newUsers7Days,
        last30Days: newUsers30Days,
      },
      inactiveUsers,
      todayChatMessages,
      activeChatRooms,
      todayActiveUsers,
      subscriptions: subscriptionStats,
      trends: {
        last7Days: trend7Days,
        last30Days: trend30Days,
      },
    };
  }
}
