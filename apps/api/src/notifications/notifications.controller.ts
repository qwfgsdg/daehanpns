import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { NotifCategory } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Register FCM token
   */
  @Post('register-token')
  async registerToken(@Body('token') token: string, @Req() req: any) {
    await this.notificationsService.registerFcmToken(req.user.id, token);
    return { success: true };
  }

  /**
   * Get user notifications
   */
  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const params: any = {};

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);
    if (unreadOnly) params.unreadOnly = unreadOnly === 'true';

    return this.notificationsService.getNotifications(req.user.id, params);
  }

  /**
   * Get unread count
   */
  @Get('unread/count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  /**
   * Mark notification as read
   */
  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  /**
   * Mark all as read
   */
  @Put('read/all')
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  /**
   * Delete notification
   */
  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    await this.notificationsService.deleteNotification(id);
    return { success: true };
  }

  // ==================== SETTINGS ====================

  /**
   * Get notification settings
   */
  @Get('settings')
  async getSettings(@Req() req: any) {
    return this.notificationsService.getSettings(req.user.id);
  }

  /**
   * Update notification setting
   */
  @Put('settings/:category')
  async updateSetting(
    @Param('category') category: NotifCategory,
    @Body('enabled') enabled: boolean,
    @Req() req: any,
  ) {
    return this.notificationsService.updateSetting(
      req.user.id,
      category,
      enabled,
    );
  }

  /**
   * Initialize default settings
   */
  @Post('settings/initialize')
  async initializeSettings(@Req() req: any) {
    await this.notificationsService.initializeSettings(req.user.id);
    return { success: true };
  }
}
