import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { Expert } from '@prisma/client';

@Injectable()
export class ExpertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 전문가 목록 조회
   */
  async findAll(params?: {
    isActive?: boolean;
    search?: string;
  }): Promise<{ experts: Expert[]; total: number }> {
    const where: any = {};

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.search) {
      where.name = {
        contains: params.search,
      };
    }

    const [experts, total] = await Promise.all([
      this.prisma.expert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expert.count({ where }),
    ]);

    return { experts, total };
  }

  /**
   * 전문가 상세 조회
   */
  async findById(id: string): Promise<Expert> {
    const expert = await this.prisma.expert.findUnique({
      where: { id },
    });

    if (!expert) {
      throw new NotFoundException('전문가를 찾을 수 없습니다');
    }

    return expert;
  }

  /**
   * 전문가 생성
   */
  async create(
    data: {
      name: string;
      profileImage?: string;
      description?: string;
      vipRoomId?: string;
      vvipRoomId?: string;
    },
    adminId: string,
  ): Promise<Expert> {
    const expert = await this.prisma.expert.create({
      data,
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'EXPERT_CREATE',
      target: expert.id,
      description: `전문가 생성: ${expert.name}`,
    });

    return expert;
  }

  /**
   * 전문가 수정
   */
  async update(
    id: string,
    data: {
      name?: string;
      profileImage?: string;
      description?: string;
      vipRoomId?: string;
      vvipRoomId?: string;
      isActive?: boolean;
    },
    adminId: string,
  ): Promise<Expert> {
    const expert = await this.findById(id);

    const updated = await this.prisma.expert.update({
      where: { id },
      data,
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'EXPERT_UPDATE',
      target: expert.id,
      description: `전문가 수정: ${expert.name}`,
    });

    return updated;
  }

  /**
   * 전문가 삭제 (비활성화)
   */
  async delete(id: string, adminId: string): Promise<Expert> {
    const expert = await this.findById(id);

    // 활성 구독이 있는지 확인
    const activeSubscriptionsCount = await this.prisma.subscription.count({
      where: {
        expertId: id,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptionsCount > 0) {
      throw new BadRequestException(
        `활성 구독이 ${activeSubscriptionsCount}건 있어 삭제할 수 없습니다`,
      );
    }

    const deleted = await this.prisma.expert.update({
      where: { id },
      data: { isActive: false },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'EXPERT_DELETE',
      target: expert.id,
      description: `전문가 비활성화: ${expert.name}`,
    });

    return deleted;
  }

  /**
   * 전문가 통계
   */
  async getStats(expertId: string) {
    const [activeSubscriptions, totalSubscriptions, vipCount, vvipCount] = await Promise.all([
      this.prisma.subscription.count({
        where: { expertId, status: 'ACTIVE' },
      }),
      this.prisma.subscription.count({
        where: { expertId },
      }),
      this.prisma.subscription.count({
        where: { expertId, roomType: 'VIP', status: 'ACTIVE' },
      }),
      this.prisma.subscription.count({
        where: { expertId, roomType: 'VVIP', status: 'ACTIVE' },
      }),
    ]);

    return {
      activeSubscriptions,
      totalSubscriptions,
      vipCount,
      vvipCount,
    };
  }
}
