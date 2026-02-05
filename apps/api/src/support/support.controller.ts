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
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ReportStatus } from '@prisma/client';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ==================== FAQ ====================

  /**
   * Get all FAQs (public)
   */
  @Get('faq')
  async getFaqs(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = { category, search };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.supportService.getFaqs(params);
  }

  /**
   * Get FAQ by ID (public)
   */
  @Get('faq/:id')
  async getFaqById(@Param('id') id: string) {
    return this.supportService.getFaqById(id);
  }

  /**
   * Create FAQ (admin only)
   */
  @Post('faq')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('support.manage')
  async createFaq(
    @Body() data: { question: string; answer: string; category: string },
  ) {
    return this.supportService.createFaq(data);
  }

  /**
   * Update FAQ (admin only)
   */
  @Put('faq/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('support.manage')
  async updateFaq(
    @Param('id') id: string,
    @Body() data: { question?: string; answer?: string; category?: string },
    @Req() req: any,
  ) {
    return this.supportService.updateFaq(id, data, req.user.id);
  }

  /**
   * Delete FAQ (admin only)
   */
  @Delete('faq/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('support.manage')
  async deleteFaq(@Param('id') id: string, @Req() req: any) {
    await this.supportService.deleteFaq(id, req.user.id);
    return { success: true };
  }

  // ==================== REPORTS ====================

  /**
   * Create report (authenticated users)
   */
  @Post('reports')
  @UseGuards(JwtAuthGuard)
  async createReport(
    @Body() data: { targetType: string; targetId: string; reason: string },
    @Req() req: any,
  ) {
    return this.supportService.createReport({
      reporterId: req.user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
    });
  }

  /**
   * Get user's own reports
   */
  @Get('reports/my')
  @UseGuards(JwtAuthGuard)
  async getMyReports(@Req() req: any) {
    return this.supportService.getUserReports(req.user.id);
  }

  /**
   * Get report by ID
   */
  @Get('reports/:id')
  @UseGuards(JwtAuthGuard)
  async getReportById(@Param('id') id: string, @Req() req: any) {
    const report = await this.supportService.getReportById(id);

    // Check if user is reporter or admin
    const isAdmin = req.user.type === 'admin';
    const isReporter = report?.reporterId === req.user.id;

    if (!isAdmin && !isReporter) {
      throw new Error('Unauthorized');
    }

    return report;
  }

  /**
   * Get all reports (admin only)
   */
  @Get('reports')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('support.manage')
  async getReports(
    @Query('status') status?: ReportStatus,
    @Query('reporterId') reporterId?: string,
    @Query('targetType') targetType?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = { status, reporterId, targetType, search };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.supportService.getReports(params);
  }

  /**
   * Update report status (admin only)
   */
  @Put('reports/:id/status')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('support.manage')
  async updateReportStatus(
    @Param('id') id: string,
    @Body() data: { status: ReportStatus; adminMemo?: string },
    @Req() req: any,
  ) {
    return this.supportService.updateReportStatus(
      id,
      data.status,
      req.user.id,
      data.adminMemo,
    );
  }

  /**
   * Get unresolved reports count
   */
  @Get('reports/stats/unresolved')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async getUnresolvedCount() {
    const count = await this.supportService.getUnresolvedCount();
    return { count };
  }
}
