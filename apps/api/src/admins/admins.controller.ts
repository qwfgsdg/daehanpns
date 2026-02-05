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
import { AdminsService } from './admins.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
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

    return this.adminsService.findAll(params);
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
      email: string;
      password: string;
      name: string;
      tier: AdminTier;
      region?: string;
      logoUrl?: string;
    },
    @Req() req: any,
  ) {
    return this.adminsService.create(data, req.user.id);
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
  @Put(':id/permissions/:menuKey')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async setPermission(
    @Param('id') id: string,
    @Param('menuKey') menuKey: string,
    @Body('allowed') allowed: boolean,
    @Req() req: any,
  ) {
    return this.adminsService.setPermission(id, menuKey, allowed, req.user.id);
  }

  /**
   * Generate invite link
   */
  @Get(':id/invite-link')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async getInviteLink(@Param('id') id: string, @Query('baseUrl') baseUrl: string) {
    const admin = await this.adminsService.findById(id);
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
   * Deactivate admin
   */
  @Post(':id/deactivate')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async deactivate(@Param('id') id: string, @Req() req: any) {
    return this.adminsService.deactivate(id, req.user.id);
  }

  /**
   * Activate admin
   */
  @Post(':id/activate')
  @UseGuards(PermissionGuard)
  @RequirePermission('admins.manage')
  async activate(@Param('id') id: string, @Req() req: any) {
    return this.adminsService.activate(id, req.user.id);
  }
}
