import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { LogsModule } from '../modules/logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  providers: [SupportService],
  controllers: [SupportController],
  exports: [SupportService],
})
export class SupportModule {}
