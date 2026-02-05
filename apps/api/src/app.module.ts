import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { FilesModule } from './modules/files/files.module';
import { LogsModule } from './modules/logs/logs.module';
import { AuthModule } from './modules/auth/auth.module';

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
    PrismaModule,
    RedisModule,
    FilesModule,
    LogsModule,
    AuthModule,
  ],
})
export class AppModule {}
