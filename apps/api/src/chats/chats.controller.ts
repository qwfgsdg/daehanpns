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
import { ChatsService } from './chats.service';
import { ChatParticipantsService } from './chat-participants.service';
import { ChatMessagesService } from './chat-messages.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../modules/auth/guards/admin-role.guard';
import { PermissionGuard } from '../modules/auth/guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { ChatType, OwnerType } from '@prisma/client';

@Controller('chats')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly participantsService: ChatParticipantsService,
    private readonly messagesService: ChatMessagesService,
  ) {}

  // ==================== 채팅방 관리 ====================

  /**
   * 채팅방 목록 조회
   */
  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async findAllRooms(
    @Query('type') type?: ChatType,
    @Query('expertId') expertId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = {
      type,
      expertId,
      search,
    };

    if (isActive !== undefined) params.isActive = isActive === 'true';
    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.chatsService.findAll(params);
  }

  /**
   * 채팅방 생성
   */
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async createRoom(
    @Body()
    data: {
      type: ChatType;
      category?: 'STOCK' | 'COIN';
      name?: string;
      description?: string;
      image?: string;
      maxParticipants?: number;
      ownerId?: string;
    },
    @Req() req: any,
  ) {
    return this.chatsService.create(data, req.user.id);
  }

  /**
   * 채팅방 상세 조회
   */
  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async findOneRoom(@Param('id') id: string) {
    return this.chatsService.findById(id);
  }

  /**
   * 채팅방 정보 수정
   */
  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async updateRoom(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      description?: string;
      image?: string;
      maxParticipants?: number;
    },
    @Req() req: any,
  ) {
    return this.chatsService.update(id, data, req.user.id);
  }

  /**
   * 채팅방 비활성화
   */
  @Post(':id/deactivate')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async deactivateRoom(@Param('id') id: string, @Req() req: any) {
    return this.chatsService.deactivate(id, req.user.id);
  }

  /**
   * 채팅방 재활성화
   */
  @Post(':id/activate')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async activateRoom(@Param('id') id: string, @Req() req: any) {
    return this.chatsService.activate(id, req.user.id);
  }

  /**
   * 채팅방 삭제 (소프트 삭제)
   */
  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async deleteRoom(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.chatsService.deleteChatRoom(id, req.user.id, reason);
    return { success: true };
  }

  /**
   * 전체 채팅 통계
   */
  @Get('stats/overview')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async getStats() {
    return this.chatsService.getOverviewStats();
  }

  // ==================== 참가자 관리 ====================

  /**
   * 참가자 목록 조회
   */
  @Get(':roomId/participants')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async findAllParticipants(
    @Param('roomId') roomId: string,
    @Query('search') search?: string,
    @Query('ownerType') ownerType?: OwnerType,
    @Query('isKicked') isKicked?: string,
    @Query('isShadowBanned') isShadowBanned?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = {
      search,
      ownerType,
    };

    if (isKicked !== undefined) params.isKicked = isKicked === 'true';
    if (isShadowBanned !== undefined) params.isShadowBanned = isShadowBanned === 'true';
    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.participantsService.findAll(roomId, params);
  }

  /**
   * 참가자 추가 (일괄)
   */
  @Post(':roomId/participants')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async addParticipants(
    @Param('roomId') roomId: string,
    @Body()
    data: {
      userIds: string[];
      ownerType?: OwnerType;
    },
    @Req() req: any,
  ) {
    return this.participantsService.addParticipants(roomId, data, req.user.id);
  }

  /**
   * 참가자 역할 변경
   */
  @Put(':roomId/participants/:userId/role')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async changeParticipantRole(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body('ownerType') ownerType: OwnerType,
    @Req() req: any,
  ) {
    return this.participantsService.changeRole(roomId, userId, ownerType, req.user.id);
  }

  /**
   * 강퇴
   */
  @Post(':roomId/participants/:userId/kick')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async kickParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.participantsService.kick(roomId, userId, reason, req.user.id);
  }

  /**
   * 강퇴 해제
   */
  @Post(':roomId/participants/:userId/unkick')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async unkickParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.participantsService.unkick(roomId, userId, req.user.id);
  }

  /**
   * Shadow Ban
   */
  @Post(':roomId/participants/:userId/shadow-ban')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async shadowBanParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
    @Req() req?: any,
  ) {
    return this.participantsService.shadowBan(roomId, userId, reason, req.user.id);
  }

  /**
   * Shadow Ban 해제
   */
  @Post(':roomId/participants/:userId/unshadow-ban')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async unshadowBanParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.participantsService.unshadowBan(roomId, userId, req.user.id);
  }

  // ==================== 메시지 관리 ====================

  /**
   * 메시지 목록 조회 (무한 스크롤)
   */
  @Get(':roomId/messages')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async findAllMessages(
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('senderId') senderId?: string,
    @Query('hasFile') hasFile?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const params: any = {
      cursor,
      keyword,
      startDate,
      endDate,
      senderId,
    };

    if (limit) params.limit = parseInt(limit, 10);
    if (hasFile !== undefined) params.hasFile = hasFile === 'true';
    if (includeDeleted !== undefined) {
      params.includeDeleted = includeDeleted === 'true';
    } else {
      params.includeDeleted = true; // 기본값
    }

    return this.messagesService.findAll(roomId, params);
  }

  /**
   * 메시지 삭제 (Soft Delete)
   */
  @Delete(':roomId/messages/:messageId')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async deleteMessage(
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    return this.messagesService.deleteMessage(roomId, messageId, req.user.id);
  }

  /**
   * 메시지 일괄 삭제
   */
  @Post(':roomId/messages/bulk-delete')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async bulkDeleteMessages(
    @Param('roomId') roomId: string,
    @Body('messageIds') messageIds: string[],
    @Req() req: any,
  ) {
    return this.messagesService.bulkDeleteMessages(roomId, messageIds, req.user.id);
  }

  /**
   * 고정 메시지 목록
   */
  @Get(':roomId/pinned-messages')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async getPinnedMessages(@Param('roomId') roomId: string) {
    return this.messagesService.getPinnedMessages(roomId);
  }

  /**
   * 메시지 고정
   */
  @Post(':roomId/messages/:messageId/pin')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async pinMessage(
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    return this.messagesService.pinMessage(roomId, messageId, req.user.id);
  }

  /**
   * 메시지 고정 해제
   */
  @Delete(':roomId/pinned-messages/:pinnedMessageId')
  @UseGuards(PermissionGuard)
  @RequirePermission('chats.manage')
  async unpinMessage(
    @Param('roomId') roomId: string,
    @Param('pinnedMessageId') pinnedMessageId: string,
    @Req() req: any,
  ) {
    return this.messagesService.unpinMessage(roomId, pinnedMessageId, req.user.id);
  }
}
