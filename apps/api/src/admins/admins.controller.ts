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
  BadRequestException,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';
import { PermissionGuard } from '../modules/auth/guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminTier } from '@prisma/client';

@Controller('admins')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  /**
   * Get all admins with filters
   */
  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async findAll(
    @Req() req: any,
    @Query('tier') tier?: AdminTier,
    @Query('isActive') isActive?: string,
    @Query('region') region?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = { tier, region, search };

    if (isActive !== undefined) params.isActive = isActive === 'true';
    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.adminsService.findAll(params, req.user);
  }

  /**
   * Get admin by ID
   */
  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async findOne(@Param('id') id: string) {
    return this.adminsService.findById(id);
  }

  /**
   * Create new admin
   */
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async create(
    @Body()
    data: {
      loginId: string;
      email?: string;
      password: string;
      realName: string;
      salesName: string;
      tier: AdminTier;
      region?: string;
      logoUrl?: string;
    },
    @Req() req: any,
  ) {
    try {
      return await this.adminsService.create(data, req.user.id);
    } catch (error) {
      throw new BadRequestException(error.message || '관리자 생성에 실패했습니다.');
    }
  }

  /**
   * Update admin
   */
  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.adminsService.update(id, data, req.user.id);
  }

  /**
   * Update admin password
   */
  @Put(':id/password')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async updatePassword(
    @Param('id') id: string,
    @Body('password') password: string,
    @Req() req: any,
  ) {
    await this.adminsService.updatePassword(id, password, req.user.id);
    return { success: true };
  }

  /**
   * Unlock admin (통합관리자만)
   */
  @Post(':id/unlock')
  @UseGuards(PermissionGuard)
  @RequirePermission('unlock.all')
  async unlock(@Param('id') id: string, @Req() req: any) {
    return this.adminsService.unlock(id, req.user.id);
  }

  /**
   * Get admin permissions
   */
  @Get(':id/permissions')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async getPermissions(@Param('id') id: string) {
    return this.adminsService.getPermissions(id);
  }

  /**
   * Set admin permission
   */
  @Put(':id/permissions/:permission')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async setPermission(
    @Param('id') id: string,
    @Param('permission') permission: string,
    @Req() req: any,
  ) {
    return this.adminsService.setPermission(id, permission, req.user.id);
  }

  /**
   * Generate invite link
   */
  @Get(':id/invite-link')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async getInviteLink(@Param('id') id: string, @Query('baseUrl') baseUrl: string) {
    const admin = await this.adminsService.findById(id);
    if (!admin || !admin.affiliationCode) {
      throw new Error('Admin not found or has no affiliation code');
    }
    const link = this.adminsService.generateInviteLink(
      admin.affiliationCode,
      baseUrl || 'https://daehanpns.net',
    );
    return { link, affiliationCode: admin.affiliationCode };
  }

  /**
   * Create temporary account
   */
  @Post('temp-account')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.temp_account')
  async createTempAccount(
    @Body('affiliationCode') affiliationCode: string,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    return this.adminsService.createTempAccount(
      affiliationCode,
      name,
      req.user.id,
    );
  }

  /**
   * Update representative admin logo (통합관리자만)
   */
  @Put(':id/logo')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.logo')
  async updateLogo(
    @Param('id') id: string,
    @Body('logoUrl') logoUrl: string,
    @Req() req: any,
  ) {
    return this.adminsService.updateLogo(id, logoUrl, req.user.id);
  }

  /**
   * Get deletion preview - check subordinates and affected data
   */
  @Get(':id/deletion-preview')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async getDeletionPreview(@Param('id') id: string) {
    return this.adminsService.getDeletionPreview(id);
  }

  /**
   * Delete admin with subordinates handling
   */
  @Post(':id/delete-with-subordinates')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async deleteWithSubordinates(
    @Param('id') id: string,
    @Body()
    body: {
      mainAdminUsersTarget?: string;
      actions: Array<{
        subordinateId: string;
        action: 'reassign' | 'delete';
        targetAdminId?: string;
      }>;
    },
    @Req() req: any,
  ) {
    try {
      return await this.adminsService.deleteWithSubordinates(
        id,
        body.mainAdminUsersTarget || null,
        body.actions,
        req.user.id,
      );
    } catch (error) {
      throw new BadRequestException(error.message || '삭제 처리에 실패했습니다.');
    }
  }

  /**
   * Delete admin (soft delete)
   */
  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.adminsService.delete(id, req.user.id);
    return { success: true };
  }
}
