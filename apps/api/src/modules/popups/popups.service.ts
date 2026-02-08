import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';

@Injectable()
export class PopupsService {
  constructor(private prisma: PrismaService) {}

  async create(createPopupDto: CreatePopupDto) {
    const popup = await this.prisma.popup.create({
      data: {
        ...createPopupDto,
        startDate: createPopupDto.startDate
          ? new Date(createPopupDto.startDate)
          : undefined,
        endDate: createPopupDto.endDate
          ? new Date(createPopupDto.endDate)
          : undefined,
      },
    });

    return popup;
  }

  async findAll(params?: { isActive?: boolean }) {
    const where: any = {};

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const popups = await this.prisma.popup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      popups,
      total: popups.length,
    };
  }

  async findActive() {
    const now = new Date();

    const popups = await this.prisma.popup.findMany({
      where: {
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: { gte: now } },
            ],
          },
          {
            startDate: null,
            endDate: null,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return popups;
  }

  async findOne(id: string) {
    const popup = await this.prisma.popup.findUnique({
      where: { id },
    });

    if (!popup) {
      throw new NotFoundException('팝업을 찾을 수 없습니다');
    }

    return popup;
  }

  async update(id: string, updatePopupDto: UpdatePopupDto) {
    await this.findOne(id);

    const popup = await this.prisma.popup.update({
      where: { id },
      data: {
        ...updatePopupDto,
        startDate: updatePopupDto.startDate
          ? new Date(updatePopupDto.startDate)
          : undefined,
        endDate: updatePopupDto.endDate
          ? new Date(updatePopupDto.endDate)
          : undefined,
      },
    });

    return popup;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.popup.delete({
      where: { id },
    });

    return { message: '팝업이 삭제되었습니다' };
  }

  async toggleActive(id: string) {
    const popup = await this.findOne(id);

    const updated = await this.prisma.popup.update({
      where: { id },
      data: { isActive: !popup.isActive },
    });

    return updated;
  }
}
