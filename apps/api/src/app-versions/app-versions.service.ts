import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { AppVersion, Platform } from '@prisma/client';

@Injectable()
export class AppVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Get minimum version for platform
   */
  async getMinVersion(platform: Platform): Promise<AppVersion | null> {
    return this.prisma.appVersion.findFirst({
      where: { platform },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Set minimum version for platform (통합관리자만)
   */
  async setMinVersion(
    platform: Platform,
    minVersion: string,
    updatedBy: string,
  ): Promise<AppVersion> {
    const before = await this.getMinVersion(platform);

    // Update existing or create new
    const updated = await this.prisma.appVersion.upsert({
      where: {
        id: before?.id || 'new',
      },
      update: {
        minVersion,
        updatedBy,
      },
      create: {
        platform,
        minVersion,
        updatedBy,
      },
    });

    await this.logsService.create({
      actorId: updatedBy,
      actionType: 'APP_VERSION_UPDATE',
      targetType: 'app_version',
      targetId: updated.id,
      details: {
        before: before?.minVersion,
        after: minVersion,
        platform,
      },
    });

    return updated;
  }

  /**
   * Get all app versions
   */
  async getAll(): Promise<AppVersion[]> {
    return this.prisma.appVersion.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Check if app version is valid (meets minimum requirement)
   */
  isVersionValid(currentVersion: string, minVersion: string): boolean {
    const current = this.parseVersion(currentVersion);
    const min = this.parseVersion(minVersion);

    if (current.major !== min.major) {
      return current.major > min.major;
    }
    if (current.minor !== min.minor) {
      return current.minor > min.minor;
    }
    return current.patch >= min.patch;
  }

  /**
   * Parse version string (e.g., "1.2.3" -> { major: 1, minor: 2, patch: 3 })
   */
  private parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
  } {
    const parts = version.split('.').map((p) => parseInt(p, 10));
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }
}
