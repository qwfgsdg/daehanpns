import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { Prisma, User } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Create a new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Find user by providerId
   */
  async findByProviderId(providerId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { providerId } });
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  /**
   * Find user by nickname
   */
  async findByNickname(nickname: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { nickname } });
  }

  /**
   * Search and filter users with pagination
   */
  async findAll(params: {
    search?: string;
    affiliationCode?: string;
    isBanned?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    lastLoginAfter?: Date;
    lastLoginBefore?: Date;
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const where: Prisma.UserWhereInput = {};

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { nickname: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.affiliationCode) {
      where.affiliationCode = params.affiliationCode;
    }

    if (params.isBanned !== undefined) {
      where.isBanned = params.isBanned;
    }

    if (params.createdAfter || params.createdBefore) {
      where.createdAt = {};
      if (params.createdAfter) where.createdAt.gte = params.createdAfter;
      if (params.createdBefore) where.createdAt.lte = params.createdBefore;
    }

    if (params.lastLoginAfter || params.lastLoginBefore) {
      where.lastLoginAt = {};
      if (params.lastLoginAfter) where.lastLoginAt.gte = params.lastLoginAfter;
      if (params.lastLoginBefore) where.lastLoginAt.lte = params.lastLoginBefore;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: params.orderBy || { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Update user
   */
  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    actorId?: string,
  ): Promise<User> {
    const before = await this.findById(id);
    const updated = await this.prisma.user.update({ where: { id }, data });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'USER_UPDATE',
        targetType: 'user',
        targetId: id,
        details: { before, after: updated },
      });
    }

    return updated;
  }

  /**
   * Ban user
   */
  async ban(id: string, reason: string, actorId: string): Promise<User> {
    const before = await this.findById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBanned: true, banReason: reason },
    });

    await this.logsService.create({
      actorId,
      actionType: 'USER_BAN',
      targetType: 'user',
      targetId: id,
      details: { before, after: updated, reason },
    });

    return updated;
  }

  /**
   * Unban user
   */
  async unban(id: string, actorId: string): Promise<User> {
    const before = await this.findById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBanned: false, banReason: null },
    });

    await this.logsService.create({
      actorId,
      actionType: 'USER_UNBAN',
      targetType: 'user',
      targetId: id,
      details: { before, after: updated },
    });

    return updated;
  }

  /**
   * Phone masking logic (mask middle 4 digits if > 1 month since registration)
   */
  maskPhone(phone: string, createdAt: Date): string {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (createdAt > oneMonthAgo) {
      return phone;
    }

    // Mask middle 4 digits: 010-1234-5678 -> 010-****-5678
    return phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3');
  }

  /**
   * Create member memo
   */
  async createMemo(
    userId: string,
    adminId: string,
    content: string,
  ): Promise<any> {
    const memo = await this.prisma.memberMemo.create({
      data: { userId, adminId, content },
    });

    await this.logsService.create({
      actorId: adminId,
      actionType: 'MEMBER_MEMO_CREATE',
      targetType: 'user',
      targetId: userId,
      details: { memo },
    });

    return memo;
  }

  /**
   * Get user memos
   */
  async getMemos(userId: string): Promise<any[]> {
    return this.prisma.memberMemo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update memo
   */
  async updateMemo(
    memoId: string,
    content: string,
    adminId: string,
  ): Promise<any> {
    const before = await this.prisma.memberMemo.findUnique({
      where: { id: memoId },
    });
    const updated = await this.prisma.memberMemo.update({
      where: { id: memoId },
      data: { content },
    });

    await this.logsService.create({
      actorId: adminId,
      actionType: 'MEMBER_MEMO_UPDATE',
      targetType: 'memo',
      targetId: memoId,
      details: { before, after: updated },
    });

    return updated;
  }

  /**
   * Delete memo
   */
  async deleteMemo(memoId: string, adminId: string): Promise<void> {
    const memo = await this.prisma.memberMemo.findUnique({
      where: { id: memoId },
    });

    await this.prisma.memberMemo.delete({ where: { id: memoId } });

    await this.logsService.create({
      actorId: adminId,
      actionType: 'MEMBER_MEMO_DELETE',
      targetType: 'memo',
      targetId: memoId,
      details: { deleted: memo },
    });
  }

  /**
   * Export users to Excel (통합관리자만)
   */
  async exportToExcel(filters: any): Promise<Buffer> {
    const { users } = await this.findAll({ ...filters, skip: 0, take: 10000 });

    const data = users.map((user) => ({
      ID: user.id,
      이메일: user.email || '',
      이름: user.name,
      닉네임: user.nickname,
      전화번호: user.phone,
      성별: user.gender,
      소속코드: user.affiliationCode,
      가입일: user.createdAt.toISOString(),
      최종로그인: user.lastLoginAt?.toISOString() || '',
      추방여부: user.isBanned ? '예' : '아니오',
      추방사유: user.banReason || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '회원목록');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Generate presigned URL for profile image upload
   */
  async getProfileImageUploadUrl(userId: string): Promise<string> {
    // TODO: Implement S3 presigned URL generation
    // This will be implemented in the files module
    return `https://s3.amazonaws.com/bucket/users/${userId}/profile`;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Get inactive users (not logged in for specified days)
   */
  async getInactiveUsers(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.prisma.user.findMany({
      where: {
        lastLoginAt: {
          lte: cutoffDate,
        },
      },
      orderBy: { lastLoginAt: 'asc' },
    });
  }

  /**
   * Get new users count
   */
  async getNewUsersCount(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.prisma.user.count({
      where: {
        createdAt: {
          gte: cutoffDate,
        },
      },
    });
  }
}
