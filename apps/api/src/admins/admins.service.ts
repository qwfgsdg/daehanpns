import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { Admin, AdminTier, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { AdminWithRelations } from '../common/helpers/admin-scope.helper';

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
    'subscriptions.manage',
    'chats.manage',
    'banners.manage',
    'support.manage',
    'logs.view',
    'unlock.all',
    'app_versions.manage',
  ],
  CEO: [
    'members.view',
    'members.memo',
    'members.ban',
    'members.temp_account',
    'members.unmask_phone',
    'admins.manage',
    'subscriptions.manage',
    'chats.manage',
    'banners.manage',
    'support.manage',
  ],
  MIDDLE: [
    'members.view',
    'members.memo',
    'members.temp_account',
    'support.manage',
  ],
  GENERAL: ['members.view', 'support.manage'],
};

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 지점별 referralCode prefix 반환
   */
  private getRegionPrefix(region?: string): string {
    if (!region) return 'GEN';

    const prefixMap: Record<string, string> = {
      '본사': 'INT',
      '피닉스': 'PHX',
      '가산': 'GSN',
      '미라클': 'MRC',
    };

    return prefixMap[region] || 'GEN';
  }

  /**
   * Create admin with default permissions
   */
  async create(
    data: {
      loginId: string;
      email?: string;
      password: string;
      realName: string;
      salesName: string;
      tier: AdminTier;
      region?: string;
      logoUrl?: string;
    },
    actorId?: string,
  ): Promise<Admin> {
    // Check if loginId already exists
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { loginId: data.loginId },
    });

    if (existingAdmin) {
      throw new Error(`로그인 ID '${data.loginId}'는 이미 사용 중입니다.`);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // affiliationCode = referralCode (A안: 같은 값 사용)
    // 지점별 prefix + 순번 (예: PHX001, GSN002)
    const regionPrefix = this.getRegionPrefix(data.region);

    // 해당 지점의 마지막 순번 찾기
    const lastAdmin = await this.prisma.admin.findFirst({
      where: {
        referralCode: {
          startsWith: regionPrefix,
        },
      },
      orderBy: {
        referralCode: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastAdmin?.referralCode) {
      const lastNumber = parseInt(lastAdmin.referralCode.replace(regionPrefix, ''));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const code = `${regionPrefix}${String(nextNumber).padStart(3, '0')}`;

    const admin = await this.prisma.admin.create({
      data: {
        loginId: data.loginId,
        email: data.email,
        password: hashedPassword,
        realName: data.realName,
        salesName: data.salesName,
        tier: data.tier,
        affiliationCode: code,  // ✅ 같은 값
        referralCode: code,     // ✅ 같은 값
        region: data.region,
        logoUrl: data.logoUrl,
      },
    });

    // Create default permissions
    const permissions = DEFAULT_PERMISSIONS[data.tier];
    await Promise.all(
      permissions.map((permission) =>
        this.prisma.adminPermission.create({
          data: {
            adminId: admin.id,
            permission,
          },
        }),
      ),
    );

    if (actorId) {
      await this.logsService.createAdminLog({
        adminId: actorId,
        action: 'ADMIN_CREATE',
        target: admin.id,
        description: `Created admin: ${admin.realName} (${admin.loginId})`,
      });
    }

    return admin;
  }

  /**
   * Find admin by ID with permissions
   */
  async findById(id: string) {
    return this.prisma.admin.findUnique({
      where: { id },
      include: { permissions: true },
    });
  }

  /**
   * Find admin by loginId
   */
  async findByLoginId(loginId: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { loginId } });
  }

  /**
   * Find all admins with filters
   */
  async findAll(
    params: {
      tier?: AdminTier;
      isActive?: boolean;
      region?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
    currentAdmin?: AdminWithRelations,
  ) {
    const where: Prisma.AdminWhereInput = {
      deletedAt: null, // 삭제되지 않은 관리자만 조회
    };

    if (params.tier) where.tier = params.tier;
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.region) {
      where.region = { contains: params.region, mode: 'insensitive' };
    }
    if (params.search) {
      where.OR = [
        { loginId: { contains: params.search, mode: 'insensitive' } },
        { realName: { contains: params.search, mode: 'insensitive' } },
        { salesName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // 관리자 데이터 스코핑 적용
    if (currentAdmin && currentAdmin.tier !== AdminTier.INTEGRATED) {
      // 대표관리자: 같은 지점(region)의 모든 관리자
      if (currentAdmin.tier === AdminTier.CEO) {
        if (currentAdmin.region) {
          where.region = currentAdmin.region;
        } else {
          where.createdBy = currentAdmin.id;
        }
      }
      // 중간/일반 관리자: 같은 부모를 가진 관리자만
      else if (currentAdmin.tier === AdminTier.MIDDLE || currentAdmin.tier === AdminTier.GENERAL) {
        where.parentAdminId = currentAdmin.parentAdminId;
      }
    }

    const [admins, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        include: {
          permissions: true,
          _count: {
            select: {
              managedUsers: true,
              subordinates: true,
            },
          },
        },
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

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'ADMIN_UPDATE',
      target: id,
      targetType: 'ADMIN',
      description: `관리자 정보 수정: ${updated.realName}`,
      changesBefore: before,
      changesAfter: updated,
      status: 'SUCCESS',
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
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.admin.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'ADMIN_PASSWORD_CHANGE',
      target: id,
      description: 'Password changed',
    });
  }

  /**
   * Verify admin password
   */
  async verifyPassword(admin: Admin, password: string): Promise<boolean> {
    return bcrypt.compare(password, admin.password);
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
    const updated = await this.prisma.admin.update({
      where: { id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'ADMIN_UNLOCK',
      target: id,
      description: `Unlocked admin: ${updated.realName}`,
    });

    return updated;
  }

  /**
   * Set admin permission
   */
  async setPermission(
    adminId: string,
    permission: string,
    actorId: string,
  ): Promise<any> {
    const existing = await this.prisma.adminPermission.findUnique({
      where: { adminId_permission: { adminId, permission } },
    });

    if (existing) {
      // Delete to toggle off
      await this.prisma.adminPermission.delete({
        where: { adminId_permission: { adminId, permission } },
      });
    } else {
      // Create to toggle on
      await this.prisma.adminPermission.create({
        data: { adminId, permission },
      });
    }

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'PERMISSION_CHANGE',
      target: adminId,
      description: `${existing ? 'Removed' : 'Added'} permission: ${permission}`,
    });

    return { permission, enabled: !existing };
  }

  /**
   * Get admin permissions
   */
  async getPermissions(adminId: string): Promise<string[]> {
    const permissions = await this.prisma.adminPermission.findMany({
      where: { adminId },
    });
    return permissions.map((p) => p.permission);
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
    affiliateCode: string,
    name: string,
    actorId: string,
  ): Promise<any> {
    const tempPassword = nanoid(12);
    const tempEmail = `temp_${nanoid(8)}@temp.daehanpns.net`;

    const user = await this.prisma.user.create({
      data: {
        provider: 'GOOGLE', // Placeholder
        providerId: `temp_${nanoid(16)}`,
        email: tempEmail,
        phone: `temp_${nanoid(11)}`,
        name,
        nickname: `임시_${nanoid(6)}`,
        gender: 'MALE', // Default
        affiliateCode,
      },
    });

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'TEMP_ACCOUNT_CREATE',
      target: user.id,
      description: `Created temp account for: ${name}`,
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
    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: { logoUrl },
    });

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'ADMIN_LOGO_UPDATE',
      target: adminId,
      description: `Updated logo for: ${updated.realName}`,
    });

    return updated;
  }

  /**
   * Delete admin (soft delete)
   * - Check if admin has subordinates
   * - Check if admin has managed users
   * - Cannot delete self
   * - Cannot delete INTEGRATED admin
   */
  async delete(id: string, actorId: string): Promise<Admin> {
    const admin = await this.findById(id);
    if (!admin) {
      throw new Error('관리자를 찾을 수 없습니다.');
    }

    // Cannot delete self
    if (id === actorId) {
      throw new Error('자기 자신은 삭제할 수 없습니다.');
    }

    // Cannot delete INTEGRATED admin
    if (admin.tier === AdminTier.INTEGRATED) {
      throw new Error('통합관리자는 삭제할 수 없습니다.');
    }

    // Check if already deleted
    if (admin.deletedAt) {
      throw new Error('이미 삭제된 관리자입니다.');
    }

    // Check for subordinates
    const subordinates = await this.prisma.admin.count({
      where: {
        parentAdminId: id,
        deletedAt: null,
      },
    });

    if (subordinates > 0) {
      throw new Error('하위 관리자가 있는 경우 삭제할 수 없습니다. 먼저 하위 관리자를 삭제하거나 이동하세요.');
    }

    // Check for managed users
    const managedUsersCount = await this.prisma.user.count({
      where: { managerId: id },
    });

    if (managedUsersCount > 0) {
      throw new Error(
        `담당 회원 ${managedUsersCount}명이 있어 삭제할 수 없습니다. 관리자 삭제 모달을 사용하여 회원을 재배정하세요.`,
      );
    }

    const updated = await this.prisma.admin.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'ADMIN_DELETE',
      target: id,
      description: `Deleted admin: ${updated.realName}`,
    });

    return updated;
  }

  /**
   * Get deletion preview - check subordinates and affected data
   */
  async getDeletionPreview(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        realName: true,
        tier: true,
        region: true,
        _count: {
          select: {
            managedUsers: true,
          },
        },
      },
    });

    if (!admin) {
      throw new Error('관리자를 찾을 수 없습니다.');
    }

    // Get direct subordinates
    const subordinates = await this.prisma.admin.findMany({
      where: {
        parentAdminId: id,
        deletedAt: null,
      },
      select: {
        id: true,
        realName: true,
        tier: true,
        _count: {
          select: {
            subordinates: true,
            managedUsers: true,
          },
        },
      },
    });

    // Get available reassignment targets
    const availableTargets = await this.getReassignmentTargets(
      id,
      admin.region,
      admin.tier,
    );

    // Count total subordinates (recursive)
    const totalSubordinatesCount = await this.countTotalSubordinates(id);

    return {
      admin: {
        id: admin.id,
        name: admin.realName,
        tier: admin.tier,
        region: admin.region,
        managedUsersCount: admin._count.managedUsers,
      },
      subordinates: subordinates.map((sub) => ({
        id: sub.id,
        name: sub.realName,
        tier: sub.tier,
        managedUsersCount: sub._count.managedUsers,
        subordinatesCount: sub._count.subordinates,
        canDelete: sub._count.subordinates === 0,
        depth: 1,
      })),
      totalSubordinatesCount,
      availableReassignTargets: availableTargets,
    };
  }

  /**
   * Get available reassignment targets for a subordinate
   */
  async getReassignmentTargets(
    excludeAdminId: string,
    region: string | null,
    minTier: AdminTier,
  ) {
    const tierHierarchy = {
      INTEGRATED: 4,
      CEO: 3,
      MIDDLE: 2,
      GENERAL: 1,
    };

    // Get all active admins in same region with same or higher tier
    const admins = await this.prisma.admin.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        region: region || undefined,
        NOT: { id: excludeAdminId },
      },
      select: {
        id: true,
        realName: true,
        tier: true,
        region: true,
      },
      orderBy: [{ tier: 'asc' }, { realName: 'asc' }],
    });

    // Filter by tier
    const minTierValue = tierHierarchy[minTier];
    return admins.filter(
      (admin) => tierHierarchy[admin.tier] >= minTierValue,
    );
  }

  /**
   * Count total subordinates recursively
   */
  private async countTotalSubordinates(adminId: string): Promise<number> {
    const directSubs = await this.prisma.admin.findMany({
      where: {
        parentAdminId: adminId,
        deletedAt: null,
      },
      select: { id: true },
    });

    let total = directSubs.length;
    for (const sub of directSubs) {
      total += await this.countTotalSubordinates(sub.id);
    }

    return total;
  }

  /**
   * Check if potentialDescendant is a descendant of ancestor
   */
  private async isDescendant(
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    let current = await this.prisma.admin.findUnique({
      where: { id: potentialDescendantId },
      select: { parentAdminId: true },
    });

    while (current?.parentAdminId) {
      if (current.parentAdminId === ancestorId) {
        return true;
      }
      current = await this.prisma.admin.findUnique({
        where: { id: current.parentAdminId },
        select: { parentAdminId: true },
      });
    }

    return false;
  }

  /**
   * Validate tier reassignment
   */
  private validateTierReassignment(
    subordinateTier: AdminTier,
    targetTier: AdminTier,
  ): boolean {
    const tierHierarchy = {
      INTEGRATED: 4,
      CEO: 3,
      MIDDLE: 2,
      GENERAL: 1,
    };

    return tierHierarchy[targetTier] >= tierHierarchy[subordinateTier];
  }

  /**
   * Delete admin with subordinates handling
   */
  async deleteWithSubordinates(
    id: string,
    mainAdminUsersTarget: string | null,
    actions: Array<{
      subordinateId: string;
      action: 'reassign' | 'delete';
      targetAdminId?: string;
    }>,
    actorId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validate all actions
      for (const action of actions) {
        const subordinate = await tx.admin.findUnique({
          where: { id: action.subordinateId },
          include: {
            _count: {
              select: { subordinates: true },
            },
          },
        });

        if (!subordinate) {
          throw new Error(
            `관리자를 찾을 수 없습니다: ${action.subordinateId}`,
          );
        }

        if (action.action === 'delete') {
          // Check if has subordinates
          if (subordinate._count.subordinates > 0) {
            throw new Error(
              `${subordinate.realName}에게 하위 관리자가 있어 삭제할 수 없습니다.`,
            );
          }
        } else if (action.action === 'reassign') {
          if (!action.targetAdminId) {
            throw new Error('재배정 대상을 선택해야 합니다.');
          }

          const target = await tx.admin.findUnique({
            where: { id: action.targetAdminId },
          });

          if (!target) {
            throw new Error('재배정 대상을 찾을 수 없습니다.');
          }

          // Validate tier
          if (!this.validateTierReassignment(subordinate.tier, target.tier)) {
            throw new Error(
              `${subordinate.realName}(${subordinate.tier})를 ${target.realName}(${target.tier})에게 재배정할 수 없습니다. 등급이 맞지 않습니다.`,
            );
          }

          // Validate circular reference
          if (await this.isDescendant(action.targetAdminId, action.subordinateId)) {
            throw new Error('순환 참조가 발생합니다.');
          }
        }
      }

      // 2. Execute actions
      for (const action of actions) {
        if (action.action === 'reassign') {
          // Update parentAdminId only (managed users stay with subordinate)
          await tx.admin.update({
            where: { id: action.subordinateId },
            data: { parentAdminId: action.targetAdminId },
          });

          await this.logsService.createAdminLog({
            adminId: actorId,
            action: 'ADMIN_REASSIGN',
            target: action.subordinateId,
            description: `Reassigned to ${action.targetAdminId}`,
          });
        } else {
          // Reassign managed users
          if (action.targetAdminId) {
            await tx.user.updateMany({
              where: { managerId: action.subordinateId },
              data: { managerId: action.targetAdminId },
            });
          } else {
            await tx.user.updateMany({
              where: { managerId: action.subordinateId },
              data: { managerId: null },
            });
          }

          // Delete admin
          await tx.admin.update({
            where: { id: action.subordinateId },
            data: {
              deletedAt: new Date(),
              isActive: false,
            },
          });

          await this.logsService.createAdminLog({
            adminId: actorId,
            action: 'ADMIN_DELETE',
            target: action.subordinateId,
            description: 'Deleted with user reassignment',
          });
        }
      }

      // 3. Handle original admin's managed users
      const adminUsersCount = await tx.user.count({
        where: { managerId: id },
      });

      if (adminUsersCount > 0) {
        if (!mainAdminUsersTarget) {
          throw new Error(
            `담당 회원 ${adminUsersCount}명이 있습니다. 재배정 대상을 선택해야 합니다.`,
          );
        }

        await tx.user.updateMany({
          where: { managerId: id },
          data: { managerId: mainAdminUsersTarget },
        });

        await this.logsService.createAdminLog({
          adminId: actorId,
          action: 'USER_REASSIGN',
          target: id,
          description: `Reassigned ${adminUsersCount} users to ${mainAdminUsersTarget}`,
        });
      }

      // 4. Delete original admin
      await tx.admin.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      await this.logsService.createAdminLog({
        adminId: actorId,
        action: 'ADMIN_DELETE',
        target: id,
        description: 'Deleted with subordinates handling',
      });

      return {
        success: true,
        deletedAdminId: id,
        processedCount: actions.length,
      };
    });
  }
}
