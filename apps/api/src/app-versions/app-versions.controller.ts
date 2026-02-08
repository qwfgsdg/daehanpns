import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AppVersionsService } from './app-versions.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';
import { PermissionGuard } from '../modules/auth/guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { Platform } from '@prisma/client';

@Controller('app-versions')
export class AppVersionsController {
  constructor(private readonly appVersionsService: AppVersionsService) {}

  /**
   * Get latest version for platform (public)
   */
  @Get('latest')
  async getLatestVersion(@Query('platform') platform: Platform) {
    return this.appVersionsService.getLatestVersion(platform);
  }

  /**
   * Check if app version needs update (public)
   */
  @Get('check')
  async checkVersion(
    @Query('platform') platform: Platform,
    @Query('version') version: string,
    @Query('buildNumber') buildNumber: string,
  ) {
    return this.appVersionsService.checkVersion(
      platform,
      version,
      parseInt(buildNumber, 10),
    );
  }

  /**
   * Get all app versions (admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('app_versions.manage')
  async getAll(@Query('platform') platform?: Platform) {
    if (platform) {
      return this.appVersionsService.getByPlatform(platform);
    }
    return this.appVersionsService.getAll();
  }

  /**
   * Create new app version (통합관리자만)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('app_versions.manage')
  async createVersion(
    @Body()
    data: {
      platform: Platform;
      version: string;
      buildNumber: number;
      isForceUpdate: boolean;
      updateMessage?: string;
      downloadUrl?: string;
    },
    @Req() req: any,
  ) {
    return this.appVersionsService.createVersion(
      data.platform,
      data.version,
      data.buildNumber,
      data.isForceUpdate,
      data.updateMessage || null,
      data.downloadUrl || null,
      req.user.id,
    );
  }
}
