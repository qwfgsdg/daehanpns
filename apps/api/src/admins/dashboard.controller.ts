import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RedisService } from '../modules/redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

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
    // Check cache first
    const cacheKey = 'dashboard:stats';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      console.log('[Dashboard] Cache HIT - returning cached stats');
      return JSON.parse(cached);
    }
    console.log('[Dashboard] Cache MISS - fetching from database');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inactiveCutoff = new Date(today);
    inactiveCutoff.setDate(inactiveCutoff.getDate() - 30);

    // Get online users from Redis (approximate count from session keys)
    const onlineUsers = 0; // TODO: Implement real-time online user tracking

    // Parallel queries for better performance
    const [
      newUsersToday,
      newUsers7Days,
      newUsers30Days,
      inactiveUsersCount,
      todayMessages,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      activeChatRooms,
      todayActiveUsers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { lte: inactiveCutoff } },
      }),
      this.prisma.chatMessage.count({
        where: {
          createdAt: { gte: today },
          isDeleted: false,
        },
      }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.subscription.count({
        where: { status: 'EXPIRED' },
      }),
      this.prisma.subscription.count({
        where: { status: 'CANCELLED' },
      }),
      this.prisma.chatRoom.count({
        where: { isActive: true },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: { gte: today },
        },
      }),
    ]);

    // Get trends data
    const [trends7Days, trends30Days] = await Promise.all([
      this.getUserTrendData(7),
      this.getUserTrendData(30),
    ]);

    const result = {
      onlineUsers,
      newUsers: {
        today: newUsersToday,
        last7Days: newUsers7Days,
        last30Days: newUsers30Days,
      },
      inactiveUsers: inactiveUsersCount,
      todayChatMessages: todayMessages,
      activeChatRooms,
      todayActiveUsers,
      subscriptions: {
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        cancelled: cancelledSubscriptions,
      },
      trends: {
        last7Days: trends7Days,
        last30Days: trends30Days,
      },
    };

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    console.log('[Dashboard] Stats cached successfully (TTL: 300s)');

    return result;
  }

  /**
   * Helper: Get user trend data
   */
  private async getUserTrendData(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Group by date
    const trendData: Record<string, number> = {};

    // Initialize all dates with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendData[dateStr] = 0;
    }

    // Fill in actual counts
    users.forEach((item) => {
      const date = item.createdAt.toISOString().split('T')[0];
      trendData[date] = (trendData[date] || 0) + item._count;
    });

    return Object.entries(trendData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
      }));
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

  /**
   * Test Redis connection (DEBUG)
   */
  @Public()
  @Get('test-redis')
  async testRedis() {
    const testKey = 'test:connection';
    const testValue = { timestamp: Date.now(), message: 'Hello Redis!' };

    console.log('[DEBUG] Testing Redis connection...');

    // Test SET
    await this.redis.set(testKey, JSON.stringify(testValue), 60);
    console.log('[DEBUG] SET test:connection');

    // Test GET
    const result = await this.redis.get(testKey);
    console.log('[DEBUG] GET test:connection:', result ? 'FOUND' : 'NOT FOUND');

    // Test EXISTS
    const exists = await this.redis.exists('dashboard:stats');
    console.log('[DEBUG] EXISTS dashboard:stats:', exists);

    return {
      success: true,
      testValue,
      retrieved: result ? JSON.parse(result) : null,
      dashboardStatsExists: exists,
      redisStatus: 'connected',
    };
  }
}
