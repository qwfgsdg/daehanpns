import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppVersionsService } from './app-versions.service';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { Platform } from '@prisma/client';

@Controller('app-versions')
export class AppVersionsController {
  constructor(private readonly appVersionsService: AppVersionsService) {}

  /**
   * 버전 등록 (관리자 전용)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  create(@Body() createAppVersionDto: CreateAppVersionDto) {
    return this.appVersionsService.create(createAppVersionDto);
  }

  /**
   * 버전 목록 조회 (관리자 전용)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  findAll(@Query('platform') platform?: Platform) {
    return this.appVersionsService.findAll(platform);
  }

  /**
   * 최신 버전 조회 (클라이언트용)
   */
  @Get('latest/:platform')
  findLatest(@Param('platform') platform: Platform) {
    return this.appVersionsService.findLatest(platform);
  }

  /**
   * 버전 체크 (클라이언트용)
   */
  @Get('check/:platform')
  checkVersion(
    @Param('platform') platform: Platform,
    @Query('version') version: string,
    @Query('buildNumber') buildNumber: string,
  ) {
    return this.appVersionsService.checkVersion(
      platform,
      version,
      parseInt(buildNumber),
    );
  }

  /**
   * 버전 상세 조회
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  findOne(@Param('id') id: string) {
    return this.appVersionsService.findOne(id);
  }

  /**
   * 버전 수정 (관리자 전용)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  update(@Param('id') id: string, @Body() updateAppVersionDto: UpdateAppVersionDto) {
    return this.appVersionsService.update(id, updateAppVersionDto);
  }

  /**
   * 버전 삭제 (관리자 전용)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.appVersionsService.remove(id);
  }
}
