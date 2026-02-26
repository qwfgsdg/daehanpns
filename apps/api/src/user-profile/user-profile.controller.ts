import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserProfileController {
  constructor(private prisma: PrismaService) {}

  /**
   * 내 정보 조회
   */
  @Get('me')
  async getMyProfile(@Req() req: any) {
    const user = await this.prisma.user.findFirst({
      where: { id: req.user.sub, deletedAt: null },
      select: {
        id: true,
        phone: true,
        name: true,
        nickname: true,
        gender: true,
        birthDate: true,
        profileImage: true,
        provider: true,
        memberType: true,
        managerId: true,
        affiliateCode: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * 내 정보 수정
   */
  @Patch('me')
  async updateMyProfile(
    @Req() req: any,
    @Body() body: { name?: string; nickname?: string; gender?: string; birthDate?: string; profileImage?: string },
  ) {
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.nickname !== undefined) updateData.nickname = body.nickname;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.birthDate !== undefined) updateData.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    if (body.profileImage !== undefined) updateData.profileImage = body.profileImage;

    const user = await this.prisma.user.update({
      where: { id: req.user.sub },
      data: updateData,
      select: {
        id: true,
        phone: true,
        name: true,
        nickname: true,
        gender: true,
        birthDate: true,
        profileImage: true,
        provider: true,
        memberType: true,
        managerId: true,
        affiliateCode: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * 비밀번호 변경
   */
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    if (user.provider !== 'LOCAL') {
      throw new BadRequestException('소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.');
    }

    if (!user.password) {
      throw new BadRequestException('비밀번호가 설정되어 있지 않습니다.');
    }

    const isMatch = await bcrypt.compare(body.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');
    }

    if (!body.newPassword || body.newPassword.length < 6) {
      throw new BadRequestException('새 비밀번호는 6자 이상이어야 합니다.');
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);

    await this.prisma.user.update({
      where: { id: req.user.sub },
      data: { password: hashedPassword },
    });

    return { message: '비밀번호가 변경되었습니다.' };
  }

  /**
   * 회원 탈퇴 (soft delete)
   */
  @Delete('me')
  async deleteAccount(@Req() req: any) {
    await this.prisma.user.update({
      where: { id: req.user.sub },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }
}
