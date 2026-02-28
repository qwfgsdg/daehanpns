import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';

@Injectable()
export class ManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 추천 코드로 담당자 조회
   */
  async findByReferralCode(referralCode: string) {
    const manager = await this.prisma.admin.findUnique({
      where: { referralCode },
      select: {
        id: true,
        salesName: true,
        affiliationCode: true,
      },
    });

    if (!manager) {
      throw new NotFoundException('유효하지 않은 추천 코드입니다');
    }

    // 회원가입 시에는 영업자명+소속코드만 반환
    return {
      id: manager.id,
      name: manager.salesName,
      affiliationCode: manager.affiliationCode,
    };
  }

  /**
   * 이름으로 담당자 검색
   * name이 빈 문자열이면 모든 활성 관리자 반환
   */
  async searchByName(name: string) {
    // 빈 문자열이 아닌 경우에만 최소 길이 체크
    if (name && name.trim().length > 0 && name.trim().length < 2) {
      throw new BadRequestException('검색어는 최소 2자 이상이어야 합니다');
    }

    const managers = await this.prisma.admin.findMany({
      where: {
        ...(name && name.trim().length > 0
          ? { salesName: { contains: name.trim() } }
          : {}), // 빈 문자열이면 조건 없음 (모든 관리자)
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        salesName: true,
        affiliationCode: true,
      },
      orderBy: [
        { salesName: 'asc' },
      ],
      take: 100, // 최대 100명까지
    });

    // 회원가입 시에는 영업자명+소속코드만 반환
    return managers.map((manager) => ({
      id: manager.id,
      name: manager.salesName,
      affiliationCode: manager.affiliationCode,
    }));
  }

  /**
   * 회원의 담당자 변경
   */
  async changeManager(
    userId: string,
    newManagerId: string,
    changedBy: string,
    reason?: string,
  ) {
    // 회원 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        manager: {
          select: {
            id: true,
            realName: true,
            salesName: true,
            region: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다');
    }

    // 새 담당자 조회
    const newManager = await this.prisma.admin.findUnique({
      where: { id: newManagerId },
      select: {
        id: true,
        realName: true,
        salesName: true,
        region: true,
      },
    });

    if (!newManager) {
      throw new NotFoundException('담당자를 찾을 수 없습니다');
    }

    // 이미 같은 담당자인 경우
    if (user.managerId === newManagerId) {
      throw new BadRequestException('이미 해당 담당자로 배정되어 있습니다');
    }

    const fromManagerId = user.managerId;
    const fromManagerName = user.manager?.realName || '없음';

    // 트랜잭션으로 변경 및 히스토리 기록
    const [updatedUser] = await this.prisma.$transaction([
      // 회원의 담당자 업데이트
      this.prisma.user.update({
        where: { id: userId },
        data: {
          managerId: newManagerId,
        },
        include: {
          manager: true,
        },
      }),

      // 히스토리 기록
      this.prisma.managerHistory.create({
        data: {
          userId,
          fromManagerId,
          toManagerId: newManagerId,
          changedBy,
          reason,
        },
      }),
    ]);

    // 관리자 로그 기록
    await this.logsService.createAdminLog({
      adminId: changedBy,
      action: 'MANAGER_CHANGE',
      target: userId,
      targetType: 'USER',
      description: `담당자 변경: ${fromManagerName} → ${newManager.realName}${reason ? ` (사유: ${reason})` : ''}`,
      changesBefore: {
        managerId: fromManagerId,
        managerName: fromManagerName,
      },
      changesAfter: {
        managerId: newManagerId,
        managerName: newManager.realName,
      },
      status: 'SUCCESS',
    });

    return updatedUser;
  }

  /**
   * 회원의 담당자 변경 히스토리 조회
   */
  async getManagerHistory(userId: string) {
    const history = await this.prisma.managerHistory.findMany({
      where: { userId },
      include: {
        toManager: {
          select: {
            id: true,
            realName: true,
            salesName: true,
            region: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // fromManager 정보도 추가 (별도 쿼리)
    const enrichedHistory = await Promise.all(
      history.map(async (record) => {
        let fromManager: { id: string; realName: string; salesName: string; region: string | null } | null = null;
        if (record.fromManagerId) {
          fromManager = await this.prisma.admin.findUnique({
            where: { id: record.fromManagerId },
            select: {
              id: true,
              realName: true,
              salesName: true,
              region: true,
            },
          });
        }

        return {
          ...record,
          fromManager,
        };
      }),
    );

    return enrichedHistory;
  }

  /**
   * 담당자별 회원 통계
   */
  async getManagerStats(managerId: string) {
    const [totalCount, thisMonthCount, memberTypeBreakdown] = await Promise.all([
      // 전체 담당 회원 수
      this.prisma.user.count({
        where: {
          managerId,
          deletedAt: null,
        },
      }),

      // 이번 달 신규 가입 회원 수
      this.prisma.user.count({
        where: {
          managerId,
          deletedAt: null,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // 회원 유형별 분포
      this.prisma.user.groupBy({
        by: ['memberType'],
        where: {
          managerId,
          deletedAt: null,
        },
        _count: true,
      }),
    ]);

    // 가입 경로별 통계
    const referralSourceBreakdown = await this.prisma.user.groupBy({
      by: ['referralSource'],
      where: {
        managerId,
        deletedAt: null,
      },
      _count: true,
    });

    return {
      totalCount,
      thisMonthCount,
      memberTypeBreakdown: memberTypeBreakdown.map((item) => ({
        type: item.memberType,
        count: item._count,
      })),
      referralSourceBreakdown: referralSourceBreakdown.map((item) => ({
        source: item.referralSource,
        count: item._count,
      })),
    };
  }
}
