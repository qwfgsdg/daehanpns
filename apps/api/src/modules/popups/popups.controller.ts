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
import { PopupsService } from './popups.service';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';

@Controller('popups')
export class PopupsController {
  constructor(private readonly popupsService: PopupsService) {}

  /**
   * 팝업 생성 (관리자 전용)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  create(@Body() createPopupDto: CreatePopupDto) {
    return this.popupsService.create(createPopupDto);
  }

  /**
   * 팝업 목록 조회 (관리자 전용)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  findAll(@Query('isActive') isActive?: string) {
    return this.popupsService.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  /**
   * 활성 팝업 조회 (클라이언트용)
   */
  @Get('active')
  findActive() {
    return this.popupsService.findActive();
  }

  /**
   * 팝업 상세 조회
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  findOne(@Param('id') id: string) {
    return this.popupsService.findOne(id);
  }

  /**
   * 팝업 수정 (관리자 전용)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  update(@Param('id') id: string, @Body() updatePopupDto: UpdatePopupDto) {
    return this.popupsService.update(id, updatePopupDto);
  }

  /**
   * 팝업 삭제 (관리자 전용)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.popupsService.remove(id);
  }

  /**
   * 팝업 활성화/비활성화 토글 (관리자 전용)
   */
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  toggleActive(@Param('id') id: string) {
    return this.popupsService.toggleActive(id);
  }
}
