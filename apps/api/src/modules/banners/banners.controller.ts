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
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { BannerPos } from '@prisma/client';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  /**
   * 배너 생성 (관리자 전용)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannersService.create(createBannerDto);
  }

  /**
   * 배너 목록 조회
   */
  @Get()
  findAll(
    @Query('position') position?: BannerPos,
    @Query('isActive') isActive?: string,
  ) {
    return this.bannersService.findAll({
      position,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  /**
   * 배너 상세 조회
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  /**
   * 배너 수정 (관리자 전용)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto) {
    return this.bannersService.update(id, updateBannerDto);
  }

  /**
   * 배너 삭제 (관리자 전용)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }

  /**
   * 배너 순서 변경 (관리자 전용)
   */
  @Patch(':id/order')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  updateOrder(@Param('id') id: string, @Body('order') order: number) {
    return this.bannersService.updateOrder(id, order);
  }

  /**
   * 배너 활성화/비활성화 토글 (관리자 전용)
   */
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  toggleActive(@Param('id') id: string) {
    return this.bannersService.toggleActive(id);
  }
}
