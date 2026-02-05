import { Module } from '@nestjs/common';
import { AppVersionsService } from './app-versions.service';
import { AppVersionsController } from './app-versions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  providers: [AppVersionsService],
  controllers: [AppVersionsController],
  exports: [AppVersionsService],
})
export class AppVersionsModule {}
