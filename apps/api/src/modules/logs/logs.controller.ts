import {
  Controller,
  Get,
  Query,
  Res,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../../decorators/require-permission.decorator';

@Controller('logs')
@UseGuards(JwtAuthGuard, AdminRoleGuard)  // PermissionGuard 임시 제거
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * 관리자 로그 목록 조회
   */
  @Get()
  // @RequirePermission('logs.view')  // 임시 주석
  async getLogs(
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.logsService.findAll({
      adminId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    });
  }

  /**
   * 특정 대상의 이력 조회
   */
  @Get('target/:targetType/:targetId')
  // @RequirePermission('logs.view')  // 임시 주석
  async getLogsByTarget(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.logsService.findByTarget(targetType, targetId, {
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    });
  }

  /**
   * 액션 타입 목록 조회 (필터용)
   */
  @Get('actions')
  // @RequirePermission('logs.view')  // 임시 주석
  async getActions() {
    return this.logsService.getUniqueActions();
  }

  /**
   * 로그 통계
   */
  @Get('stats')
  // @RequirePermission('logs.view')  // 임시 주석
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.logsService.getStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * 로그 엑셀 다운로드
   */
  @Get('export')
  // @RequirePermission('logs.view')  // 임시 주석
  async exportLogs(
    @Res() res: Response,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const buffer = await this.logsService.exportToExcel({
      adminId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=admin-logs-${new Date().toISOString().split('T')[0]}.xlsx`,
    );

    res.send(buffer);
  }
}
