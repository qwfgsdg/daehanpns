import { Module } from '@nestjs/common';
import { UserProfileController } from './user-profile.controller';
import { PrismaModule } from '../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserProfileController],
})
export class UserProfileModule {}
