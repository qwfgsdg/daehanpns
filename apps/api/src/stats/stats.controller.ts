import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';
import { StatsService } from './stats.service';
import {
  ChatStatsQueryDto,
  UserStatsQueryDto,
  TopUsersQueryDto,
} from './dto/chat-stats-query.dto';

@Controller('stats/chat')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  /**
   * 전체 통계 요약
   * GET /api/stats/chat/summary
   */
  @Get('summary')
  async getSummary(@Query() query: ChatStatsQueryDto) {
    return this.statsService.getChatStatsSummary(query);
  }

  /**
   * TOP 10 활동 회원
   * GET /api/stats/chat/top-users
   */
  @Get('top-users')
  async getTopUsers(@Query() query: TopUsersQueryDto) {
    return this.statsService.getTopUsers(query);
  }

  /**
   * 일별 메시지 추이
   * GET /api/stats/chat/daily-trend
   */
  @Get('daily-trend')
  async getDailyTrend(@Query() query: ChatStatsQueryDto) {
    return this.statsService.getDailyTrend(query);
  }

  /**
   * 회원별 통계 (페이지네이션)
   * GET /api/stats/chat/users
   */
  @Get('users')
  async getUserStats(@Query() query: UserStatsQueryDto) {
    return this.statsService.getUserStats(query);
  }

  /**
   * 채팅방별 통계
   * GET /api/stats/chat/rooms
   */
  @Get('rooms')
  async getRoomStats(@Query() query: UserStatsQueryDto) {
    return this.statsService.getRoomStats(query);
  }
}
