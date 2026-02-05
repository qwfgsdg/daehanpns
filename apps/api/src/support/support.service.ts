import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { Faq, Report, ReportStatus, Prisma } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  // ==================== FAQ ====================

  /**
   * Create FAQ
   */
  async createFaq(data: {
    question: string;
    answer: string;
    category: string;
  }): Promise<Faq> {
    return this.prisma.faq.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category,
      },
    });
  }

  /**
   * Get all FAQs with filters
   */
  async getFaqs(params: {
    category?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.FaqWhereInput = {};

    if (params.category) where.category = params.category;
    if (params.search) {
      where.OR = [
        { question: { contains: params.search, mode: 'insensitive' } },
        { answer: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [faqs, total] = await Promise.all([
      this.prisma.faq.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.faq.count({ where }),
    ]);

    return { faqs, total };
  }

  /**
   * Get FAQ by ID
   */
  async getFaqById(id: string): Promise<Faq | null> {
    return this.prisma.faq.findUnique({ where: { id } });
  }

  /**
   * Update FAQ
   */
  async updateFaq(
    id: string,
    data: {
      question?: string;
      answer?: string;
      category?: string;
    },
    actorId?: string,
  ): Promise<Faq> {
    const before = await this.getFaqById(id);
    const updated = await this.prisma.faq.update({
      where: { id },
      data,
    });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'FAQ_UPDATE',
        targetType: 'faq',
        targetId: id,
        details: { before, after: updated },
      });
    }

    return updated;
  }

  /**
   * Delete FAQ
   */
  async deleteFaq(id: string, actorId?: string): Promise<void> {
    const faq = await this.getFaqById(id);

    await this.prisma.faq.delete({ where: { id } });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'FAQ_DELETE',
        targetType: 'faq',
        targetId: id,
        details: { deleted: faq },
      });
    }
  }

  // ==================== REPORTS ====================

  /**
   * Create report
   */
  async createReport(data: {
    reporterId: string;
    targetType: string;
    targetId: string;
    reason: string;
  }): Promise<Report> {
    return this.prisma.report.create({
      data: {
        reporterId: data.reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        status: 'SUBMITTED',
      },
    });
  }

  /**
   * Get all reports with filters
   */
  async getReports(params: {
    status?: ReportStatus;
    reporterId?: string;
    targetType?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ReportWhereInput = {};

    if (params.status) where.status = params.status;
    if (params.reporterId) where.reporterId = params.reporterId;
    if (params.targetType) where.targetType = params.targetType;
    if (params.search) {
      where.OR = [
        { reason: { contains: params.search, mode: 'insensitive' } },
        { adminMemo: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total };
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<Report | null> {
    return this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    id: string,
    status: ReportStatus,
    adminId: string,
    adminMemo?: string,
  ): Promise<Report> {
    const before = await this.getReportById(id);
    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status,
        adminId,
        adminMemo,
      },
    });

    await this.logsService.create({
      actorId: adminId,
      actionType: 'REPORT_STATUS_UPDATE',
      targetType: 'report',
      targetId: id,
      details: {
        before: before?.status,
        after: status,
        adminMemo,
      },
    });

    return updated;
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId: string): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get unresolved reports count
   */
  async getUnresolvedCount(): Promise<number> {
    return this.prisma.report.count({
      where: {
        status: { in: ['SUBMITTED', 'REVIEWING'] },
      },
    });
  }
}
