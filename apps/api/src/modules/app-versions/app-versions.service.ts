import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { Platform } from '@prisma/client';

@Injectable()
export class AppVersionsService {
  constructor(private prisma: PrismaService) {}

  async create(createAppVersionDto: CreateAppVersionDto) {
    // 동일한 platform과 version이 이미 존재하는지 확인
    const existing = await this.prisma.appVersion.findUnique({
      where: {
        platform_version: {
          platform: createAppVersionDto.platform,
          version: createAppVersionDto.version,
        },
      },
    });

    if (existing) {
      throw new ConflictException('해당 플랫폼의 동일한 버전이 이미 존재합니다');
    }

    const appVersion = await this.prisma.appVersion.create({
      data: createAppVersionDto,
    });

    return appVersion;
  }

  async findAll(platform?: Platform) {
    const where = platform ? { platform } : {};

    const versions = await this.prisma.appVersion.findMany({
      where,
      orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      versions,
      total: versions.length,
    };
  }

  async findLatest(platform: Platform) {
    const version = await this.prisma.appVersion.findFirst({
      where: { platform },
      orderBy: { createdAt: 'desc' },
    });

    if (!version) {
      throw new NotFoundException(`${platform} 플랫폼의 버전 정보를 찾을 수 없습니다`);
    }

    return version;
  }

  async checkVersion(platform: Platform, currentVersion: string, currentBuildNumber: number) {
    const latestVersion = await this.findLatest(platform);

    const needsUpdate = this.compareVersions(
      currentVersion,
      currentBuildNumber,
      latestVersion.version,
      latestVersion.buildNumber,
    );

    return {
      needsUpdate,
      isForceUpdate: needsUpdate && latestVersion.isForceUpdate,
      latestVersion: latestVersion.version,
      latestBuildNumber: latestVersion.buildNumber,
      updateMessage: latestVersion.updateMessage,
      downloadUrl: latestVersion.downloadUrl,
    };
  }

  private compareVersions(
    currentVersion: string,
    currentBuildNumber: number,
    latestVersion: string,
    latestBuildNumber: number,
  ): boolean {
    // 빌드 번호로 비교 (더 정확함)
    if (currentBuildNumber < latestBuildNumber) {
      return true;
    }

    // 버전 문자열로 비교 (예: "1.0.0" vs "1.0.1")
    const current = currentVersion.split('.').map(Number);
    const latest = latestVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(current.length, latest.length); i++) {
      const c = current[i] || 0;
      const l = latest[i] || 0;

      if (c < l) return true;
      if (c > l) return false;
    }

    return false;
  }

  async findOne(id: string) {
    const appVersion = await this.prisma.appVersion.findUnique({
      where: { id },
    });

    if (!appVersion) {
      throw new NotFoundException('버전 정보를 찾을 수 없습니다');
    }

    return appVersion;
  }

  async update(id: string, updateAppVersionDto: UpdateAppVersionDto) {
    await this.findOne(id);

    const appVersion = await this.prisma.appVersion.update({
      where: { id },
      data: updateAppVersionDto,
    });

    return appVersion;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.appVersion.delete({
      where: { id },
    });

    return { message: '버전 정보가 삭제되었습니다' };
  }
}
