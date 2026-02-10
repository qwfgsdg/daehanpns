import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  // Railway 배포 디버깅
  console.log('=== Environment Variables Check ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL starts with postgres:', process.env.DATABASE_URL?.startsWith('postgres'));
  console.log('DATABASE_URL first 30 chars:', process.env.DATABASE_URL?.substring(0, 30));
  console.log('PORT:', process.env.PORT);
  console.log('REDIS_HOST:', process.env.REDIS_HOST);
  console.log('CORS_ORIGINS:', process.env.CORS_ORIGINS);
  console.log('===================================');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // TODO: 일회성 마이그레이션 - 서버 안정화 후 실행
  // 삭제된 사용자의 unique 컬럼 정리
  // (임시로 주석 처리 - Railway 배포 시 크래시 방지)

  // Cookie Parser
  app.use(cookieParser());

  // CORS 설정
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  console.log('🌍 CORS Origins:', corsOrigins.split(','));
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
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://0.0.0.0:${port}/api`);
}

bootstrap();
