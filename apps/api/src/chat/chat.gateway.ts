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
   * Join room
   */
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { userId, userType } = client.data;
    const { roomId } = data;

    try {
      // Admin은 참여자 생성 없이 소켓 룸만 join
      if (userType !== 'admin') {
        await this.chatService.joinRoom(roomId, userId);
      }
      client.join(roomId);

      // Notify room
      this.server.to(roomId).emit('room:user_joined', {
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
      // Admin은 참여자 DB 삭제 없이 소켓만 leave
      if (userType !== 'admin') {
        await this.chatService.leaveRoom(roomId, userId);
      }
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
   * Send message
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
    const senderType = isAdmin ? 'ADMIN' : 'USER';

    try {
      // Check rate limit
      const canSend = await this.chatService.checkRateLimit(userId);
      if (!canSend) {
        return { success: false, error: 'Rate limit exceeded' };
      }

      // Check permissions
      const hasPermission = await this.chatService.canSendMessage(
        data.roomId,
        userId,
        userType,
      );

      if (!hasPermission) {
        return { success: false, error: 'No permission to send message' };
      }

      // Create message
      const message = await this.chatService.createMessage({
        roomId: data.roomId,
        senderId: userId,
        senderType,
        content: data.content,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });

      // Resolve sender info for broadcast
      let senderInfo: any = null;
      if (isAdmin) {
        const admin = await this.prisma.admin.findUnique({
          where: { id: userId },
          select: { id: true, realName: true, salesName: true, logoUrl: true },
        });
        senderInfo = admin
          ? { id: admin.id, name: admin.salesName || admin.realName, profileImage: admin.logoUrl, isAdmin: true }
          : { id: userId, name: '관리자', profileImage: null, isAdmin: true };
      } else {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, nickname: true, profileImage: true },
        });
        senderInfo = user
          ? { id: user.id, name: user.nickname || user.name, profileImage: user.profileImage, isAdmin: false }
          : { id: userId, name: '알 수 없음', profileImage: null, isAdmin: false };
      }

      // Broadcast to room with sender info
      this.server.to(data.roomId).emit('message:new', {
        message: { ...message, sender: senderInfo },
        timestamp: new Date(),
      });

      // Send push notifications to offline participants
      const participants = await this.chatService.getParticipants(data.roomId);
      const offlineParticipants = participants.filter(
        (p) => !this.onlineUsers.has(p.userId) && p.userId !== userId,
      );

      const senderName = senderInfo?.name || '새 메시지';
      for (const participant of offlineParticipants) {
        await this.notificationsService.sendPush(participant.userId, {
          title: isAdmin ? `[관리자] ${senderName}` : senderName,
          body: data.content || '새 메시지가 있습니다',
          data: { roomId: data.roomId, messageId: message.id },
        });
      }

      return { success: true, message: { ...message, sender: senderInfo } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete message
   */
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string },
  ) {
    const { userId } = client.data;

    try {
      const deleted = await this.chatService.deleteMessage(data.messageId);

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
