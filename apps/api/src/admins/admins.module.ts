import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, LogsModule, RedisModule],
  providers: [AdminsService],
  controllers: [AdminsController, DashboardController],
  exports: [AdminsService],
})
export class AdminsModule {}
