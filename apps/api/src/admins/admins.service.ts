import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { Admin, AdminTier, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

// Default permissions by tier based on PLAN.md
const DEFAULT_PERMISSIONS: Record<AdminTier, string[]> = {
  INTEGRATED: [
    'members.view',
    'members.memo',
    'members.ban',
    'members.temp_account',
    'members.unmask_phone',
    'members.excel',
    'admins.manage',
    'admins.logo',
    'subscriptions.approve',
    'chat.manage',
    'chat.keywords',
    'banners.manage',
    'community.manage',
    'support.manage',
    'logs.view',
    'unlock.all',
    'app_versions.manage',
  ],
  REPRESENTATIVE: [
    'members.view',
    'members.memo',
    'members.ban',
    'members.temp_account',
    'members.unmask_phone',
    'admins.manage',
    'subscriptions.approve',
    'chat.manage',
    'chat.keywords',
    'banners.manage',
    'community.manage',
    'support.manage',
  ],
  MIDDLE: [
    'members.view',
    'members.memo',
    'members.temp_account',
    'chat.manage',
    'community.manage',
    'support.manage',
  ],
  GENERAL: ['members.view', 'chat.manage', 'support.manage'],
};

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Create admin with default permissions
   */
  async create(
    data: {
      email: string;
      password: string;
      name: string;
      tier: AdminTier;
      region?: string;
      logoUrl?: string;
    },
    actorId?: string,
  ): Promise<Admin> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const affiliationCode = nanoid(10);

    const admin = await this.prisma.admin.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        tier: data.tier,
        affiliationCode,
        region: data.region,
        logoUrl: data.logoUrl,
      },
    });

    // Create default permissions
    const permissions = DEFAULT_PERMISSIONS[data.tier];
    await Promise.all(
      permissions.map((menuKey) =>
        this.prisma.adminPermission.create({
          data: {
            adminId: admin.id,
            menuKey,
            allowed: true,
          },
        }),
      ),
    );

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'ADMIN_CREATE',
        targetType: 'admin',
        targetId: admin.id,
        details: { admin },
      });
    }

    return admin;
  }

  /**
   * Find admin by ID with permissions
   */
  async findById(id: string): Promise<Admin & { permissions?: any[] }> {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      include: { permissions: true },
    });
    return admin;
  }

  /**
   * Find admin by email
   */
  async findByEmail(email: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { email } });
  }

  /**
   * Find all admins with filters
   */
  async findAll(params: {
    tier?: AdminTier;
    isActive?: boolean;
    region?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.AdminWhereInput = {};

    if (params.tier) where.tier = params.tier;
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.region) where.region = params.region;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [admins, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        include: { permissions: true },
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admin.count({ where }),
    ]);

    return { admins, total };
  }

  /**
   * Update admin
   */
  async update(
    id: string,
    data: Prisma.AdminUpdateInput,
    actorId: string,
  ): Promise<Admin> {
    const before = await this.findById(id);
    const updated = await this.prisma.admin.update({ where: { id }, data });

    await this.logsService.create({
      actorId,
      actionType: 'ADMIN_UPDATE',
      targetType: 'admin',
      targetId: id,
      details: { before, after: updated },
    });

    return updated;
  }

  /**
   * Update admin password
   */
  async updatePassword(
    id: string,
    newPassword: string,
    actorId: string,
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.admin.update({
      where: { id },
      data: { passwordHash },
    });

    await this.logsService.create({
      actorId,
      actionType: 'ADMIN_PASSWORD_CHANGE',
      targetType: 'admin',
      targetId: id,
      details: { message: 'Password changed' },
    });
  }

  /**
   * Verify admin password
   */
  async verifyPassword(admin: Admin, password: string): Promise<boolean> {
    return bcrypt.compare(password, admin.passwordHash);
  }

  /**
   * Increment login attempts
   */
  async incrementLoginAttempts(id: string): Promise<number> {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    const attempts = (admin?.loginAttempts || 0) + 1;

    // Lock for 30 minutes after 5 failed attempts
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

    await this.prisma.admin.update({
      where: { id },
      data: { loginAttempts: attempts, lockedUntil },
    });

    return attempts;
  }

  /**
   * Reset login attempts
   */
  async resetLoginAttempts(id: string): Promise<void> {
    await this.prisma.admin.update({
      where: { id },
      data: { loginAttempts: 0, lockedUntil: null },
    });
  }

  /**
   * Unlock admin (통합관리자만)
   */
  async unlock(id: string, actorId: string): Promise<Admin> {
    const before = await this.findById(id);
    const updated = await this.prisma.admin.update({
      where: { id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    await this.logsService.create({
      actorId,
      actionType: 'ADMIN_UNLOCK',
      targetType: 'admin',
      targetId: id,
      details: { before, after: updated },
    });

    return updated;
  }

  /**
   * Set admin permission
   */
  async setPermission(
    adminId: string,
    menuKey: string,
    allowed: boolean,
    actorId: string,
  ): Promise<any> {
    const before = await this.prisma.adminPermission.findUnique({
      where: { adminId_menuKey: { adminId, menuKey } },
    });

    const permission = await this.prisma.adminPermission.upsert({
      where: { adminId_menuKey: { adminId, menuKey } },
      update: { allowed },
      create: { adminId, menuKey, allowed },
    });

    await this.logsService.create({
      actorId,
      actionType: 'PERMISSION_CHANGE',
      targetType: 'admin',
      targetId: adminId,
      details: { before, after: permission, menuKey, allowed },
    });

    return permission;
  }

  /**
   * Get admin permissions
   */
  async getPermissions(adminId: string): Promise<string[]> {
    const permissions = await this.prisma.adminPermission.findMany({
      where: { adminId, allowed: true },
    });
    return permissions.map((p) => p.menuKey);
  }

  /**
   * Generate invite link with affiliation code
   */
  generateInviteLink(affiliationCode: string, baseUrl: string): string {
    return `${baseUrl}/join?code=${affiliationCode}`;
  }

  /**
   * Create temporary account
   */
  async createTempAccount(
    affiliationCode: string,
    name: string,
    actorId: string,
  ): Promise<any> {
    const tempPassword = nanoid(12);
    const tempEmail = `temp_${nanoid(8)}@temp.daehanpns.net`;

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        provider: 'GOOGLE', // Placeholder
        providerId: `temp_${nanoid(16)}`,
        email: tempEmail,
        phone: `temp_${nanoid(11)}`,
        name,
        nickname: `임시_${nanoid(6)}`,
        gender: 'MALE', // Default
        affiliationCode,
      },
    });

    await this.logsService.create({
      actorId,
      actionType: 'TEMP_ACCOUNT_CREATE',
      targetType: 'user',
      targetId: user.id,
      details: { user, tempEmail, tempPassword },
    });

    return { user, tempEmail, tempPassword };
  }

  /**
   * Update representative admin logo (통합관리자만)
   */
  async updateLogo(
    adminId: string,
    logoUrl: string,
    actorId: string,
  ): Promise<Admin> {
    const before = await this.findById(adminId);
    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: { logoUrl },
    });

    await this.logsService.create({
      actorId,
      actionType: 'ADMIN_LOGO_UPDATE',
      targetType: 'admin',
      targetId: adminId,
      details: { before: before.logoUrl, after: logoUrl },
    });

    return updated;
  }

  /**
   * Deactivate admin
   */
  async deactivate(id: string, actorId: string): Promise<Admin> {
    const updated = await this.prisma.admin.update({
      where: { id },
      data: { isActive: false },
    });

    await this.logsService.create({
      actorId,
      actionType: 'ADMIN_DEACTIVATE',
      targetType: 'admin',
      targetId: id,
      details: { admin: updated },
    });

    return updated;
  }

  /**
   * Activate admin
   */
  async activate(id: string, actorId: string): Promise<Admin> {
    const updated = await this.prisma.admin.update({
      where: { id },
      data: { isActive: true },
    });

    await this.logsService.create({
      actorId,
      actionType: 'ADMIN_ACTIVATE',
      targetType: 'admin',
      targetId: id,
      details: { admin: updated },
    });

    return updated;
  }
}
