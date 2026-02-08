import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import {
  ChatStatsQueryDto,
  UserStatsQueryDto,
  TopUsersQueryDto,
} from './dto/chat-stats-query.dto';
import {
  StatsSummaryDto,
  UserStatDto,
  AdminStatDto,
  RoomStatDto,
  DailyTrendDto,
  UserStatsListDto,
  RoomStatsListDto,
} from './dto/chat-stats-response.dto';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 전체 통계 요약
   */
  async getChatStatsSummary(query: ChatStatsQueryDto): Promise<StatsSummaryDto> {
    const { startDate, endDate } = query;
    const where = this.buildWhereClause(query);

    // 현재 기간 통계
    const [totalMessages, activeUsers] = await Promise.all([
      this.prisma.chatMessage.count({ where }),
      this.prisma.chatMessage.groupBy({
        by: ['senderId'],
        where,
        _count: { senderId: true },
      }),
    ]);

    // 전주 기간 계산
    const currentPeriod = new Date(endDate).getTime() - new Date(startDate).getTime();
    const previousStartDate = new Date(new Date(startDate).getTime() - currentPeriod);
    const previousEndDate = new Date(startDate);

    const previousWhere = this.buildWhereClause({
      ...query,
      startDate: previousStartDate.toISOString(),
      endDate: previousEndDate.toISOString(),
    });

    const previousTotalMessages = await this.prisma.chatMessage.count({
      where: previousWhere,
    });

    // 전주 대비 증감률 계산
    const weeklyChange =
      previousTotalMessages > 0
        ? ((totalMessages - previousTotalMessages) / previousTotalMessages) * 100
        : 100;

    return {
      totalMessages,
      activeUsers: activeUsers.length,
      activeAdmins: 0, // TODO: senderType 추가 후 구현
      weeklyChange: Math.round(weeklyChange * 10) / 10,
    };
  }

  /**
   * TOP N 활동 회원
   */
  async getTopUsers(query: TopUsersQueryDto): Promise<UserStatDto[]> {
    const { startDate, endDate, limit = 10 } = query;

    const stats = await this.prisma.chatMessage.groupBy({
      by: ['senderId'],
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        isDeleted: false,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // 사용자 정보 조회
    const userIds = stats.map((s) => s.senderId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        nickname: true,
        profileImage: true,
      },
    });

    // 각 사용자의 참여 채팅방 수 조회
    const roomCounts = await Promise.all(
      userIds.map(async (userId) => {
        const count = await this.prisma.chatMessage.groupBy({
          by: ['roomId'],
          where: {
            senderId: userId,
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
            isDeleted: false,
          },
        });
        return { userId, count: count.length };
      }),
    );

    // 전주 데이터 조회 (증감률 계산용)
    const weeklyChanges = await this.calculateWeeklyChanges(userIds, startDate, endDate);

    // 결과 조합
    return stats.map((stat) => {
      const user = users.find((u) => u.id === stat.senderId);
      const roomCount = roomCounts.find((rc) => rc.userId === stat.senderId);
      const weeklyChange = weeklyChanges.find((wc) => wc.userId === stat.senderId);

      return {
        userId: stat.senderId,
        nickname: user?.nickname || '알 수 없음',
        name: user?.name || '',
        profileImage: user?.profileImage,
        messageCount: stat._count.id,
        roomCount: roomCount?.count || 0,
        weeklyChange: weeklyChange?.change || 0,
      };
    });
  }

  /**
   * 일별 메시지 추이
   */
  async getDailyTrend(query: ChatStatsQueryDto): Promise<DailyTrendDto[]> {
    const { startDate, endDate } = query;
    const where = this.buildWhereClause(query);

    // 날짜별 메시지 수 집계
    const messages = await this.prisma.chatMessage.findMany({
      where,
      select: {
        createdAt: true,
      },
    });

    // 날짜별로 그룹화
    const dailyMap = new Map<string, number>();
    messages.forEach((msg) => {
      const date = msg.createdAt.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });

    // 날짜 범위의 모든 날짜 생성
    const result: DailyTrendDto[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        messageCount: dailyMap.get(dateStr) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  /**
   * 회원별 통계 (페이지네이션)
   */
  async getUserStats(query: UserStatsQueryDto): Promise<UserStatsListDto> {
    const { startDate, endDate, page = 1, limit = 20, search } = query;

    // 사용자 통계 집계
    const stats = await this.prisma.chatMessage.groupBy({
      by: ['senderId'],
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        isDeleted: false,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 검색 필터 적용
    let userIds = stats.map((s) => s.senderId);
    if (search) {
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          OR: [
            { name: { contains: search } },
            { nickname: { contains: search } },
          ],
        },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    const total = userIds.length;
    const skip = (page - 1) * limit;
    const paginatedIds = userIds.slice(skip, skip + limit);

    // 사용자 정보 조회
    const users = await this.prisma.user.findMany({
      where: { id: { in: paginatedIds } },
      select: {
        id: true,
        name: true,
        nickname: true,
        profileImage: true,
      },
    });

    // 각 사용자의 참여 채팅방 수 조회
    const roomCounts = await Promise.all(
      paginatedIds.map(async (userId) => {
        const count = await this.prisma.chatMessage.groupBy({
          by: ['roomId'],
          where: {
            senderId: userId,
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
            isDeleted: false,
          },
        });
        return { userId, count: count.length };
      }),
    );

    // 전주 대비 증감률
    const weeklyChanges = await this.calculateWeeklyChanges(
      paginatedIds,
      startDate,
      endDate,
    );

    const userStats = paginatedIds.map((userId) => {
      const stat = stats.find((s) => s.senderId === userId);
      const user = users.find((u) => u.id === userId);
      const roomCount = roomCounts.find((rc) => rc.userId === userId);
      const weeklyChange = weeklyChanges.find((wc) => wc.userId === userId);

      return {
        userId,
        nickname: user?.nickname || '알 수 없음',
        name: user?.name || '',
        profileImage: user?.profileImage,
        messageCount: stat?._count.id || 0,
        roomCount: roomCount?.count || 0,
        weeklyChange: weeklyChange?.change || 0,
      };
    });

    return {
      users: userStats,
      total,
      page,
      limit,
    };
  }

  /**
   * 채팅방별 통계
   */
  async getRoomStats(query: UserStatsQueryDto): Promise<RoomStatsListDto> {
    const { startDate, endDate, page = 1, limit = 20, search } = query;

    // 채팅방별 통계 집계
    const stats = await this.prisma.chatMessage.groupBy({
      by: ['roomId'],
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        isDeleted: false,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 채팅방 정보 조회
    let roomIds = stats.map((s) => s.roomId);
    const roomsQuery: any = {
      id: { in: roomIds },
    };

    if (search) {
      roomsQuery.name = { contains: search };
    }

    const rooms = await this.prisma.chatRoom.findMany({
      where: roomsQuery,
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
      },
    });

    roomIds = rooms.map((r) => r.id);
    const total = roomIds.length;
    const skip = (page - 1) * limit;
    const paginatedIds = roomIds.slice(skip, skip + limit);

    // 각 채팅방의 참여자 수 조회
    const participantCounts = await Promise.all(
      paginatedIds.map(async (roomId) => {
        const count = await this.prisma.chatParticipant.count({
          where: {
            roomId,
            leftAt: null,
            isKicked: false,
          },
        });
        return { roomId, count };
      }),
    );

    // 전주 대비 증감률
    const weeklyChanges = await this.calculateRoomWeeklyChanges(
      paginatedIds,
      startDate,
      endDate,
    );

    const roomStats = paginatedIds.map((roomId) => {
      const stat = stats.find((s) => s.roomId === roomId);
      const room = rooms.find((r) => r.id === roomId);
      const participantCount = participantCounts.find((pc) => pc.roomId === roomId);
      const weeklyChange = weeklyChanges.find((wc) => wc.roomId === roomId);

      return {
        roomId,
        roomName: room?.name || '알 수 없음',
        roomType: room?.type || '',
        category: room?.category || '',
        messageCount: stat?._count.id || 0,
        participantCount: participantCount?.count || 0,
        weeklyChange: weeklyChange?.change || 0,
      };
    });

    return {
      rooms: roomStats,
      total,
      page,
      limit,
    };
  }

  /**
   * Where 조건 생성
   */
  private buildWhereClause(query: ChatStatsQueryDto) {
    const { startDate, endDate, scope, roomId, category } = query;

    const where: any = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      isDeleted: false,
    };

    if (scope === 'room' && roomId) {
      where.roomId = roomId;
    }

    if (scope === 'category' && category) {
      where.room = {
        category,
      };
    }

    return where;
  }

  /**
   * 전주 대비 증감률 계산 (회원)
   */
  private async calculateWeeklyChanges(
    userIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Array<{ userId: string; change: number }>> {
    const currentPeriod = new Date(endDate).getTime() - new Date(startDate).getTime();
    const previousStartDate = new Date(new Date(startDate).getTime() - currentPeriod);
    const previousEndDate = new Date(startDate);

    const previousStats = await this.prisma.chatMessage.groupBy({
      by: ['senderId'],
      where: {
        senderId: { in: userIds },
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
        isDeleted: false,
      },
      _count: { id: true },
    });

    const currentStats = await this.prisma.chatMessage.groupBy({
      by: ['senderId'],
      where: {
        senderId: { in: userIds },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        isDeleted: false,
      },
      _count: { id: true },
    });

    return userIds.map((userId) => {
      const current = currentStats.find((s) => s.senderId === userId)?._count.id || 0;
      const previous = previousStats.find((s) => s.senderId === userId)?._count.id || 0;

      const change = previous > 0 ? ((current - previous) / previous) * 100 : 100;

      return {
        userId,
        change: Math.round(change * 10) / 10,
      };
    });
  }

  /**
   * 전주 대비 증감률 계산 (채팅방)
   */
  private async calculateRoomWeeklyChanges(
    roomIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Array<{ roomId: string; change: number }>> {
    const currentPeriod = new Date(endDate).getTime() - new Date(startDate).getTime();
    const previousStartDate = new Date(new Date(startDate).getTime() - currentPeriod);
    const previousEndDate = new Date(startDate);

    const previousStats = await this.prisma.chatMessage.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: roomIds },
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
        isDeleted: false,
      },
      _count: { id: true },
    });

    const currentStats = await this.prisma.chatMessage.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: roomIds },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        isDeleted: false,
      },
      _count: { id: true },
    });

    return roomIds.map((roomId) => {
      const current = currentStats.find((s) => s.roomId === roomId)?._count.id || 0;
      const previous = previousStats.find((s) => s.roomId === roomId)?._count.id || 0;

      const change = previous > 0 ? ((current - previous) / previous) * 100 : 100;

      return {
        roomId,
        change: Math.round(change * 10) / 10,
      };
    });
  }
}
