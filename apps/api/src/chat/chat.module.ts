import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { LogsModule } from '../modules/logs/logs.module';
import { RedisModule } from '../modules/redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    LogsModule,
    RedisModule,
    NotificationsModule,
    AuthModule,
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
