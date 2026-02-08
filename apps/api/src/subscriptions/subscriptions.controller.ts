import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';
import { PermissionGuard } from '../modules/auth/guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { SubscriptionStatus, RoomType } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * List subscriptions with filters (Admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async findAll(
    @Query('userId') userId?: string,
    @Query('expertId') expertId?: string,
    @Query('status') status?: SubscriptionStatus,
    @Query('roomType') roomType?: RoomType,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = {
      userId,
      expertId,
      status,
      roomType,
      search,
    };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.subscriptionsService.findAll(params);
  }

  /**
   * Create subscription (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async create(
    @Body()
    data: {
      userId: string;
      expertId: string;
      roomType: RoomType;
      durationMonths: number;
      startDate: string;
      depositName?: string;
      depositAmount?: number;
      adminMemo?: string;
    },
    @Req() req: any,
  ) {
    return this.subscriptionsService.createSubscription(
      {
        userId: data.userId,
        expertId: data.expertId,
        roomType: data.roomType,
        durationMonths: data.durationMonths,
        startDate: new Date(data.startDate),
        depositName: data.depositName,
        depositAmount: data.depositAmount,
        adminMemo: data.adminMemo,
      },
      req.user.id,
    );
  }

  /**
   * Get subscription by ID (Admin only)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findById(id);
  }

  /**
   * Cancel subscription (Admin only)
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Req() req?: any,
  ) {
    return this.subscriptionsService.cancelSubscription(
      id,
      req.user.id,
      reason,
    );
  }

  /**
   * Extend subscription duration (Admin only)
   */
  @Post(':id/extend')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async extend(
    @Param('id') id: string,
    @Body('additionalMonths') additionalMonths: number,
    @Req() req: any,
  ) {
    return this.subscriptionsService.extendSubscription(
      id,
      additionalMonths,
      req.user.id,
    );
  }

  /**
   * Convert VIP/VVIP (Admin only)
   */
  @Post(':id/convert')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async convert(
    @Param('id') id: string,
    @Body('newRoomType') newRoomType: RoomType,
    @Req() req: any,
  ) {
    return this.subscriptionsService.convertSubscription(
      id,
      newRoomType,
      req.user.id,
    );
  }

  /**
   * Get subscription statistics (Admin only)
   */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async getStats() {
    return this.subscriptionsService.getStats();
  }

  /**
   * Get user's subscription history (Admin only)
   */
  @Get('users/:userId/subscriptions')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async getUserSubscriptions(@Param('userId') userId: string) {
    return this.subscriptionsService.findByUserId(userId);
  }
}
