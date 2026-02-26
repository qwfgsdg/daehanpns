/**
 * 권한 체크 유틸리티 (백엔드 OwnerType 일치)
 */

import { OwnerType } from '@/types';
import { ADMIN_ROLES, PERMISSIONS } from '@/constants';

/**
 * 관리자 역할인지 확인
 */
export const isAdminRole = (role: OwnerType): boolean => {
  return ADMIN_ROLES.includes(role);
};

/**
 * 방장 역할인지 확인
 */
export const isOwnerRole = (role: OwnerType): boolean => {
  return role === 'OWNER';
};

/**
 * 공지사항 수정 권한 확인
 */
export const canEditNotice = (role: OwnerType): boolean => {
  return (PERMISSIONS.CAN_EDIT_NOTICE as readonly string[]).includes(role);
};

/**
 * 멤버 관리 권한 확인
 */
export const canManageMembers = (role: OwnerType): boolean => {
  return (PERMISSIONS.CAN_MANAGE_MEMBERS as readonly string[]).includes(role);
};

/**
 * 채팅방 삭제 권한 확인
 */
export const canDeleteRoom = (role: OwnerType): boolean => {
  return (PERMISSIONS.CAN_DELETE_ROOM as readonly string[]).includes(role);
};

/**
 * 역할 변경 권한 확인
 */
export const canChangeRoles = (role: OwnerType): boolean => {
  return (PERMISSIONS.CAN_CHANGE_ROLES as readonly string[]).includes(role);
};

/**
 * 역할 우선순위 비교 (높을수록 강함)
 */
export const getRolePriority = (role: OwnerType): number => {
  const priorities: Record<OwnerType, number> = {
    OWNER: 3,
    VICE_OWNER: 2,
    MEMBER: 1,
  };
  return priorities[role] || 0;
};

/**
 * 역할 A가 역할 B보다 높은지 확인
 */
export const isRoleHigher = (
  roleA: OwnerType,
  roleB: OwnerType
): boolean => {
  return getRolePriority(roleA) > getRolePriority(roleB);
};
