import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // 관리자인 경우
    if (payload.loginId) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
        include: { permissions: true },
      });

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('권한이 없습니다.');
      }

      return {
        userId: admin.id,
        loginId: admin.loginId,
        tier: admin.tier,
        permissions: admin.permissions.map((p) => p.permission),
        isAdmin: true,
      };
    }

    // 일반 회원인 경우
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    return {
      userId: user.id,
      phone: user.phone,
      provider: user.provider,
      isAdmin: false,
    };
  }
}
