/**
 * 역할 관련 상수 (백엔드 OwnerType 일치)
 */

import { OwnerType } from '@/types';

// 역할 설정
export const ROLE_CONFIG: Record<
  OwnerType,
  {
    emoji: string;
    label: string;
    color: string;
  }
> = {
  OWNER: {
    emoji: '👑',
    label: '방장',
    color: '#FFD700',
  },
  VICE_OWNER: {
    emoji: '🔑',
    label: '부방장',
    color: '#4A90E2',
  },
  MEMBER: {
    emoji: '💬',
    label: '',
    color: '#666666',
  },
};

// 권한 체크용
export const ADMIN_ROLES: OwnerType[] = ['OWNER', 'VICE_OWNER'];

// 역할별 권한
export const PERMISSIONS = {
  CAN_EDIT_NOTICE: ['OWNER', 'VICE_OWNER'],
  CAN_MANAGE_MEMBERS: ['OWNER', 'VICE_OWNER'],
  CAN_DELETE_ROOM: ['OWNER'],
  CAN_CHANGE_ROLES: ['OWNER'],
} as const;
