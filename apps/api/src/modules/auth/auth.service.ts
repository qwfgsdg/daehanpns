import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LogsService } from '../logs/logs.service';
import { AuthProvider } from '@daehanpns/shared';
import { RATE_LIMITS } from '@daehanpns/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private logsService: LogsService,
    private configService: ConfigService,
  ) {}

  // ===== 관리자 로그인 =====
  async adminLogin(loginId: string, password: string, ipAddress?: string, userAgent?: string) {
    const lockKey = `admin_login_lock:${loginId}`;
    const attemptsKey = `admin_login_attempts:${loginId}`;

    // 로그인 잠금 확인
    const isLocked = await this.redis.exists(lockKey);
    if (isLocked) {
      const ttl = await this.redis.ttl(lockKey);
      throw new UnauthorizedException(`로그인이 ${Math.ceil(ttl / 60)}분 동안 잠겼습니다.`);
    }

    // 관리자 조회
    const admin = await this.prisma.admin.findUnique({
      where: { loginId },
      include: { permissions: true },
    });

    if (!admin || !admin.isActive) {
      await this.incrementLoginAttempts(loginId, attemptsKey, lockKey);
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      await this.incrementLoginAttempts(loginId, attemptsKey, lockKey);
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // 로그인 성공 - 시도 횟수 초기화
    await this.redis.del(attemptsKey);

    // 마지막 로그인 시간 업데이트
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // 로그 기록
    await this.logsService.createAdminLog({
      adminId: admin.id,
      action: 'LOGIN',
      ipAddress,
      userAgent,
    });

    // JWT 생성
    const payload = {
      sub: admin.id,
      loginId: admin.loginId,
      tier: admin.tier,
      permissions: admin.permissions.map((p) => p.permission),
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      admin: {
        id: admin.id,
        loginId: admin.loginId,
        name: admin.name,
        tier: admin.tier,
        permissions: admin.permissions.map((p) => p.permission),
      },
    };
  }

  private async incrementLoginAttempts(loginId: string, attemptsKey: string, lockKey: string) {
    const attempts = await this.redis.incr(attemptsKey);
    await this.redis.expire(attemptsKey, 1800); // 30분

    if (attempts >= RATE_LIMITS.ADMIN_LOGIN_ATTEMPTS) {
      await this.redis.set(lockKey, '1', RATE_LIMITS.ADMIN_LOGIN_LOCK_MINUTES * 60);
      throw new UnauthorizedException(
        `로그인 시도 횟수를 초과했습니다. ${RATE_LIMITS.ADMIN_LOGIN_LOCK_MINUTES}분 후에 다시 시도해주세요.`,
      );
    }
  }

  // ===== 회원 회원가입 (전화번호 + 비밀번호) =====
  async userRegister(data: {
    phone: string;
    password: string;
    name: string;
    nickname?: string;
    gender?: string;
    birthDate?: Date;
    affiliateCode: string;
  }) {
    // 전화번호 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser) {
      throw new ConflictException('이미 가입된 전화번호입니다.');
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 회원 생성
    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        provider: AuthProvider.LOCAL,
      },
    });

    // JWT 생성
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      provider: user.provider,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ===== 회원 로그인 (전화번호 + 비밀번호) =====
  async userLogin(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('전화번호 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!user.password) {
      throw new UnauthorizedException('소셜 로그인으로 가입된 계정입니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('전화번호 또는 비밀번호가 올바르지 않습니다.');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      provider: user.provider,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ===== SMS 인증번호 발송 (Aligo) =====
  async sendSmsVerification(phone: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 코드
    const cacheKey = `sms_verification:${phone}`;

    // SMS 발송 제한 확인
    const dailyKey = `sms_daily:${phone}:${new Date().toISOString().split('T')[0]}`;
    const dailyCount = await this.redis.incr(dailyKey);
    await this.redis.expire(dailyKey, 86400); // 24시간

    if (dailyCount > RATE_LIMITS.SMS_PER_DAY) {
      throw new BadRequestException('하루 SMS 발송 제한을 초과했습니다.');
    }

    // Aligo SMS 발송
    try {
      const aligoApiId = this.configService.get<string>('ALIGO_API_ID');
      const aligoApiKey = this.configService.get<string>('ALIGO_API_KEY');
      const aligoSender = this.configService.get<string>('ALIGO_SENDER');

      const response = await axios.post(
        'https://apis.aligo.in/send/',
        new URLSearchParams({
          key: aligoApiKey,
          user_id: aligoApiId,
          sender: aligoSender,
          receiver: phone,
          msg: `[${aligoSender}] 인증번호: ${code}`,
          testmode_yn: process.env.NODE_ENV === 'development' ? 'Y' : 'N',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      if (response.data.result_code !== '1') {
        throw new Error('SMS 발송 실패');
      }

      // Redis에 인증번호 저장 (5분)
      await this.redis.set(cacheKey, code, 300);

      return { success: true, message: 'SMS 인증번호가 발송되었습니다.' };
    } catch (error) {
      console.error('SMS 발송 실패:', error);
      throw new BadRequestException('SMS 발송에 실패했습니다.');
    }
  }

  // ===== SMS 인증번호 확인 =====
  async verifySmsCode(phone: string, code: string) {
    const cacheKey = `sms_verification:${phone}`;
    const storedCode = await this.redis.get(cacheKey);

    if (!storedCode || storedCode !== code) {
      throw new UnauthorizedException('인증번호가 올바르지 않습니다.');
    }

    // 인증 성공 - 코드 삭제
    await this.redis.del(cacheKey);

    return { success: true, message: '인증이 완료되었습니다.' };
  }

  // ===== 구글 OAuth =====
  async googleLogin(googleUser: any) {
    let user = await this.prisma.user.findFirst({
      where: {
        provider: AuthProvider.GOOGLE,
        providerId: googleUser.id,
      },
    });

    if (!user) {
      // 신규 회원 - 추가 정보 입력 필요
      return {
        isNewUser: true,
        googleUser: {
          providerId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          profileImage: googleUser.picture,
        },
      };
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      provider: user.provider,
    });

    return {
      isNewUser: false,
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ===== 카카오 OAuth =====
  async kakaoLogin(kakaoUser: any) {
    let user = await this.prisma.user.findFirst({
      where: {
        provider: AuthProvider.KAKAO,
        providerId: kakaoUser.id,
      },
    });

    if (!user) {
      // 신규 회원 - 추가 정보 입력 필요
      return {
        isNewUser: true,
        kakaoUser: {
          providerId: kakaoUser.id,
          email: kakaoUser.kakao_account?.email,
          name: kakaoUser.kakao_account?.profile?.nickname,
          profileImage: kakaoUser.kakao_account?.profile?.profile_image_url,
        },
      };
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      provider: user.provider,
    });

    return {
      isNewUser: false,
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ===== 소셜 회원가입 완료 =====
  async completeSocialRegister(data: {
    provider: AuthProvider;
    providerId: string;
    phone: string;
    name: string;
    nickname?: string;
    gender?: string;
    birthDate?: Date;
    affiliateCode: string;
    email?: string;
    profileImage?: string;
  }) {
    // 전화번호 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser) {
      throw new ConflictException('이미 가입된 전화번호입니다.');
    }

    // 회원 생성
    const user = await this.prisma.user.create({
      data,
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      provider: user.provider,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }
}
