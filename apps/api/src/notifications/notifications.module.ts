import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { RedisModule } from '../modules/redis/redis.module';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
