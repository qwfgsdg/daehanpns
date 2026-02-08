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
import { ExpertsService } from './experts.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';
import { PermissionGuard } from '../modules/auth/guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';

@Controller('experts')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  /**
   * 전문가 목록 조회
   */
  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const params: any = { search };
    if (isActive !== undefined) params.isActive = isActive === 'true';
    return this.expertsService.findAll(params);
  }

  /**
   * 전문가 상세 조회
   */
  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async findOne(@Param('id') id: string) {
    return this.expertsService.findById(id);
  }

  /**
   * 전문가 통계
   */
  @Get(':id/stats')
  @UseGuards(PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async getStats(@Param('id') id: string) {
    return this.expertsService.getStats(id);
  }

  /**
   * 전문가 생성
   */
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async create(
    @Body()
    data: {
      name: string;
      profileImage?: string;
      description?: string;
      vipRoomId?: string;
      vvipRoomId?: string;
    },
    @Req() req: any,
  ) {
    return this.expertsService.create(data, req.user.id);
  }

  /**
   * 전문가 수정
   */
  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      profileImage?: string;
      description?: string;
      vipRoomId?: string;
      vvipRoomId?: string;
      isActive?: boolean;
    },
    @Req() req: any,
  ) {
    return this.expertsService.update(id, data, req.user.id);
  }

  /**
   * 전문가 삭제 (비활성화)
   */
  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('subscriptions.manage')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.expertsService.delete(id, req.user.id);
  }
}
