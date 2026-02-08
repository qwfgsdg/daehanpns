import { IsDateString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum StatsScope {
  ALL = 'all',
  ROOM = 'room',
  CATEGORY = 'category',
}

export class ChatStatsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(StatsScope)
  scope?: StatsScope = StatsScope.ALL;

  @IsOptional()
  roomId?: string;

  @IsOptional()
  @IsEnum(['STOCK', 'COIN'])
  category?: 'STOCK' | 'COIN';
}

export class UserStatsQueryDto extends ChatStatsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  search?: string;
}

export class TopUsersQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
