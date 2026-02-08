import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { LogsService } from '../modules/logs/logs.service';
import { AppVersion, Platform } from '@prisma/client';

@Injectable()
export class AppVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Get latest version for platform
   */
  async getLatestVersion(platform: Platform): Promise<AppVersion | null> {
    return this.prisma.appVersion.findFirst({
      where: { platform },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create new app version (통합관리자만)
   */
  async createVersion(
    platform: Platform,
    version: string,
    buildNumber: number,
    isForceUpdate: boolean,
    updateMessage: string | null,
    downloadUrl: string | null,
    actorId: string,
  ): Promise<AppVersion> {
    const before = await this.getLatestVersion(platform);

    const created = await this.prisma.appVersion.create({
      data: {
        platform,
        version,
        buildNumber,
        isForceUpdate,
        updateMessage,
        downloadUrl,
      },
    });

    await this.logsService.createAdminLog({
      adminId: actorId,
      action: 'APP_VERSION_CREATE',
      target: created.id,
      description: `Created ${platform} version ${version} (build ${buildNumber})${isForceUpdate ? ' - FORCE UPDATE' : ''}`,
    });

    return created;
  }

  /**
   * Get all app versions
   */
  async getAll(): Promise<AppVersion[]> {
    return this.prisma.appVersion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get versions by platform
   */
  async getByPlatform(platform: Platform): Promise<AppVersion[]> {
    return this.prisma.appVersion.findMany({
      where: { platform },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if app version needs update
   */
  async checkVersion(
    platform: Platform,
    currentVersion: string,
    currentBuildNumber: number,
  ): Promise<{
    needsUpdate: boolean;
    isForceUpdate: boolean;
    latestVersion: AppVersion | null;
  }> {
    const latest = await this.getLatestVersion(platform);

    if (!latest) {
      return { needsUpdate: false, isForceUpdate: false, latestVersion: null };
    }

    const needsUpdate = currentBuildNumber < latest.buildNumber;
    const isForceUpdate = needsUpdate && latest.isForceUpdate;

    return { needsUpdate, isForceUpdate, latestVersion: latest };
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
