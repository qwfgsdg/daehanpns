/**
 * 사용자 타입 정의
 */

export type MemberType = 'STOCK' | 'COIN' | 'HYBRID';

export type Provider = 'LOCAL' | 'GOOGLE' | 'KAKAO';

export interface User {
  id: string;
  phone: string;
  name: string;
  nickname?: string;
  gender?: 'MALE' | 'FEMALE';
  birthDate?: string;
  provider: Provider;
  profileImage?: string;
  memberType?: MemberType;
  managerId?: string;
  affiliateCode?: string;
  isBanned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Manager {
  id: string;
  name: string;
  region?: string;
  referralCode?: string;
  tier: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  daysLeft?: number;
  createdAt: string;
  updatedAt: string;
}
