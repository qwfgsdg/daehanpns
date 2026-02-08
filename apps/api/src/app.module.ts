import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { FilesModule } from './modules/files/files.module';
import { LogsModule } from './modules/logs/logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminsModule } from './admins/admins.module';
import { ExpertsModule } from './experts/experts.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ChatsModule } from './chats/chats.module';
import { BannersModule } from './modules/banners/banners.module';
import { PopupsModule } from './modules/popups/popups.module';
import { AppVersionsModule } from './modules/app-versions/app-versions.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1분
        limit: 100, // 요청 제한
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    FilesModule,
    LogsModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    AdminsModule,
    ExpertsModule,
    SubscriptionsModule,
    ChatsModule,
    BannersModule,
    PopupsModule,
    AppVersionsModule,
    StatsModule,
  ],
})
export class AppModule {}
