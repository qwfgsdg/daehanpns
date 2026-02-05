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
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { BannerPos, DismissType } from '@prisma/client';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // ==================== BANNERS ====================

  /**
   * Get active banners (public)
   */
  @Get('active')
  async getActiveBanners(@Query('position') position?: BannerPos) {
    return this.bannersService.getActiveBanners(position);
  }

  /**
   * Get all banners (admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async getBanners(
    @Query('position') position?: BannerPos,
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = { position };

    if (isActive !== undefined) params.isActive = isActive === 'true';
    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.bannersService.getBanners(params);
  }

  /**
   * Get banner by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async getBannerById(@Param('id') id: string) {
    return this.bannersService.getBannerById(id);
  }

  /**
   * Create banner (admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async createBanner(
    @Body()
    data: {
      title: string;
      imageUrl: string;
      linkUrl?: string;
      startAt: string;
      endAt: string;
      position: BannerPos;
    },
  ) {
    return this.bannersService.createBanner({
      ...data,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
    });
  }

  /**
   * Update banner (admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async updateBanner(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    return this.bannersService.updateBanner(id, data, req.user.id);
  }

  /**
   * Delete banner (admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async deleteBanner(@Param('id') id: string, @Req() req: any) {
    await this.bannersService.deleteBanner(id, req.user.id);
    return { success: true };
  }

  // ==================== POPUPS ====================

  /**
   * Get active popups for user
   */
  @Get('popups/active')
  @UseGuards(JwtAuthGuard)
  async getActivePopupsForUser(@Req() req: any) {
    return this.bannersService.getPopupsForUser(req.user.id);
  }

  /**
   * Get all popups (admin only)
   */
  @Get('popups/all')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async getPopups(
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = {};

    if (isActive !== undefined) params.isActive = isActive === 'true';
    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.bannersService.getPopups(params);
  }

  /**
   * Get popup by ID
   */
  @Get('popups/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async getPopupById(@Param('id') id: string) {
    return this.bannersService.getPopupById(id);
  }

  /**
   * Create popup (admin only, max 5 active)
   */
  @Post('popups')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async createPopup(
    @Body()
    data: {
      title: string;
      content?: string;
      imageUrl?: string;
      startAt: string;
      endAt: string;
    },
  ) {
    return this.bannersService.createPopup({
      ...data,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
    });
  }

  /**
   * Update popup (admin only)
   */
  @Put('popups/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async updatePopup(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    return this.bannersService.updatePopup(id, data, req.user.id);
  }

  /**
   * Delete popup (admin only)
   */
  @Delete('popups/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('banners.manage')
  async deletePopup(@Param('id') id: string, @Req() req: any) {
    await this.bannersService.deletePopup(id, req.user.id);
    return { success: true };
  }

  /**
   * Dismiss popup (TODAY or PERMANENT)
   */
  @Post('popups/:id/dismiss')
  @UseGuards(JwtAuthGuard)
  async dismissPopup(
    @Param('id') id: string,
    @Body('dismissType') dismissType: DismissType,
    @Req() req: any,
  ) {
    return this.bannersService.dismissPopup(req.user.id, id, dismissType);
  }

  /**
   * Clear today dismissals (for testing)
   */
  @Delete('popups/dismissals/today')
  @UseGuards(JwtAuthGuard)
  async clearTodayDismissals(@Req() req: any) {
    await this.bannersService.clearTodayDismissals(req.user.id);
    return { success: true };
  }
}
