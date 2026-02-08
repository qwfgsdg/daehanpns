import { Module } from '@nestjs/common';
import { PopupsService } from './popups.service';
import { PopupsController } from './popups.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PopupsController],
  providers: [PopupsService],
  exports: [PopupsService],
})
export class PopupsModule {}
