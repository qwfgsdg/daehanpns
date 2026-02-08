import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async createAdminLog(data: {
    adminId?: string;
    action: string;
    target?: string;
    targetType?: string;
    description?: string;
    changesBefore?: any;
    changesAfter?: any;
    status?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // 민감한 정보 필터링 (password 제외)
    const filterSensitiveData = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const filtered = { ...obj };
      delete filtered.password;
      return filtered;
    };

    return this.prisma.adminLog.create({
      data: {
        ...data,
        changesBefore: data.changesBefore ? filterSensitiveData(data.changesBefore) : undefined,
        changesAfter: data.changesAfter ? filterSensitiveData(data.changesAfter) : undefined,
      },
    });
  }

  async getAdminLogs(adminId?: string, limit: number = 100) {
    return this.prisma.adminLog.findMany({
      where: adminId ? { adminId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        admin: {
          select: {
            realName: true,
            salesName: true,
            loginId: true,
          },
        },
      },
    });
  }

  /**
   * 특정 대상의 이력 조회 (회원/관리자/전문가 등)
   */
  async findByTarget(targetType: string, targetId: string, params?: {
    skip?: number;
    take?: number;
  }) {
    const where = {
      target: targetId,
      targetType,
    };

    const [logs, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        skip: params?.skip || 0,
        take: params?.take || 50,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              realName: true,
              salesName: true,
              loginId: true,
              tier: true,
            },
          },
        },
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return {
      logs,
      total,
      skip: params?.skip || 0,
      take: params?.take || 50,
    };
  }

  /**
   * 고급 필터링으로 로그 조회
   */
  async findAll(params?: {
    adminId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};

    if (params?.adminId) {
      where.adminId = params.adminId;
    }

    if (params?.action) {
      where.action = params.action;
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        // 종료일의 23:59:59까지 포함
        const endOfDay = new Date(params.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    if (params?.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { target: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { admin: { realName: { contains: params.search, mode: 'insensitive' } } },
        { admin: { salesName: { contains: params.search, mode: 'insensitive' } } },
        { admin: { loginId: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        skip: params?.skip || 0,
        take: params?.take || 50,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              realName: true,
              salesName: true,
              loginId: true,
              tier: true,
            },
          },
        },
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return {
      logs,
      total,
      skip: params?.skip || 0,
      take: params?.take || 50,
    };
  }

  /**
   * 고유한 액션 타입 목록 조회 (필터용)
   */
  async getUniqueActions() {
    const logs = await this.prisma.adminLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    return logs.map((log) => log.action);
  }

  /**
   * 로그 통계
   */
  async getStats(params?: { startDate?: Date; endDate?: Date }) {
    const where: any = {};

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        const endOfDay = new Date(params.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    const [totalLogs, actionStats, adminStats] = await Promise.all([
      this.prisma.adminLog.count({ where }),
      this.prisma.adminLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.adminLog.groupBy({
        by: ['adminId'],
        where,
        _count: true,
        orderBy: { _count: { adminId: 'desc' } },
        take: 10,
      }),
    ]);

    // 관리자 정보 추가 (null 제외)
    const adminIds = adminStats.map((stat) => stat.adminId).filter((id): id is string => id !== null);
    const admins = await this.prisma.admin.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, realName: true, salesName: true, loginId: true },
    });

    const adminStatsWithInfo = adminStats.map((stat) => {
      const admin = admins.find((a) => a.id === stat.adminId);
      return {
        adminId: stat.adminId,
        adminName: admin?.realName || '알 수 없음',
        adminLoginId: admin?.loginId || '알 수 없음',
        count: stat._count,
      };
    });

    return {
      totalLogs,
      topActions: actionStats.map((stat) => ({
        action: stat.action,
        count: stat._count,
      })),
      topAdmins: adminStatsWithInfo,
    };
  }

  /**
   * 엑셀로 내보내기
   */
  async exportToExcel(params?: {
    adminId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }) {
    // 모든 로그 가져오기 (페이지네이션 없이)
    const { logs } = await this.findAll({
      ...params,
      skip: 0,
      take: 100000, // 최대 10만 건
    });

    // 엑셀 데이터 준비
    const excelData = logs.map((log) => ({
      일시: new Date(log.createdAt).toLocaleString('ko-KR'),
      관리자명: log.admin?.realName || '알 수 없음',
      '관리자 ID': log.admin?.loginId || '알 수 없음',
      액션: log.action,
      대상: log.target || '-',
      설명: log.description || '-',
      'IP 주소': log.ipAddress || '-',
      'User Agent': log.userAgent || '-',
    }));

    // 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '관리자 로그');

    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 20 }, // 일시
      { wch: 15 }, // 관리자명
      { wch: 15 }, // 관리자 ID
      { wch: 20 }, // 액션
      { wch: 30 }, // 대상
      { wch: 40 }, // 설명
      { wch: 15 }, // IP 주소
      { wch: 50 }, // User Agent
    ];

    // 버퍼로 변환
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
