import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { ChatRoom, ChatType } from '@prisma/client';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 채팅방 목록 조회
   */
  async findAll(params?: {
    type?: ChatType;
    expertId?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {
      deletedAt: null, // 삭제되지 않은 채팅방만 조회
    };

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        {
          participants: {
            some: {
              user: {
                OR: [
                  { name: { contains: params.search, mode: 'insensitive' } },
                  { nickname: { contains: params.search, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    // 전문가별 채팅방 필터
    if (params?.expertId) {
      const expert = await this.prisma.expert.findUnique({
        where: { id: params.expertId },
      });

      if (expert) {
        where.id = {
          in: [expert.vipRoomId, expert.vvipRoomId].filter(Boolean),
        };
      }
    }

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        skip: params?.skip || 0,
        take: params?.take || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: {
            where: { leftAt: null },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    // 통계 계산
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 통계 계산 최적화 - 연결 풀 부담 감소를 위해 간소화
    const roomsWithStats = rooms.map((room) => {
        const lastMessage = room.messages[0];

        return {
          id: room.id,
          type: room.type,
          category: room.category,
          name: room.name,
          description: room.description,
          image: room.image,
          maxParticipants: room.maxParticipants,
          participantCount: room.participants.length,
          todayMessageCount: 0, // 성능 최적화를 위해 상세 페이지에서만 계산
          last7DaysMessageCount: 0,
          lastActivityAt: lastMessage?.createdAt || room.updatedAt,
          kickedCount: 0,
          shadowBannedCount: 0,
          unreadCount: 0,
          createdAt: room.createdAt,
        };
      });

    return { rooms: roomsWithStats, total };
  }

  /**
   * 채팅방 상세 조회
   */
  async findById(id: string) {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id,
        deletedAt: null, // 삭제되지 않은 채팅방만 조회
      },
    });

    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다');
    }

    // 통계 계산
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalParticipants, todayMessages, last7DaysMessages, kickedCount, shadowBannedCount, lastMessage] = await Promise.all([
      this.prisma.chatParticipant.count({
        where: {
          roomId: id,
          leftAt: null,
        },
      }),
      this.prisma.chatMessage.count({
        where: {
          roomId: id,
          createdAt: { gte: startOfToday },
          isDeleted: false,
        },
      }),
      this.prisma.chatMessage.count({
        where: {
          roomId: id,
          createdAt: { gte: sevenDaysAgo },
          isDeleted: false,
        },
      }),
      this.prisma.chatParticipant.count({
        where: {
          roomId: id,
          isKicked: true,
        },
      }),
      this.prisma.chatParticipant.count({
        where: {
          roomId: id,
          isShadowBanned: true,
        },
      }),
      this.prisma.chatMessage.findFirst({
        where: {
          roomId: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
        },
      }),
    ]);

    return {
      id: room.id,
      type: room.type,
      category: room.category,
      name: room.name,
      description: room.description,
      image: room.image,
      maxParticipants: room.maxParticipants,
      isActive: room.isActive,
      stats: {
        totalParticipants,
        todayMessages,
        last7DaysMessages,
        lastActivityAt: lastMessage?.createdAt || room.updatedAt,
        kickedCount,
        shadowBannedCount,
      },
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  /**
   * 채팅방 생성
   */
  async create(
    data: {
      type: ChatType;
      category?: 'STOCK' | 'COIN';
      name?: string;
      description?: string;
      image?: string;
      maxParticipants?: number;
      ownerId?: string;
    },
    adminId: string,
  ): Promise<ChatRoom> {
    // 1:N 채팅방은 이름 필수
    if (data.type === 'ONE_TO_N' && !data.name) {
      throw new BadRequestException('1:N 채팅방은 이름이 필수입니다');
    }

    // TWO_WAY 채팅방은 이름 필수
    if (data.type === 'TWO_WAY' && !data.name) {
      throw new BadRequestException('양방향 소통방은 이름이 필수입니다');
    }

    // 방장이 지정된 경우 사용자 존재 확인
    if (data.ownerId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: data.ownerId },
      });

      if (!owner) {
        throw new NotFoundException('방장으로 지정된 사용자를 찾을 수 없습니다');
      }
    }

    const room = await this.prisma.chatRoom.create({
      data: {
        type: data.type,
        category: data.category || 'STOCK',
        name: data.name,
        description: data.description,
        image: data.image,
        maxParticipants: data.maxParticipants,
      },
    });

    // 방장 지정
    if (data.ownerId) {
      await this.prisma.chatParticipant.create({
        data: {
          roomId: room.id,
          userId: data.ownerId,
          ownerType: 'OWNER',
        },
      });
    }

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_ROOM_CREATE',
      target: room.id,
      description: `채팅방 생성: ${room.name || room.id}`,
    });

    return room;
  }

  /**
   * 채팅방 정보 수정
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      image?: string;
      maxParticipants?: number;
    },
    adminId: string,
  ): Promise<ChatRoom> {
    await this.findById(id);

    const updated = await this.prisma.chatRoom.update({
      where: { id },
      data,
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_ROOM_UPDATE',
      target: id,
      description: `채팅방 수정: ${updated.name || id}`,
    });

    return updated;
  }

  /**
   * 채팅방 비활성화
   */
  async deactivate(id: string, adminId: string): Promise<ChatRoom> {
    await this.findById(id);

    const deactivated = await this.prisma.chatRoom.update({
      where: { id },
      data: { isActive: false },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_ROOM_DEACTIVATE',
      target: id,
      description: '채팅방 비활성화',
    });

    return deactivated;
  }

  /**
   * 채팅방 재활성화
   */
  async activate(id: string, adminId: string): Promise<ChatRoom> {
    await this.findById(id);

    const activated = await this.prisma.chatRoom.update({
      where: { id },
      data: { isActive: true },
    });

    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_ROOM_ACTIVATE',
      target: id,
      description: '채팅방 재활성화',
    });

    return activated;
  }

  /**
   * 전체 채팅 통계
   */
  async getOverviewStats() {
    const [totalRooms, activeRooms, totalParticipants, totalKicked, totalShadowBanned] = await Promise.all([
      this.prisma.chatRoom.count({ where: { deletedAt: null } }),
      this.prisma.chatRoom.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.chatParticipant.count({
        where: { leftAt: null },
      }),
      this.prisma.chatParticipant.count({
        where: { isKicked: true },
      }),
      this.prisma.chatParticipant.count({
        where: { isShadowBanned: true },
      }),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayMessages = await this.prisma.chatMessage.count({
      where: {
        createdAt: { gte: startOfToday },
        isDeleted: false,
      },
    });

    return {
      totalRooms,
      activeRooms,
      totalParticipants,
      todayMessages,
      totalKicked,
      totalShadowBanned,
    };
  }

  /**
   * 채팅방 삭제 (소프트 삭제)
   */
  async deleteChatRoom(roomId: string, adminId: string, reason?: string): Promise<ChatRoom> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        messages: { take: 1 },
      },
    });

    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    if (room.deletedAt) {
      throw new BadRequestException('이미 삭제된 채팅방입니다.');
    }

    // 소프트 삭제
    const updated = await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // 로그 기록
    await this.logsService.createAdminLog({
      adminId,
      action: 'CHAT_ROOM_DELETE',
      target: roomId,
      description: reason || '채팅방 삭제',
    });

    return updated;
  }
}
