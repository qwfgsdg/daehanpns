import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CommunityCategory } from '@prisma/client';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  /**
   * Create post (requires authentication)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    data: {
      category: CommunityCategory;
      title: string;
      content: string;
      images?: string[];
    },
    @Req() req: any,
  ) {
    return this.communityService.create({
      ...data,
      authorId: req.user.id,
    });
  }

  /**
   * Get all posts
   */
  @Get()
  async findAll(
    @Query('category') category?: CommunityCategory,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const params: any = { category, authorId, search };

    if (skip) params.skip = parseInt(skip, 10);
    if (take) params.take = parseInt(take, 10);

    return this.communityService.findAll(params);
  }

  /**
   * Get post by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.communityService.findById(id);
  }

  /**
   * Update post (author or admin)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() data: { title?: string; content?: string; images?: string[] },
    @Req() req: any,
  ) {
    const post = await this.communityService.findById(id);

    // Check if user is author or admin
    const isAdmin = req.user.type === 'admin';
    const isAuthor = post?.authorId === req.user.id;

    if (!isAdmin && !isAuthor) {
      throw new Error('Unauthorized');
    }

    return this.communityService.update(id, data, req.user.id);
  }

  /**
   * Delete post (author or admin)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: any) {
    const post = await this.communityService.findById(id);

    // Check if user is author or admin
    const isAdmin = req.user.type === 'admin';
    const isAuthor = post?.authorId === req.user.id;

    if (!isAdmin && !isAuthor) {
      throw new Error('Unauthorized');
    }

    await this.communityService.delete(id, req.user.id);
    return { success: true };
  }

  /**
   * Get posts by category
   */
  @Get('category/:category')
  async getByCategory(
    @Param('category') category: CommunityCategory,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;

    return this.communityService.getByCategory(category, skipNum, takeNum);
  }

  /**
   * Get recent posts
   */
  @Get('recent/list')
  async getRecent(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.communityService.getRecent(limitNum);
  }

  /**
   * Admin: Manage posts
   */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard, PermissionGuard)
  @RequirePermission('community.manage')
  async adminDelete(@Param('id') id: string, @Req() req: any) {
    await this.communityService.delete(id, req.user.id);
    return { success: true };
  }
}
