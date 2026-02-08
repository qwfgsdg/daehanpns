export interface StatsSummaryDto {
  totalMessages: number;
  activeUsers: number;
  activeAdmins: number;
  weeklyChange: number; // percentage
}

export interface UserStatDto {
  userId: string;
  nickname: string;
  name: string;
  profileImage?: string | null;
  messageCount: number;
  roomCount: number;
  weeklyChange: number;
}

export interface AdminStatDto {
  adminId: string;
  realName: string;
  salesName: string;
  messageCount: number;
  roomCount: number;
  weeklyChange: number;
}

export interface RoomStatDto {
  roomId: string;
  roomName: string;
  roomType: string;
  category: string;
  messageCount: number;
  participantCount: number;
  weeklyChange: number;
}

export interface DailyTrendDto {
  date: string;
  messageCount: number;
}

export interface UserStatsListDto {
  users: UserStatDto[];
  total: number;
  page: number;
  limit: number;
}

export interface RoomStatsListDto {
  rooms: RoomStatDto[];
  total: number;
  page: number;
  limit: number;
}
