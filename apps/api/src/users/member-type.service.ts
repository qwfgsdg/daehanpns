import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { MemberType } from '@prisma/client';

@Injectable()
export class MemberTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 회원 유형 변경
   */
  async changeMemberType(
    userId: string,
    toType: MemberType,
    showCoinRooms: boolean,
    adminId: string,
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    const fromType = user.memberType;
    const previousShowCoinRooms = user.showCoinRooms;

    // 변경사항이 없으면 에러
    if (fromType === toType && previousShowCoinRooms === showCoinRooms) {
      throw new BadRequestException('변경사항이 없습니다.');
    }

    // 회원 유형 업데이트
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        memberType: toType,
        showCoinRooms,
      },
    });

    // 이력 기록
    await this.prisma.memberTypeHistory.create({
      data: {
        userId,
        fromType,
        toType,
        changedBy: adminId,
        reason,
        showCoinRoomsChanged: previousShowCoinRooms !== showCoinRooms,
        previousShowCoinRooms,
        newShowCoinRooms: showCoinRooms,
      },
    });

    // 관리자 로그
    await this.logsService.createAdminLog({
      adminId,
      action: 'MEMBER_TYPE_CHANGE',
      target: userId,
      description: `회원 유형 변경: ${fromType} → ${toType}${reason ? ` (사유: ${reason})` : ''}`,
    });

    return updated;
  }

  /**
   * 회원 유형 변경 이력 조회
   */
  async getMemberTypeHistory(userId: string) {
    const histories = await this.prisma.memberTypeHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 변경자 정보 포함
    const historiesWithChangedBy = await Promise.all(
      histories.map(async (history) => {
        if (history.changedBy === 'SYSTEM') {
          return {
            ...history,
            changedByAdmin: { realName: '시스템' },
          };
        }

        const admin = await this.prisma.admin.findUnique({
          where: { id: history.changedBy },
          select: { realName: true },
        });

        return {
          ...history,
          changedByAdmin: admin || { realName: '알 수 없음' },
        };
      }),
    );

    return historiesWithChangedBy;
  }

  /**
   * 코인방 표시 설정만 변경
   */
  async toggleShowCoinRooms(
    userId: string,
    showCoinRooms: boolean,
    adminId: string,
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    // STOCK 회원이 아니면 에러
    if (user.memberType !== 'STOCK') {
      throw new BadRequestException('주식 회원만 코인방 표시 설정을 변경할 수 있습니다.');
    }

    const previousShowCoinRooms = user.showCoinRooms;

    if (previousShowCoinRooms === showCoinRooms) {
      throw new BadRequestException('변경사항이 없습니다.');
    }

    // 업데이트
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { showCoinRooms },
    });

    // 이력 기록
    await this.prisma.memberTypeHistory.create({
      data: {
        userId,
        fromType: user.memberType,
        toType: user.memberType, // 타입은 그대로
        changedBy: adminId,
        reason: reason || '코인방 표시 설정 변경',
        showCoinRoomsChanged: true,
        previousShowCoinRooms,
        newShowCoinRooms: showCoinRooms,
      },
    });

    // 관리자 로그
    await this.logsService.createAdminLog({
      adminId,
      action: 'COIN_ROOMS_DISPLAY_CHANGE',
      target: userId,
      description: `코인방 표시: ${previousShowCoinRooms ? 'ON' : 'OFF'} → ${showCoinRooms ? 'ON' : 'OFF'}`,
    });

    return updated;
  }
}
