import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminTier } from '@daehanpns/shared';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<AdminTier[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.isAdmin) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    const hasRole = requiredRoles.includes(user.tier);
    if (!hasRole) {
      throw new ForbiddenException('해당 작업을 수행할 권한이 없습니다.');
    }

    return true;
  }
}
