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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users with search and filters
   */
  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('members.view')
  async findAll(
    @Query('search') search?: string,
    @Query('affiliationCode') affiliationCode?: string,
    @Query('isBanned') isBanned?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('lastLoginAfter') lastLoginAfter?: string,
    @Query('lastLoginBefore') lastLoginBefore?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    const params: any = { search, affiliationCode };

    if (isBanned !== undefined) params.isBanned = isBanned === 'true';
    if (createdAfter) params.createdAfter = new Date(createdAfter);
    if (createdBefore) params.createdBefore = new Date(createdBefore);
    if (lastLoginAfter) params.lastLoginAfter = new Date(lastLoginAfter);
    if (lastLoginBefore) params.lastLoginBefore = new Date(lastLoginBefore);
    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);
    if (orderBy) {
      const [field, order] = orderBy.split(':');
      params.orderBy = { [field]: order || 'asc' };
    }

    return this.usersService.findAll(params);
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.view')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const user = await this.usersService.findById(id);

    // Apply phone masking if admin doesn't have unmask permission
    if (
      user &&
      !req.user.permissions?.includes('members.unmask_phone') &&
      user.phone
    ) {
      user.phone = this.usersService.maskPhone(user.phone, user.createdAt);
    }

    return user;
  }

  /**
   * Update user
   */
  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.update')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    return this.usersService.update(id, updateData, req.user.id);
  }

  /**
   * Ban user
   */
  @Post(':id/ban')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.ban')
  async ban(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.usersService.ban(id, reason, req.user.id);
  }

  /**
   * Unban user
   */
  @Post(':id/unban')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.ban')
  async unban(@Param('id') id: string, @Req() req: any) {
    return this.usersService.unban(id, req.user.id);
  }

  /**
   * Get user memos
   */
  @Get(':id/memos')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.view')
  async getMemos(@Param('id') id: string) {
    return this.usersService.getMemos(id);
  }

  /**
   * Create memo for user
   */
  @Post(':id/memos')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.memo')
  async createMemo(
    @Param('id') id: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.usersService.createMemo(id, req.user.id, content);
  }

  /**
   * Update memo
   */
  @Put('memos/:memoId')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.memo')
  async updateMemo(
    @Param('memoId') memoId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.usersService.updateMemo(memoId, content, req.user.id);
  }

  /**
   * Delete memo
   */
  @Delete('memos/:memoId')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.memo')
  async deleteMemo(@Param('memoId') memoId: string, @Req() req: any) {
    await this.usersService.deleteMemo(memoId, req.user.id);
    return { success: true };
  }

  /**
   * Export users to Excel (통합관리자만)
   */
  @Get('export/excel')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.excel')
  async exportExcel(@Query() filters: any, @Res() res: Response) {
    const buffer = await this.usersService.exportToExcel(filters);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.send(buffer);
  }

  /**
   * Get profile image upload URL
   */
  @Get(':id/profile-image-upload-url')
  async getProfileImageUploadUrl(@Param('id') id: string) {
    const url = await this.usersService.getProfileImageUploadUrl(id);
    return { url };
  }

  /**
   * Get inactive users
   */
  @Get('inactive/list')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.view')
  async getInactiveUsers(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.usersService.getInactiveUsers(daysNum);
  }
}
