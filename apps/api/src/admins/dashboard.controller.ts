import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get dashboard statistics
   */
  @Get('stats')
  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inactiveCutoff = new Date(today);
    inactiveCutoff.setDate(inactiveCutoff.getDate() - 30);

    // Get online users from Redis
    const onlineUsers = await this.redis.getOnlineUsersCount();

    // New users count
    const [newUsersToday, newUsers7Days, newUsers30Days] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Inactive users (30+ days)
    const inactiveUsersCount = await this.prisma.user.count({
      where: {
        OR: [
          { lastLoginAt: { lte: inactiveCutoff } },
          { lastLoginAt: null, createdAt: { lte: inactiveCutoff } },
        ],
      },
    });

    // Today's chat messages
    const todayMessages = await this.prisma.chatMessage.count({
      where: {
        createdAt: { gte: today },
        isDeleted: false,
      },
    });

    // Unprocessed reports
    const unresolvedReports = await this.prisma.report.count({
      where: {
        status: { in: ['SUBMITTED', 'REVIEWING'] },
      },
    });

    // Subscription stats
    const [activeSubscriptions, expiredSubscriptions, pendingSubscriptions] =
      await Promise.all([
        this.prisma.subscription.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.subscription.count({
          where: { status: 'EXPIRED' },
        }),
        this.prisma.subscription.count({
          where: { status: 'PENDING' },
        }),
      ]);

    return {
      onlineUsers,
      newUsers: {
        today: newUsersToday,
        last7Days: newUsers7Days,
        last30Days: newUsers30Days,
      },
      inactiveUsersCount,
      todayMessages,
      unresolvedReports,
      subscriptions: {
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        pending: pendingSubscriptions,
      },
    };
  }

  /**
   * Get user registration trend
   */
  @Get('user-trend')
  async getUserTrend(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const users = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Group by date
    const trendData: Record<string, number> = {};
    users.forEach((item) => {
      const date = item.createdAt.toISOString().split('T')[0];
      trendData[date] = (trendData[date] || 0) + item._count;
    });

    return Object.entries(trendData).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Get chat activity stats
   */
  @Get('chat-activity')
  async getChatActivity(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const messages = await this.prisma.chatMessage.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
        isDeleted: false,
      },
      _count: true,
    });

    const activityData: Record<string, number> = {};
    messages.forEach((item) => {
      const date = item.createdAt.toISOString().split('T')[0];
      activityData[date] = (activityData[date] || 0) + item._count;
    });

    return Object.entries(activityData).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Get recent reports
   */
  @Get('recent-reports')
  async getRecentReports(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.prisma.report.findMany({
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, name: true, nickname: true },
        },
      },
    });
  }
}
