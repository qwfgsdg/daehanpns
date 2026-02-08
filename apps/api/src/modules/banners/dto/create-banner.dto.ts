import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { BannerPos } from '@prisma/client';

export class CreateBannerDto {
  @IsEnum(BannerPos)
  position: BannerPos;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
