import { IsString, IsInt, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { Platform } from '@prisma/client';

export class CreateAppVersionDto {
  @IsEnum(Platform)
  platform: Platform;

  @IsString()
  version: string;

  @IsInt()
  buildNumber: number;

  @IsOptional()
  @IsBoolean()
  isForceUpdate?: boolean;

  @IsOptional()
  @IsString()
  updateMessage?: string;

  @IsOptional()
  @IsString()
  downloadUrl?: string;
}
