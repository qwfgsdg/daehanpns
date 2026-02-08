import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MemberTypeService } from './member-type.service';
import { ManagerService } from './manager.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { LogsModule } from '../modules/logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  providers: [UsersService, MemberTypeService, ManagerService],
  controllers: [UsersController],
  exports: [UsersService, ManagerService],
})
export class UsersModule {}
