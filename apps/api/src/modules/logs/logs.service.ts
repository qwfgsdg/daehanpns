import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async createAdminLog(data: {
    adminId: string;
    action: string;
    target?: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.adminLog.create({
      data,
    });
  }

  async getAdminLogs(adminId?: string, limit: number = 100) {
    return this.prisma.adminLog.findMany({
      where: adminId ? { adminId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        admin: {
          select: {
            name: true,
            loginId: true,
          },
        },
      },
    });
  }
}
