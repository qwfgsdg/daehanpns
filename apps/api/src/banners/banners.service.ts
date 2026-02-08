import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { Banner, Popup, BannerPos, DismissType, Prisma } from '@prisma/client';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  // ==================== BANNERS ====================

  /**
   * Create banner
   */
  async createBanner(data: {
    title: string;
    imageUrl: string;
    linkUrl?: string;
    startDate: Date;
    endDate: Date;
    position: BannerPos;
  }): Promise<Banner> {
    return this.prisma.banner.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        startDate: data.startDate,
        endDate: data.endDate,
        position: data.position,
      },
    });
  }

  /**
   * Get all banners with filters
   */
  async getBanners(params: {
    position?: BannerPos;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.BannerWhereInput = {};

    if (params.position) where.position = params.position;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [banners, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.banner.count({ where }),
    ]);

    return { banners, total };
  }

  /**
   * Get active banners (within date range)
   */
  async getActiveBanners(position?: BannerPos): Promise<Banner[]> {
    const now = new Date();
    const where: Prisma.BannerWhereInput = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    };

    if (position) where.position = position;

    return this.prisma.banner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get banner by ID
   */
  async getBannerById(id: string): Promise<Banner | null> {
    return this.prisma.banner.findUnique({ where: { id } });
  }

  /**
   * Update banner
   */
  async updateBanner(
    id: string,
    data: Partial<Banner>,
    actorId?: string,
  ): Promise<Banner> {
    const before = await this.getBannerById(id);
    const updated = await this.prisma.banner.update({
      where: { id },
      data,
    });

    if (actorId) {
      await this.logsService.createAdminLog({
        adminId: actorId,
        action: 'BANNER_UPDATE',
        target: id,
      });
    }

    return updated;
  }

  /**
   * Delete banner
   */
  async deleteBanner(id: string, actorId?: string): Promise<void> {
    const banner = await this.getBannerById(id);

    await this.prisma.banner.delete({ where: { id } });

    if (actorId) {
      await this.logsService.createAdminLog({
        adminId: actorId,
        action: 'BANNER_DELETE',
        target: id,
      });
    }
  }

  // ==================== POPUPS ====================

  /**
   * Create popup (max 5 active check)
   */
  async createPopup(data: {
    title: string;
    content?: string;
    imageUrl?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Popup> {
    // Check if there are already 5 active popups
    const now = new Date();
    const activeCount = await this.prisma.popup.count({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (activeCount >= 5) {
      throw new Error('Maximum 5 active popups allowed');
    }

    return this.prisma.popup.create({
      data: {
        title: data.title,
        content: data.content || '',
        imageUrl: data.imageUrl,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  }

  /**
   * Get all popups with filters
   */
  async getPopups(params: { isActive?: boolean; skip?: number; take?: number }) {
    const where: Prisma.PopupWhereInput = {};

    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [popups, total] = await Promise.all([
      this.prisma.popup.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.popup.count({ where }),
    ]);

    return { popups, total };
  }

  /**
   * Get active popups (within date range)
   */
  async getActivePopups(): Promise<Popup[]> {
    const now = new Date();

    return this.prisma.popup.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  /**
   * Get popup by ID
   */
  async getPopupById(id: string): Promise<Popup | null> {
    return this.prisma.popup.findUnique({ where: { id } });
  }

  /**
   * Update popup
   */
  async updatePopup(
    id: string,
    data: Partial<Popup>,
    actorId?: string,
  ): Promise<Popup> {
    const before = await this.getPopupById(id);
    const updated = await this.prisma.popup.update({
      where: { id },
      data,
    });

    if (actorId) {
      await this.logsService.createAdminLog({
        adminId: actorId,
        action: 'POPUP_UPDATE',
        target: id,
      });
    }

    return updated;
  }

  /**
   * Delete popup
   */
  async deletePopup(id: string, actorId?: string): Promise<void> {
    const popup = await this.getPopupById(id);

    await this.prisma.popup.delete({ where: { id } });

    if (actorId) {
      await this.logsService.createAdminLog({
        adminId: actorId,
        action: 'POPUP_DELETE',
        target: id,
      });
    }
  }

  /**
   * Dismiss popup for user (TODAY or PERMANENT)
   */
  async dismissPopup(
    userId: string,
    popupId: string,
    type: DismissType,
  ): Promise<any> {
    return this.prisma.popupDismissal.upsert({
      where: {
        popupId_userId: { userId, popupId },
      },
      update: {
        type,
        dismissedAt: new Date(),
      },
      create: {
        userId,
        popupId,
        type,
      },
    });
  }

  /**
   * Get popups for user (excluding dismissed)
   */
  async getPopupsForUser(userId: string): Promise<Popup[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all active popups
    const activePopups = await this.getActivePopups();

    // Get user's dismissals
    const dismissals = await this.prisma.popupDismissal.findMany({
      where: {
        userId,
        OR: [
          { type: 'FOREVER' },
          {
            type: 'TODAY',
            dismissedAt: { gte: todayStart },
          },
        ],
      },
    });

    const dismissedPopupIds = new Set(dismissals.map((d) => d.popupId));

    // Filter out dismissed popups
    return activePopups.filter((popup) => !dismissedPopupIds.has(popup.id));
  }

  /**
   * Clear today dismissals (for testing)
   */
  async clearTodayDismissals(userId: string): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    await this.prisma.popupDismissal.deleteMany({
      where: {
        userId,
        type: 'TODAY',
        dismissedAt: { gte: todayStart },
      },
    });
  }
}
