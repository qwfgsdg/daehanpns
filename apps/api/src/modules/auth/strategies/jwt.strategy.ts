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
    // 관리자인 경우 (type 필드로 판별 — loginId는 Phase 2 이후 user JWT에도 포함됨)
    if (payload.type === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
        include: {
          permissions: true,
          parent: {
            include: {
              parent: true, // 일반관리자 -> 중간관리자 -> 대표관리자를 위해 parent.parent까지 포함
            },
          },
        },
      });

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('권한이 없습니다.');
      }

      return {
        ...admin, // 전체 admin 객체 포함 (parent, parent.parent 포함)
        sub: admin.id, // JWT payload의 sub 필드 유지
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
      id: user.id,
      sub: user.id,
      userId: user.id,
      phone: user.phone,
      provider: user.provider,
      isAdmin: false,
    };
  }
}
