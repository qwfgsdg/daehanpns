import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // 일회성 마이그레이션: 삭제된 사용자의 unique 컬럼 정리
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const deletedUsers = await prisma.user.findMany({
      where: {
        deletedAt: { not: null },
        email: { not: null }, // 이메일이 아직 정리되지 않은 삭제 사용자
      },
    });

    if (deletedUsers.length > 0) {
      console.log(`🔧 Cleaning up ${deletedUsers.length} deleted users...`);

      for (const user of deletedUsers) {
        const timestamp = Date.now();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: null,
            phone: `deleted_${user.id}_${timestamp}`,
            nickname: null,
            providerId: null,
          },
        });
      }

      console.log(`✅ Cleaned up ${deletedUsers.length} deleted users`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Failed to clean up deleted users:', error);
  }

  // Cookie Parser
  app.use(cookieParser());

  // CORS 설정
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(','),
    credentials: true,
  });

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Prefix
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
