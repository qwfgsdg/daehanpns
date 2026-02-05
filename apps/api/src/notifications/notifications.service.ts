import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  Notification,
  NotificationSetting,
  NotificationType,
  NotifCategory,
  Prisma,
} from '@prisma/client';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.firebaseApp = admin.app();
    }
  }

  /**
   * Register FCM token in Redis
   */
  async registerFcmToken(userId: string, token: string): Promise<void> {
    await this.redis.set(`fcm_token:${userId}`, token);
  }

  /**
   * Get FCM token from Redis
   */
  async getFcmToken(userId: string): Promise<string | null> {
    return this.redis.get(`fcm_token:${userId}`);
  }

  /**
   * Send push notification via FCM
   */
  async sendPush(
    userId: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    const token = await this.getFcmToken(userId);

    if (!token) {
      console.warn(`No FCM token found for user ${userId}`);
      return;
    }

    try {
      await admin.messaging().send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Send push to multiple users
   */
  async sendPushToMany(
    userIds: string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    const tokens = await Promise.all(
      userIds.map((userId) => this.getFcmToken(userId)),
    );

    const validTokens = tokens.filter((token): token is string => !!token);

    if (validTokens.length === 0) {
      console.warn('No valid FCM tokens found');
      return;
    }

    try {
      await admin.messaging().sendEachForMulticast({
        tokens: validTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
    } catch (error) {
      console.error('Failed to send push notifications:', error);
    }
  }

  /**
   * Create notification
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    roomId?: string;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        roomId: data.roomId,
      },
    });
  }

  /**
   * Get user notifications
   */
  async getNotifications(
    userId: string,
    params?: { skip?: number; take?: number; unreadOnly?: boolean },
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = { userId };

    if (params?.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: params?.skip || 0,
        take: params?.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    await this.prisma.notification.delete({ where: { id } });
  }

  // ==================== NOTIFICATION SETTINGS ====================

  /**
   * Get user notification settings
   */
  async getSettings(userId: string): Promise<NotificationSetting[]> {
    return this.prisma.notificationSetting.findMany({
      where: { userId },
    });
  }

  /**
   * Update notification setting
   */
  async updateSetting(
    userId: string,
    category: NotifCategory,
    enabled: boolean,
  ): Promise<NotificationSetting> {
    return this.prisma.notificationSetting.upsert({
      where: {
        userId_category: { userId, category },
      },
      update: { enabled },
      create: { userId, category, enabled },
    });
  }

  /**
   * Check if user has notifications enabled for category
   */
  async isNotificationEnabled(
    userId: string,
    category: NotifCategory,
  ): Promise<boolean> {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: {
        userId_category: { userId, category },
      },
    });

    // Default to enabled if no setting exists
    return setting?.enabled !== false;
  }

  /**
   * Initialize default settings for user
   */
  async initializeSettings(userId: string): Promise<void> {
    const categories: NotifCategory[] = ['CHAT', 'ANNOUNCEMENT', 'COMMUNITY'];

    await Promise.all(
      categories.map((category) =>
        this.prisma.notificationSetting.upsert({
          where: {
            userId_category: { userId, category },
          },
          update: {},
          create: { userId, category, enabled: true },
        }),
      ),
    );
  }

  /**
   * Send notification with settings check
   */
  async sendNotificationWithCheck(data: {
    userId: string;
    type: NotificationType;
    category: NotifCategory;
    title: string;
    body: string;
    roomId?: string;
  }): Promise<void> {
    // Check if user has this category enabled
    const isEnabled = await this.isNotificationEnabled(
      data.userId,
      data.category,
    );

    if (!isEnabled) {
      return;
    }

    // Create notification in DB
    await this.createNotification({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      roomId: data.roomId,
    });

    // Send push notification
    await this.sendPush(data.userId, {
      title: data.title,
      body: data.body,
      data: {
        type: data.type,
        roomId: data.roomId || '',
      },
    });
  }
}
