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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Platform } from '@prisma/client';

@Controller('app-versions')
export class AppVersionsController {
  constructor(private readonly appVersionsService: AppVersionsService) {}

  /**
   * Get minimum version for platform (public)
   */
  @Get('min')
  async getMinVersion(@Query('platform') platform: Platform) {
    return this.appVersionsService.getMinVersion(platform);
  }

  /**
   * Check if app version is valid (public)
   */
  @Get('check')
  async checkVersion(
    @Query('platform') platform: Platform,
    @Query('version') version: string,
  ) {
    const minVersion = await this.appVersionsService.getMinVersion(platform);

    if (!minVersion) {
      return { valid: true, updateRequired: false };
    }

    const valid = this.appVersionsService.isVersionValid(
      version,
      minVersion.minVersion,
    );

    return {
      valid,
      updateRequired: !valid,
      minVersion: minVersion.minVersion,
    };
  }

  /**
   * Get all app versions (admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('app_versions.manage')
  async getAll() {
    return this.appVersionsService.getAll();
  }

  /**
   * Set minimum version (통합관리자만)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('app_versions.manage')
  async setMinVersion(
    @Body() data: { platform: Platform; minVersion: string },
    @Req() req: any,
  ) {
    return this.appVersionsService.setMinVersion(
      data.platform,
      data.minVersion,
      req.user.id,
    );
  }
}
