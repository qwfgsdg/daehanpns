import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerPos } from '@prisma/client';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async create(createBannerDto: CreateBannerDto) {
    const banner = await this.prisma.banner.create({
      data: {
        ...createBannerDto,
        startDate: createBannerDto.startDate
          ? new Date(createBannerDto.startDate)
          : undefined,
        endDate: createBannerDto.endDate
          ? new Date(createBannerDto.endDate)
          : undefined,
      },
    });

    return banner;
  }

  async findAll(params?: {
    position?: BannerPos;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (params?.position) {
      where.position = params.position;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const banners = await this.prisma.banner.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      banners,
      total: banners.length,
    };
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('배너를 찾을 수 없습니다');
    }

    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto) {
    await this.findOne(id);

    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...updateBannerDto,
        startDate: updateBannerDto.startDate
          ? new Date(updateBannerDto.startDate)
          : undefined,
        endDate: updateBannerDto.endDate
          ? new Date(updateBannerDto.endDate)
          : undefined,
      },
    });

    return banner;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.banner.delete({
      where: { id },
    });

    return { message: '배너가 삭제되었습니다' };
  }

  async updateOrder(id: string, order: number) {
    await this.findOne(id);

    const banner = await this.prisma.banner.update({
      where: { id },
      data: { order },
    });

    return banner;
  }

  async toggleActive(id: string) {
    const banner = await this.findOne(id);

    const updated = await this.prisma.banner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });

    return updated;
  }
}
