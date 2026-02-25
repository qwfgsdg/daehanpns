/**
 * 권한 목록
 */
export const PERMISSIONS = {
  // 회원 관리
  MEMBERS_VIEW: 'members.view',
  MEMBERS_UPDATE: 'members.update',
  MEMBERS_BAN: 'members.ban',
  MEMBERS_MEMO: 'members.memo',
  MEMBERS_UNMASK_PHONE: 'members.unmask_phone',
  MEMBERS_EXCEL: 'members.excel',
  MEMBERS_TEMP_ACCOUNT: 'members.temp_account',
  MEMBERS_CONVERT: 'members.convert',

  // 관리자 관리
  ADMINS_MANAGE: 'admins.manage',
  ADMINS_LOGO: 'admins.logo',
  UNLOCK_ALL: 'unlock.all',

  // 구독 관리
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',

  // 채팅 관리
  CHATS_MANAGE: 'chats.manage',

  // 배너/팝업 관리
  BANNERS_MANAGE: 'banners.manage',

  // 고객센터 관리
  SUPPORT_MANAGE: 'support.manage',

  // 감사 로그
  LOGS_VIEW: 'logs.view',

  // 앱 버전 관리
  APP_VERSIONS_MANAGE: 'app_versions.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface AdminUser {
  id: string;
  name: string;
  loginId: string;
  tier: 'INTEGRATED' | 'CEO' | 'MIDDLE' | 'GENERAL';
  permissions: string[];
}

/**
 * 권한 체크 헬퍼
 */
export class PermissionHelper {
  /**
   * 관리자가 특정 권한을 가지고 있는지 확인
   */
  static hasPermission(admin: AdminUser | null, permission: string): boolean {
    if (!admin) return false;

    // 통합관리자는 모든 권한 보유
    if (admin.tier === 'INTEGRATED') return true;

    return admin.permissions.includes(permission);
  }

  /**
   * 여러 권한 중 하나라도 있는지 확인
   */
  static hasAnyPermission(admin: AdminUser | null, permissions: string[]): boolean {
    if (!admin) return false;
    if (admin.tier === 'INTEGRATED') return true;

    return permissions.some(p => admin.permissions.includes(p));
  }

  /**
   * 모든 권한을 가지고 있는지 확인
   */
  static hasAllPermissions(admin: AdminUser | null, permissions: string[]): boolean {
    if (!admin) return false;
    if (admin.tier === 'INTEGRATED') return true;

    return permissions.every(p => admin.permissions.includes(p));
  }

  /**
   * 관리자 계층 체크
   */
  static isTier(admin: AdminUser | null, tier: AdminUser['tier']): boolean {
    return admin?.tier === tier;
  }

  /**
   * 최소 계층 이상인지 확인
   */
  static isAtLeastTier(admin: AdminUser | null, minTier: AdminUser['tier']): boolean {
    if (!admin) return false;

    const tierHierarchy: AdminUser['tier'][] = ['GENERAL', 'MIDDLE', 'CEO', 'INTEGRATED'];
    const adminTierIndex = tierHierarchy.indexOf(admin.tier);
    const minTierIndex = tierHierarchy.indexOf(minTier);

    return adminTierIndex >= minTierIndex;
  }
}

/**
 * 메뉴 접근 권한 정의
 */
export const MENU_PERMISSIONS: Record<string, string[]> = {
  '/users': [PERMISSIONS.MEMBERS_VIEW],
  '/admins': [PERMISSIONS.ADMINS_MANAGE],
  '/subscriptions': [PERMISSIONS.SUBSCRIPTIONS_MANAGE],
  '/chats': [PERMISSIONS.CHATS_MANAGE],
  '/messenger': [PERMISSIONS.CHATS_MANAGE],
  '/logs': [PERMISSIONS.LOGS_VIEW],
  '/banners': [PERMISSIONS.BANNERS_MANAGE],
  '/app-versions': [PERMISSIONS.APP_VERSIONS_MANAGE],
  '/support': [PERMISSIONS.SUPPORT_MANAGE],
};

/**
 * 관리자가 메뉴에 접근 가능한지 확인
 */
export function canAccessMenu(admin: AdminUser | null, path: string): boolean {
  const requiredPermissions = MENU_PERMISSIONS[path];
  if (!requiredPermissions) return true; // 권한 정의가 없으면 접근 가능

  return PermissionHelper.hasAnyPermission(admin, requiredPermissions);
}
