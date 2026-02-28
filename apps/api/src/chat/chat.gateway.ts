import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { RedisService } from '../modules/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { OwnerType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // In-memory map for online users: userId -> socketId[]
  private onlineUsers = new Map<string, string[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Store user info in socket
      client.data.userId = userId;
      client.data.userType = payload.type || 'user';

      // Track online status
      const sockets = this.onlineUsers.get(userId) || [];
      sockets.push(client.id);
      this.onlineUsers.set(userId, sockets);

      // Update Redis online status
      await this.redisService.set(`online:${userId}`, '1', 3600);

      console.log(`User ${userId} connected (socket: ${client.id})`);

      // Broadcast online status to relevant rooms
      this.broadcastOnlineStatus(userId, true);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      const sockets = this.onlineUsers.get(userId) || [];
      const filtered = sockets.filter((id) => id !== client.id);

      if (filtered.length === 0) {
        this.onlineUsers.delete(userId);
        await this.redisService.del(userId);
        this.broadcastOnlineStatus(userId, false);
      } else {
        this.onlineUsers.set(userId, filtered);
      }

      console.log(`User ${userId} disconnected (socket: ${client.id})`);
    }
  }

  /**
   * Join room — with permission checks
   */
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId, userType } = client.data;
    const { roomId } = data;

    try {
      // 1. Admin은 무조건 소켓 룸 join + 봇 참여자 생성/재활성화
      if (userType === 'admin') {
        client.join(roomId);
        console.log(`[Socket] admin ${userId} joined room ${roomId}`);

        // 봇 User로 ChatParticipant 생성/재활성화
        const admin = await this.prisma.admin.findUnique({
          where: { id: userId },
          select: { botUserId: true },
        });

        if (admin?.botUserId) {
          const existing = await this.prisma.chatParticipant.findUnique({
            where: { roomId_userId: { roomId, userId: admin.botUserId } },
          });

          if (!existing) {
            await this.prisma.chatParticipant.create({
              data: { roomId, userId: admin.botUserId, ownerType: 'OWNER' },
            });
          } else if (existing.leftAt) {
            await this.prisma.chatParticipant.update({
              where: { id: existing.id },
              data: { leftAt: null },
            });
          }
        }

        this.server.to(roomId).emit('room:user_joined', {
          roomId, userId: admin?.botUserId || userId, userType: admin?.botUserId ? 'user' : 'admin', timestamp: new Date(),
        });
        return { success: true };
      }

      // 2. ChatParticipant 조회
      const participant = await this.prisma.chatParticipant.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });

      // 3. 강퇴 체크
      if (participant?.isKicked) {
        return { success: false, error: '강퇴된 채팅방입니다' };
      }

      // 4. 참여자 아님 or 퇴장
      if (!participant || participant.leftAt) {
        return { success: false, error: '참여 권한이 없습니다' };
      }

      // 5. 구독 기반 방 체크
      const hasSubscription = await this.chatService.checkSubscriptionAccess(roomId, userId);
      if (!hasSubscription) {
        return { success: false, error: '구독이 만료되었습니다' };
      }

      // 6. 소켓 룸 join
      client.join(roomId);
      console.log(`[Socket] user ${userId} joined room ${roomId}`);

      this.server.to(roomId).emit('room:user_joined', {
        roomId, userId, userType, timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error(`[Socket] room:join error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave room
   */
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId, userType } = client.data;
    const { roomId } = data;

    try {
      client.leave(roomId);

      // Notify room
      this.server.to(roomId).emit('room:user_left', {
        roomId,
        userId,
        userType,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message — with shadow ban handling
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      content?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
    },
  ) {
    const { userId, userType } = client.data;
    const isAdmin = userType === 'admin';

    console.log(`[Socket] message:send from ${userType} ${userId} to room ${data.roomId}`);

    try {
      // Check rate limit
      const canSend = await this.chatService.checkRateLimit(userId);
      if (!canSend) {
        console.warn(`[Socket] Rate limit exceeded for ${userId}`);
        return { success: false, error: 'Rate limit exceeded' };
      }

      // 관리자 봇 전환: admin이면 botUserId로 senderId 교체
      let actualSenderId = userId;
      let actualSenderType: 'ADMIN' | 'USER' = isAdmin ? 'ADMIN' : 'USER';
      let usesBotIdentity = false;

      if (isAdmin) {
        const admin = await this.prisma.admin.findUnique({
          where: { id: userId },
          select: { botUserId: true },
        });
        if (admin?.botUserId) {
          actualSenderId = admin.botUserId;
          actualSenderType = 'USER'; // 봇은 항상 일반 유저로 표시
          usesBotIdentity = true;
        }
      }

      // Check permissions (new return type)
      const permission = await this.chatService.canSendMessage(
        data.roomId,
        userId,
        userType,
      );

      if (!permission.allowed) {
        console.warn(`[Socket] No permission: ${userType} ${userId} in room ${data.roomId} - ${permission.reason}`);
        return { success: false, error: permission.reason };
      }

      // Create message (봇이면 봇 userId로 저장)
      const message = await this.chatService.createMessage({
        roomId: data.roomId,
        senderId: actualSenderId,
        senderType: actualSenderType,
        content: data.content,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });

      // Resolve sender info for broadcast (봇이면 봇 User 정보로 표시)
      const senderInfo = await this.resolveSenderInfo(actualSenderId, usesBotIdentity ? false : isAdmin);

      const messageWithSender = { ...message, sender: senderInfo };

      // Shadow ban handling: only send to the sender's own sockets
      if (permission.isShadowBanned) {
        console.log(`[Socket] Shadow banned user ${userId} - sending only to self`);
        const userSockets = this.onlineUsers.get(userId) || [];
        userSockets.forEach((socketId) => {
          this.server.to(socketId).emit('message:new', {
            message: messageWithSender,
            timestamp: new Date(),
          });
        });
        // No push notifications for shadow banned messages
        return { success: true, message: messageWithSender };
      }

      // Normal broadcast to entire room
      console.log(`[Socket] Broadcasting message:new to room ${data.roomId}, msgId: ${message.id}`);
      this.server.to(data.roomId).emit('message:new', {
        message: messageWithSender,
        timestamp: new Date(),
      });

      // Send push notifications to offline participants
      const participants = await this.chatService.getParticipants(data.roomId);
      const offlineParticipants = participants.filter(
        (p) => !this.onlineUsers.has(p.userId) && p.userId !== userId && !p.isKicked && !p.leftAt,
      );

      const senderName = senderInfo?.name || '새 메시지';
      for (const participant of offlineParticipants) {
        await this.notificationsService.sendPush(participant.userId, {
          title: isAdmin ? `[관리자] ${senderName}` : senderName,
          body: data.content || '새 메시지가 있습니다',
          data: { roomId: data.roomId, messageId: message.id },
        });
      }

      return { success: true, message: messageWithSender };
    } catch (error) {
      console.error(`[Socket] message:send error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete message — admin only (다른 사람 메시지 삭제, 계층 체크)
   */
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string },
  ) {
    const { userId, userType } = client.data;

    // Admin 전용 가드
    if (userType !== 'admin') {
      return { success: false, error: '관리자만 다른 사람의 메시지를 삭제할 수 있습니다' };
    }

    try {
      // 대상 메시지 조회
      const message = await this.prisma.chatMessage.findUnique({
        where: { id: data.messageId },
      });
      if (!message) {
        return { success: false, error: '메시지를 찾을 수 없습니다' };
      }

      // 대상이 ADMIN 메시지면 계층 비교
      if (message.senderType === 'ADMIN' && message.senderId !== userId) {
        const TIER_RANK: Record<string, number> = {
          INTEGRATED: 4, CEO: 3, MIDDLE: 2, GENERAL: 1,
        };
        const [requester, target] = await Promise.all([
          this.prisma.admin.findUnique({ where: { id: userId }, select: { tier: true } }),
          this.prisma.admin.findUnique({ where: { id: message.senderId }, select: { tier: true } }),
        ]);
        const requesterRank = TIER_RANK[requester?.tier || 'GENERAL'] || 1;
        const targetRank = TIER_RANK[target?.tier || 'GENERAL'] || 1;

        if (requesterRank < targetRank) {
          return { success: false, error: '상위 관리자의 메시지는 삭제할 수 없습니다' };
        }
      }

      await this.chatService.deleteMessageWithTracker(data.messageId, userId);

      // Broadcast to room
      this.server.to(data.roomId).emit('message:deleted', {
        messageId: data.messageId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete own message — any user can delete their own messages
   */
  @SubscribeMessage('message:delete_own')
  async handleDeleteOwnMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string },
  ) {
    const { userId } = client.data;

    try {
      // Verify message ownership
      const message = await this.prisma.chatMessage.findUnique({
        where: { id: data.messageId },
      });

      if (!message) {
        return { success: false, error: '메시지를 찾을 수 없습니다' };
      }

      if (message.senderId !== userId) {
        return { success: false, error: '본인의 메시지만 삭제할 수 있습니다' };
      }

      await this.chatService.deleteMessageWithTracker(data.messageId, userId);

      // Broadcast to room
      this.server.to(data.roomId).emit('message:deleted', {
        messageId: data.messageId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Read room — update lastReadAt and broadcast
   */
  @SubscribeMessage('room:read')
  async handleRoomRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId, userType } = client.data;
    const now = new Date();

    try {
      // Admin: DB 업데이트 없이 브로드캐스트만
      if (userType !== 'admin') {
        await this.chatService.updateLastRead(data.roomId, userId);
      }

      // Broadcast read status to room
      this.server.to(data.roomId).emit('room:user_read', {
        roomId: data.roomId,
        userId,
        lastReadAt: now.toISOString(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Force disconnect participant — admin only
   * Removes target user's sockets from the room and sends kicked event
   */
  @SubscribeMessage('participant:force_disconnect')
  async handleForceDisconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { userType } = client.data;

    if (userType !== 'admin') {
      return { success: false, error: '관리자만 사용할 수 있습니다' };
    }

    try {
      const targetSockets = this.onlineUsers.get(data.userId) || [];

      // Get all sockets for the target user and leave them from the room
      for (const socketId of targetSockets) {
        const targetSocket = this.server.sockets.sockets.get(socketId);
        if (targetSocket) {
          targetSocket.leave(data.roomId);
          // Send kicked event to the target user
          targetSocket.emit('room:kicked', {
            roomId: data.roomId,
            timestamp: new Date(),
          });
        }
      }

      // Notify room that user was kicked
      this.server.to(data.roomId).emit('room:user_left', {
        roomId: data.roomId,
        userId: data.userId,
        userType: 'user',
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Pin message
   */
  @SubscribeMessage('message:pin')
  async handlePinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; messageId: string },
  ) {
    const { userId } = client.data;

    try {
      await this.chatService.pinMessage(data.roomId, data.messageId, userId);

      // Broadcast to room
      this.server.to(data.roomId).emit('message:pinned', {
        messageId: data.messageId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unpin message
   */
  @SubscribeMessage('message:unpin')
  async handleUnpinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string },
  ) {
    try {
      await this.chatService.unpinMessage(data.messageId);

      // Broadcast to room
      this.server.to(data.roomId).emit('message:unpinned', {
        messageId: data.messageId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Typing indicator start
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId } = client.data;

    client.to(data.roomId).emit('typing:user_typing', {
      roomId: data.roomId,
      userId,
    });

    return { success: true };
  }

  /**
   * Typing indicator stop
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId } = client.data;

    client.to(data.roomId).emit('typing:user_stopped', {
      roomId: data.roomId,
      userId,
    });

    return { success: true };
  }

  /**
   * Approve join request (room owner only)
   */
  @SubscribeMessage('room:approve')
  async handleApproveJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { userId: actorId } = client.data;

    try {
      await this.chatService.approveJoin(data.roomId, data.userId, actorId);

      // Notify approved user
      const userSockets = this.onlineUsers.get(data.userId) || [];
      userSockets.forEach((socketId) => {
        this.server.to(socketId).emit('room:approved', {
          roomId: data.roomId,
          timestamp: new Date(),
        });
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve sender info helper
   */
  private async resolveSenderInfo(userId: string, isAdmin: boolean) {
    if (isAdmin) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
        select: { id: true, realName: true, salesName: true, logoUrl: true },
      });
      return admin
        ? { id: admin.id, name: admin.salesName || admin.realName, profileImage: admin.logoUrl, isAdmin: true }
        : { id: userId, name: '관리자', profileImage: null, isAdmin: true };
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, nickname: true, profileImage: true },
      });
      return user
        ? { id: user.id, name: user.nickname || user.name, profileImage: user.profileImage, isAdmin: false }
        : { id: userId, name: '알 수 없음', profileImage: null, isAdmin: false };
    }
  }

  /**
   * Broadcast online status to relevant rooms
   */
  private broadcastOnlineStatus(userId: string, isOnline: boolean) {
    this.server.emit('user:status_changed', {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }
}
