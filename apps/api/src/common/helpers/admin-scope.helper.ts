import { Admin, AdminTier } from '@prisma/client';

export interface AdminWithRelations extends Admin {
  parent?: Admin | null;
}

/**
 * 관리자의 데이터 조회 범위를 결정하는 헬퍼
 */
export class AdminScopeHelper {
  /**
   * 관리자가 조회할 수 있는 소속코드 목록 반환
   */
  static getAccessibleAffiliationCodes(admin: AdminWithRelations): string[] | null {
    // 통합관리자: 모든 소속코드 접근 가능
    if (admin.tier === AdminTier.INTEGRATED) {
      return null; // null = 제한 없음
    }

    // 대표관리자: 자신의 소속코드만
    if (admin.tier === AdminTier.CEO && admin.affiliationCode) {
      return [admin.affiliationCode];
    }

    // 중간/일반관리자: 상위 대표관리자의 소속코드 찾기
    if (admin.tier === AdminTier.MIDDLE || admin.tier === AdminTier.GENERAL) {
      // 직속 부모가 대표관리자인 경우
      if (admin.parent?.tier === AdminTier.CEO && admin.parent.affiliationCode) {
        return [admin.parent.affiliationCode];
      }

      // 일반관리자의 경우: 부모(중간) -> 부모의 부모(대표)
      if (admin.tier === AdminTier.GENERAL && admin.parent) {
        // parent.parent가 있고 대표관리자이면
        const grandParent = (admin.parent as any).parent;
        if (grandParent?.tier === AdminTier.CEO && grandParent.affiliationCode) {
          return [grandParent.affiliationCode];
        }
      }
    }

    // 소속코드를 찾을 수 없으면 빈 배열 (아무것도 조회 불가)
    return [];
  }

  /**
   * Prisma where 조건에 소속코드 필터 추가
   */
  static addAffiliationCodeFilter(
    admin: AdminWithRelations,
    where: any = {},
  ): any {
    const accessibleCodes = this.getAccessibleAffiliationCodes(admin);

    // 통합관리자는 필터 없음
    if (accessibleCodes === null) {
      return where;
    }

    // 소속코드 필터 추가
    if (accessibleCodes.length > 0) {
      return {
        ...where,
        affiliateCode: { in: accessibleCodes },
      };
    }

    // 접근 가능한 소속코드가 없으면 불가능한 조건 추가
    return {
      ...where,
      id: 'impossible', // 절대 매칭되지 않는 조건
    };
  }

  /**
   * 관리자가 특정 회원에 접근 가능한지 확인
   */
  static canAccessUser(
    admin: AdminWithRelations,
    userAffiliateCode: string,
  ): boolean {
    const accessibleCodes = this.getAccessibleAffiliationCodes(admin);

    // 통합관리자는 모두 접근 가능
    if (accessibleCodes === null) {
      return true;
    }

    // 소속코드 확인
    return accessibleCodes.includes(userAffiliateCode);
  }

  /**
   * 관리자가 특정 관리자에 접근 가능한지 확인
   */
  static canAccessAdmin(
    currentAdmin: AdminWithRelations,
    targetAdmin: Admin,
  ): boolean {
    // 통합관리자는 모두 접근 가능
    if (currentAdmin.tier === AdminTier.INTEGRATED) {
      return true;
    }

    // 대표관리자: 자신이 생성한 관리자 또는 같은 소속코드
    if (currentAdmin.tier === AdminTier.CEO) {
      if (targetAdmin.createdBy === currentAdmin.id) {
        return true;
      }
      if (
        currentAdmin.affiliationCode &&
        targetAdmin.affiliationCode === currentAdmin.affiliationCode
      ) {
        return true;
      }
    }

    // 중간/일반관리자: 같은 부모를 가진 관리자만
    if (
      currentAdmin.tier === AdminTier.MIDDLE ||
      currentAdmin.tier === AdminTier.GENERAL
    ) {
      if (currentAdmin.parentAdminId === targetAdmin.parentAdminId) {
        return true;
      }
    }

    return false;
  }
}
