import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get all dashboard statistics
   */
  @Get('stats')
  async getStats() {
    return this.dashboardService.getDashboardStats();
  }

  /**
   * Get online users count
   */
  @Get('online-users')
  async getOnlineUsers() {
    const count = await this.dashboardService.getOnlineUsersCount();
    return { count };
  }

  /**
   * Get new users count
   */
  @Get('new-users')
  async getNewUsers() {
    const [today, last7Days, last30Days] = await Promise.all([
      this.dashboardService.getNewUsersCount(1),
      this.dashboardService.getNewUsersCount(7),
      this.dashboardService.getNewUsersCount(30),
    ]);

    return {
      today,
      last7Days,
      last30Days,
    };
  }

  /**
   * Get registration trend
   */
  @Get('registration-trend')
  async getRegistrationTrend() {
    const [last7Days, last30Days] = await Promise.all([
      this.dashboardService.getRegistrationTrend(7),
      this.dashboardService.getRegistrationTrend(30),
    ]);

    return {
      last7Days,
      last30Days,
    };
  }
}
