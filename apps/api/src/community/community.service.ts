import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { Community, CommunityCategory, Prisma } from '@prisma/client';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Create community post
   */
  async create(data: {
    category: CommunityCategory;
    title: string;
    content: string;
    images?: string[];
    authorId: string;
  }): Promise<Community> {
    return this.prisma.community.create({
      data: {
        category: data.category,
        title: data.title,
        content: data.content,
        images: data.images || [],
        authorId: data.authorId,
      },
    });
  }

  /**
   * Get all posts with filters
   */
  async findAll(params: {
    category?: CommunityCategory;
    authorId?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.CommunityWhereInput = {};

    if (params.category) where.category = params.category;
    if (params.authorId) where.authorId = params.authorId;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              nickname: true,
              profileImageUrl: true,
            },
          },
        },
      }),
      this.prisma.community.count({ where }),
    ]);

    return { posts, total };
  }

  /**
   * Get post by ID
   */
  async findById(id: string): Promise<Community | null> {
    return this.prisma.community.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  /**
   * Update post
   */
  async update(
    id: string,
    data: {
      title?: string;
      content?: string;
      images?: string[];
    },
    actorId?: string,
  ): Promise<Community> {
    const before = await this.findById(id);
    const updated = await this.prisma.community.update({
      where: { id },
      data,
    });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'COMMUNITY_UPDATE',
        targetType: 'community',
        targetId: id,
        details: { before, after: updated },
      });
    }

    return updated;
  }

  /**
   * Delete post
   */
  async delete(id: string, actorId?: string): Promise<void> {
    const post = await this.findById(id);

    await this.prisma.community.delete({ where: { id } });

    if (actorId) {
      await this.logsService.create({
        actorId,
        actionType: 'COMMUNITY_DELETE',
        targetType: 'community',
        targetId: id,
        details: { deleted: post },
      });
    }
  }

  /**
   * Get posts by category
   */
  async getByCategory(
    category: CommunityCategory,
    skip?: number,
    take?: number,
  ) {
    return this.findAll({ category, skip, take });
  }

  /**
   * Get recent posts
   */
  async getRecent(limit: number = 10): Promise<Community[]> {
    return this.prisma.community.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }
}
