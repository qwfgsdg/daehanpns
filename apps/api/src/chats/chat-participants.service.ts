import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { OwnerType } from '@prisma/client';

@Injectable()
export class ChatParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 참가자 목록 조회
   */
  async findAll(
    roomId: string,
    params?: {
      search?: string;
      ownerType?: OwnerType;
      isKicked?: boolean;
      isShadowBanned?: boolean;
      skip?: number;
      take?: number;
    },
  ) {
    const where: any = {
      roomId,
    };

    if (params?.ownerType) {
      where.ownerType = params.ownerType;
    }

    if (params?.isKicked !== undefined) {
      where.isKicked = params.isKicked;
    }

    if (params?.isShadowBanned !== undefined) {
      where.isShadowBanned = params.isShadowBanned;
    }

    if (params?.search) {
      where.user = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { nickname: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const [participants, total] = await Promise.all([
      this.prisma.chatParticipant.findMany({
        where,
        skip: params?.skip || 0,
        take: params?.take || 20,
        orderBy: { joinedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              profileImage: true,
            },
          },
        },
      }),
      this.prisma.chatParticipant.count({ where }),
    ]);

    return { participants, total };
  }

  /**
   * 참가자 추가 (일괄)
   */
  async addParticipants(
    roomId: string,
    data: {
      userIds: string[];
      ownerType?: OwnerType;
    },
    adminId: string,
  ) {
    if (!data.userIds || data.userIds.length === 0) {
      throw new BadRequestException('추가할 사용자를 선택해주세요');
    }

    // 채팅방 확인
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다');
    }

    // maxParticipants 체크
    if (room.maxParticipants) {
      const currentCount = await this.prisma.chatParticipant.count({
        where: {
          roomId,
          leftAt: null,
        },
      });

      if (currentCount + data.userIds.length > room.maxParticipants) {
        throw new BadRequestException(
          `최대 인원(${room.maxParticipants}명)을 초과할 수 없습니다`,
        );
      }
    }

    // 사용자 존재 확인
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: data.userIds },
      },
    });

    if (users.length !== data.userIds.length) {
      throw new BadRequestException('일부 사용자를 찾을 수 없습니다');
    }

    const results: any[] = [];
    const errors: { userId: string; error: string }[] = [];

    for (const userId of data.userIds) {
      try {
        // 강퇴된 사용자 체크
        const existingParticipant = await this.prisma.chatParticipant.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId,
            },
          },
        });

        if (existingParticipant?.isKicked) {
          errors.push({
            userId,
            error: '강퇴된 사용자는 추가할 수 없습니다',
          });
          continue;
        }

        // 이미 참가 중인 경우
        if (existingParticipant && !existingParticipant.leftAt) {
          errors.push({
            userId,
            error: '이미 참가 중인 사용자입니다',
          });
          continue;
        }

        // 참가자 추가 또는 재참가
        if (existingParticipant && existingParticipant.leftAt) {
          const participant = await this.prisma.chatParticipant.update({
            where: { id: existingParticipant.id },
            data: {
              leftAt: null,
              joinedAt: new Date(),
              ownerType: data.ownerType || 'MEMBER',
            },
          });
          results.push(participant);
        } else {
          const participant = await this.prisma.chatParticipant.create({
            data: {
              roomId,
              userId,
              ownerType: data.ownerType || 'MEMBER',
            },
          });
          results.push(participant);
        }
      } catch (error) {
        errors.push({
          userId,
          error: error.message,
        });
      }
    }

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_PARTICIPANT_ADD',
      target: `${roomId}`,
      description: `참가자 ${results.length}명 추가`,
    });

    return {
      success: results.length,
      failed: errors.length,
      errors,
    };
  }

  /**
   * 참가자 역할 변경
   */
  async changeRole(
    roomId: string,
    userId: string,
    ownerType: OwnerType,
    adminId: string,
  ) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('참가자를 찾을 수 없습니다');
    }

    const oldRole = participant.ownerType;

    // OWNER로 변경하는 경우 기존 OWNER를 MEMBER로 변경
    if (ownerType === 'OWNER') {
      await this.prisma.chatParticipant.updateMany({
        where: {
          roomId,
          ownerType: 'OWNER',
        },
        data: {
          ownerType: 'MEMBER',
        },
      });
    }

    const updated = await this.prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { ownerType },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_PARTICIPANT_ROLE_CHANGE',
      target: `${roomId}:${userId}`,
      description: `역할 변경: ${oldRole} → ${ownerType}`,
    });

    return updated;
  }

  /**
   * 강퇴
   */
  async kick(
    roomId: string,
    userId: string,
    reason: string,
    adminId: string,
  ) {
    if (!reason) {
      throw new BadRequestException('강퇴 사유는 필수입니다');
    }

    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('참가자를 찾을 수 없습니다');
    }

    if (participant.isKicked) {
      throw new BadRequestException('이미 강퇴된 사용자입니다');
    }

    // 활성 구독 확인
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
      include: {
        expert: true,
      },
    });

    // 강퇴 처리
    const kicked = await this.prisma.chatParticipant.update({
      where: { id: participant.id },
      data: {
        isKicked: true,
        kickedAt: new Date(),
        kickedBy: adminId,
        kickReason: reason,
        leftAt: new Date(),
      },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_PARTICIPANT_KICK',
      target: `${roomId}:${userId}`,
      description: `강퇴: ${reason}`,
    });

    return {
      participant: kicked,
      hasActiveSubscriptions: activeSubscriptions.length > 0,
      activeSubscriptions: activeSubscriptions.map((sub) => ({
        id: sub.id,
        expertName: sub.expert.name,
        roomType: sub.roomType,
        endDate: sub.endDate,
      })),
    };
  }

  /**
   * 강퇴 해제
   */
  async unkick(roomId: string, userId: string, adminId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('참가자를 찾을 수 없습니다');
    }

    if (!participant.isKicked) {
      throw new BadRequestException('강퇴되지 않은 사용자입니다');
    }

    const unkicked = await this.prisma.chatParticipant.update({
      where: { id: participant.id },
      data: {
        isKicked: false,
        kickedAt: null,
        kickedBy: null,
        kickReason: null,
        leftAt: null,
        joinedAt: new Date(),
      },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_PARTICIPANT_UNKICK',
      target: `${roomId}:${userId}`,
      description: '강퇴 해제',
    });

    return unkicked;
  }

  /**
   * Shadow Ban
   */
  async shadowBan(
    roomId: string,
    userId: string,
    reason: string | undefined,
    adminId: string,
  ) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('참가자를 찾을 수 없습니다');
    }

    if (participant.isShadowBanned) {
      throw new BadRequestException('이미 Shadow Ban된 사용자입니다');
    }

    const banned = await this.prisma.chatParticipant.update({
      where: { id: participant.id },
      data: {
        isShadowBanned: true,
        shadowBannedAt: new Date(),
        shadowBannedBy: adminId,
      },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_SHADOW_BAN',
      target: `${roomId}:${userId}`,
      description: `Shadow Ban${reason ? `: ${reason}` : ''}`,
    });

    return banned;
  }

  /**
   * Shadow Ban 해제
   */
  async unshadowBan(roomId: string, userId: string, adminId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('참가자를 찾을 수 없습니다');
    }

    if (!participant.isShadowBanned) {
      throw new BadRequestException('Shadow Ban되지 않은 사용자입니다');
    }

    const unbanned = await this.prisma.chatParticipant.update({
      where: { id: participant.id },
      data: {
        isShadowBanned: false,
        shadowBannedAt: null,
        shadowBannedBy: null,
      },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_UNSHADOW_BAN',
      target: `${roomId}:${userId}`,
      description: 'Shadow Ban 해제',
    });

    return unbanned;
  }
}
