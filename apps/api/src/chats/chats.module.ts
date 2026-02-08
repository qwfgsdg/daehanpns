import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { ChatParticipantsService } from './chat-participants.service';
import { ChatMessagesService } from './chat-messages.service';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { LogsModule } from '../modules/logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  controllers: [ChatsController],
  providers: [
    ChatsService,
    ChatParticipantsService,
    ChatMessagesService,
  ],
  exports: [
    ChatsService,
    ChatParticipantsService,
    ChatMessagesService,
  ],
})
export class ChatsModule {}
