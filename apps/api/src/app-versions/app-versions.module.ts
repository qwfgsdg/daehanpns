import { Module } from '@nestjs/common';
import { AppVersionsService } from './app-versions.service';
import { AppVersionsController } from './app-versions.controller';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { LogsModule } from '../modules/logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  providers: [AppVersionsService],
  controllers: [AppVersionsController],
  exports: [AppVersionsService],
})
export class AppVersionsModule {}
