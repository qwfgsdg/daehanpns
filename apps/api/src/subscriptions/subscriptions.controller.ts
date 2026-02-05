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
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { SubscriptionStatus } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ==================== SUBSCRIPTIONS ====================

  /**
   * Create subscription request
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() data: { planName: string; discountEventId?: string },
    @Req() req: any,
  ) {
    return this.subscriptionsService.create({
      userId: req.user.id,
      planName: data.planName,
      discountEventId: data.discountEventId,
    });
  }

  /**
   * Get user's own subscriptions
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMySubscriptions(@Req() req: any) {
    return this.subscriptionsService.getUserSubscriptions(req.user.id);
  }

  /**
   * Get user's active subscription
   */
  @Get('my/active')
  @UseGuards(JwtAuthGuard)
  async getMyActiveSubscription(@Req() req: any) {
    return this.subscriptionsService.getActiveSubscription(req.user.id);
  }

  /**
   * Get all subscriptions (admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: SubscriptionStatus,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = { userId, status, search };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.subscriptionsService.findAll(params);
  }

  /**
   * Get subscription by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const subscription = await this.subscriptionsService.findById(id);

    // Check if user is owner or admin
    const isAdmin = req.user.type === 'admin';
    const isOwner = subscription?.userId === req.user.id;

    if (!isAdmin && !isOwner) {
      throw new Error('Unauthorized');
    }

    return subscription;
  }

  /**
   * Approve subscription (admin only)
   */
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async approve(
    @Param('id') id: string,
    @Body() data: { durationDays: number; adminMemo?: string },
    @Req() req: any,
  ) {
    return this.subscriptionsService.approve(
      id,
      data.durationDays,
      req.user.id,
      data.adminMemo,
    );
  }

  /**
   * Reject subscription (admin only)
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async reject(
    @Param('id') id: string,
    @Body('adminMemo') adminMemo?: string,
    @Req() req: any,
  ) {
    return this.subscriptionsService.reject(id, req.user.id, adminMemo);
  }

  /**
   * Update subscription (admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    return this.subscriptionsService.update(id, data, req.user.id);
  }

  /**
   * Get subscription stats
   */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async getStats() {
    return this.subscriptionsService.getStats();
  }

  // ==================== DISCOUNT EVENTS ====================

  /**
   * Get active discount events (public)
   */
  @Get('discount-events/active')
  async getActiveDiscountEvents() {
    return this.subscriptionsService.getActiveDiscountEvents();
  }

  /**
   * Get all discount events (admin only)
   */
  @Get('discount-events/all')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async getDiscountEvents(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = {};

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.subscriptionsService.getDiscountEvents(params);
  }

  /**
   * Get discount event by ID
   */
  @Get('discount-events/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async getDiscountEventById(@Param('id') id: string) {
    return this.subscriptionsService.getDiscountEventById(id);
  }

  /**
   * Create discount event (admin only)
   */
  @Post('discount-events')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async createDiscountEvent(
    @Body()
    data: {
      name: string;
      discountRate: number;
      startAt: string;
      endAt: string;
    },
  ) {
    return this.subscriptionsService.createDiscountEvent({
      ...data,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
    });
  }

  /**
   * Update discount event (admin only)
   */
  @Put('discount-events/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async updateDiscountEvent(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    return this.subscriptionsService.updateDiscountEvent(
      id,
      data,
      req.user.id,
    );
  }

  /**
   * Delete discount event (admin only)
   */
  @Delete('discount-events/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('subscriptions.approve')
  async deleteDiscountEvent(@Param('id') id: string, @Req() req: any) {
    await this.subscriptionsService.deleteDiscountEvent(id, req.user.id);
    return { success: true };
  }
}
