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
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../modules/auth/guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { ChatType, OwnerType, JoinType } from '@prisma/client';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Create chat room
   */
  @Post('rooms')
  async createRoom(
    @Body()
    data: {
      name: string;
      type: ChatType;
      joinType?: JoinType;
    },
    @Req() req: any,
  ) {
    return this.chatService.createRoom({
      name: data.name,
      type: data.type,
      joinType: data.joinType,
    });
  }

  /**
   * Get rooms (admin: 전체, user: 내 채팅방)
   */
  @Get('rooms')
  async getRooms(
    @Query('type') type?: ChatType,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Req() req?: any,
  ) {
    const params: any = { search };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    // 관리자: 기존 전체 목록
    if (req?.user?.isAdmin) {
      params.type = type;
      params.ownerId = ownerId;
      return this.chatService.getRooms(params);
    }

    // 일반 유저: 내가 참여한 방만
    return this.chatService.getMyRooms(req.user.id, params);
  }

  /**
   * Get public rooms (공개 채팅방 탐색)
   */
  @Get('rooms/public')
  async getPublicRooms(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Req() req?: any,
  ) {
    const params: any = { search };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);
    if (req?.user?.id) params.userId = req.user.id;

    return this.chatService.getPublicRooms(params);
  }

  /**
   * Get room by entry code
   */
  @Get('rooms/code/:code')
  async getRoomByCode(@Param('code') code: string) {
    return this.chatService.getRoomByEntryCode(code);
  }

  /**
   * Get room by ID
   */
  @Get('rooms/:id')
  async getRoom(@Param('id') id: string) {
    return this.chatService.getRoomById(id);
  }

  /**
   * Update room
   */
  @Put('rooms/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.manage')
  async updateRoom(@Param('id') id: string, @Body() data: any) {
    return this.chatService.updateRoom(id, data);
  }

  /**
   * Delete room
   */
  @Delete('rooms/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.manage')
  async deleteRoom(@Param('id') id: string) {
    await this.chatService.deleteRoom(id);
    return { success: true };
  }

  /**
   * Join room
   */
  @Post('rooms/:id/join')
  async joinRoom(@Param('id') id: string, @Req() req: any) {
    return this.chatService.joinRoom(id, req.user.id);
  }

  /**
   * Approve join request
   */
  @Post('rooms/:roomId/approve/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.manage')
  async approveJoin(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.chatService.approveJoin(roomId, userId, req.user.id);
  }

  /**
   * Reject join request
   */
  @Post('rooms/:roomId/reject/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.manage')
  async rejectJoin(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.chatService.rejectJoin(roomId, userId, req.user.id);
  }

  /**
   * Get pending participants
   */
  @Get('rooms/:id/pending')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.manage')
  async getPendingParticipants(@Param('id') id: string) {
    return this.chatService.getPendingParticipants(id);
  }

  /**
   * Leave room
   */
  @Post('rooms/:id/leave')
  async leaveRoom(@Param('id') id: string, @Req() req: any) {
    await this.chatService.leaveRoom(id, req.user.id);
    return { success: true };
  }

  /**
   * Get room participants
   */
  @Get('rooms/:id/participants')
  async getParticipants(@Param('id') id: string) {
    return this.chatService.getParticipants(id);
  }

  /**
   * Get messages
   */
  @Get('rooms/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    const params: any = { roomId: id, search };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.chatService.getMessages(params);
  }

  /**
   * Delete message
   */
  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    return this.chatService.deleteMessage(id);
  }

  /**
   * Pin message
   */
  @Post('rooms/:roomId/pin/:messageId')
  async pinMessage(
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    return this.chatService.pinMessage(roomId, messageId, req.user.id);
  }

  /**
   * Unpin message
   */
  @Delete('rooms/:roomId/pin/:messageId')
  async unpinMessage(@Param('messageId') messageId: string) {
    await this.chatService.unpinMessage(messageId);
    return { success: true };
  }

  /**
   * Get pinned messages
   */
  @Get('rooms/:id/pinned')
  async getPinnedMessages(@Param('id') id: string) {
    return this.chatService.getPinnedMessages(id);
  }

  /**
   * Get blocked keywords
   */
  @Get('keywords/blocked')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.keywords')
  async getBlockedKeywords() {
    return this.chatService.getBlockedKeywords();
  }

  /**
   * Add blocked keyword
   */
  @Post('keywords/blocked')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.keywords')
  async addBlockedKeyword(
    @Body('keyword') keyword: string,
    @Req() req: any,
  ) {
    return this.chatService.addBlockedKeyword(keyword);
  }

  /**
   * Delete blocked keyword
   */
  @Delete('keywords/blocked/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.keywords')
  async deleteBlockedKeyword(@Param('id') id: string) {
    await this.chatService.deleteBlockedKeyword(id);
    return { success: true };
  }

  /**
   * Broadcast message to all rooms
   */
  @Post('broadcast')
  @UseGuards(PermissionGuard)
  @RequirePermission('chat.manage')
  async broadcastMessage(
    @Body() data: { content: string; fileUrl?: string },
    @Req() req: any,
  ) {
    const count = await this.chatService.broadcastMessage({
      senderId: req.user.id,
      content: data.content,
      fileUrl: data.fileUrl,
    });

    return { success: true, roomCount: count };
  }

  /**
   * Get unread count
   */
  @Get('rooms/:id/unread')
  async getUnreadCount(@Param('id') id: string, @Req() req: any) {
    const count = await this.chatService.getUnreadCount(id, req.user.id);
    return { count };
  }

  /**
   * Mark as read
   */
  @Post('rooms/:id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    await this.chatService.updateLastRead(id, req.user.id);
    return { success: true };
  }

  /**
   * Get read status for a room (active participants with lastReadAt)
   */
  @Get('rooms/:id/read-status')
  async getReadStatus(@Param('id') id: string) {
    return this.chatService.getReadStatus(id);
  }
}
