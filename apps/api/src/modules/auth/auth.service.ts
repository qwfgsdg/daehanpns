import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LogsService } from '../logs/logs.service';
import { ManagerService } from '../../users/manager.service';
import { AuthProvider } from '@prisma/client';

// Rate limits constants
const RATE_LIMITS = {
  ADMIN_LOGIN_ATTEMPTS: 5,
  ADMIN_LOGIN_LOCK_MINUTES: 30,
  SMS_PER_DAY: 10,
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private logsService: LogsService,
    private configService: ConfigService,
    private managerService: ManagerService,
  ) {}

  // ===== 관리자 로그인 =====
  async adminLogin(loginId: string, password: string, ipAddress?: string, userAgent?: string) {
    const lockKey = `admin_login_lock:${loginId}`;
    const attemptsKey = `admin_login_attempts:${loginId}`;

    // 로그인 잠금 확인 (Redis 에러 무시)
    try {
      const isLocked = await this.redis.exists(lockKey);
      if (isLocked) {
        const ttl = await this.redis.ttl(lockKey);
        throw new UnauthorizedException(`로그인이 ${Math.ceil(ttl / 60)}분 동안 잠겼습니다.`);
      }
    } catch (error) {
      // Redis 연결 실패 시 로그만 남기고 계속 진행
      console.warn('Redis lock check failed:', error.message);
    }

    // 관리자 조회
    const admin = await this.prisma.admin.findUnique({
      where: { loginId },
      include: { permissions: true },
    });

    if (!admin || !admin.isActive) {
      await this.incrementLoginAttempts(loginId, attemptsKey, lockKey);

      // 로그인 실패 기록 (비동기)
      this.logsService.createAdminLog({
        adminId: admin?.id,  // 계정이 있으면 ID 기록, 없으면 null
        action: 'LOGIN_FAILED',
        description: admin ? '비활성화된 계정' : '존재하지 않는 계정',
        ipAddress,
        userAgent,
        status: 'FAILED',
      }).catch(err => console.error('Failed to create failed login log:', err));

      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      await this.incrementLoginAttempts(loginId, attemptsKey, lockKey);

      // 로그인 실패 기록 (비동기)
      this.logsService.createAdminLog({
        adminId: admin.id,
        action: 'LOGIN_FAILED',
        description: '비밀번호 불일치',
        ipAddress,
        userAgent,
        status: 'FAILED',
      }).catch(err => console.error('Failed to create failed login log:', err));

      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // 로그인 성공 - 시도 횟수 초기화 (Redis 에러 무시)
    try {
      await this.redis.del(attemptsKey);
    } catch (error) {
      console.warn('Redis delete failed:', error.message);
    }

    // JWT 생성 (먼저 처리)
    const payload = {
      sub: admin.id,
      type: 'admin',
      loginId: admin.loginId,
      tier: admin.tier,
      permissions: admin.permissions.map((p) => p.permission),
    };

    const accessToken = this.jwtService.sign(payload);

    const adminResponse = {
      id: admin.id,
      loginId: admin.loginId,
      realName: admin.realName,
      salesName: admin.salesName,
      tier: admin.tier,
      permissions: admin.permissions.map((p) => p.permission),
    };

    // 마지막 로그인 시간 업데이트 & 로그 기록 & 캐시 생성 (비동기, 응답 후 처리)
    Promise.all([
      this.prisma.admin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      }).catch(err => console.error('Failed to update lastLoginAt:', err)),
      this.logsService.createAdminLog({
        adminId: admin.id,
        action: 'LOGIN_SUCCESS',
        description: '로그인 성공',
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      }).catch(err => console.error('Failed to create login log:', err)),
      // 로그인 직후 대시보드 로딩을 위해 admin profile 캐싱
      this.redis.set(
        `admin_profile:${admin.id}`,
        JSON.stringify({ ...admin, permissions: admin.permissions.map((p) => p.permission) }),
        300
      ).catch(err => console.warn('Failed to cache admin profile:', err)),
    ]);

    return {
      accessToken,
      admin: adminResponse,
    };
  }

  async getAdminProfile(adminId: string) {
    // Redis 캐시 확인 (5분)
    const cacheKey = `admin_profile:${adminId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis get failed:', error.message);
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        permissions: {
          select: {
            permission: true,
          },
        },
      },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    const result = {
      ...admin,
      permissions: admin.permissions.map((p) => p.permission),
    };

    // Redis에 캐싱 (5분, 비동기)
    this.redis.set(cacheKey, JSON.stringify(result), 300).catch(err =>
      console.warn('Redis set failed:', err.message)
    );

    return result;
  }

  private async incrementLoginAttempts(loginId: string, attemptsKey: string, lockKey: string) {
    try {
      const attempts = await this.redis.incr(attemptsKey);
      await this.redis.expire(attemptsKey, 1800); // 30분

      if (attempts >= RATE_LIMITS.ADMIN_LOGIN_ATTEMPTS) {
        await this.redis.set(lockKey, '1', RATE_LIMITS.ADMIN_LOGIN_LOCK_MINUTES * 60);
        throw new UnauthorizedException(
          `로그인 시도 횟수를 초과했습니다. ${RATE_LIMITS.ADMIN_LOGIN_LOCK_MINUTES}분 후에 다시 시도해주세요.`,
        );
      }
    } catch (error) {
      // Redis 연결 실패 시 로그만 남기고 계속 진행 (로그인 실패 카운트 기능 비활성화)
      console.warn('Redis increment failed:', error.message);
    }
  }

  // ===== 회원 회원가입 (loginId + 비밀번호) =====
  async userRegister(data: {
    loginId: string;
    phone?: string;
    password: string;
    name: string;
    nickname?: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    referralCode?: string;
    managerId?: string;
  }) {
    // loginId 필수 검증
    if (!data.loginId || data.loginId.length < 4) {
      throw new BadRequestException('아이디는 4자 이상이어야 합니다.');
    }

    // 비밀번호 검증
    if (!data.password || data.password.length < 8) {
      throw new BadRequestException('비밀번호는 8자 이상이어야 합니다.');
    }

    // loginId 중복 확인
    const existingByLoginId = await this.prisma.user.findFirst({
      where: { loginId: data.loginId, deletedAt: null },
    });
    if (existingByLoginId) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    // 전화번호 중복 확인 (제공 시에만)
    if (data.phone) {
      const existingByPhone = await this.prisma.user.findFirst({
        where: { phone: data.phone, deletedAt: null },
      });
      if (existingByPhone) {
        throw new ConflictException('이미 가입된 전화번호입니다.');
      }
    }

    // 담당자 배정 로직
    let assignedManagerId: string | undefined;
    let affiliateCode: string | undefined;
    let referralSource: 'CODE' | 'SEARCH' | 'INVITE_LINK' | undefined;

    if (data.referralCode) {
      try {
        const manager = await this.managerService.findByReferralCode(data.referralCode);
        assignedManagerId = manager.id;
        affiliateCode = data.referralCode;
        referralSource = 'CODE';
      } catch (error) {
        throw new BadRequestException('유효하지 않은 추천 코드입니다.');
      }
    } else if (data.managerId) {
      const manager = await this.prisma.admin.findUnique({
        where: { id: data.managerId, isActive: true, deletedAt: null },
      });
      if (!manager) {
        throw new BadRequestException('유효하지 않은 담당자입니다.');
      }
      assignedManagerId = manager.id;
      affiliateCode = manager.referralCode || manager.id;
      referralSource = 'SEARCH';
    } else {
      throw new BadRequestException('담당자를 선택해주세요.');
    }

    const password = data.password || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    // 닉네임 빈 문자열→undefined 정규화
    const normalizedNickname = data.nickname?.trim() || undefined;

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          loginId: data.loginId,
          phone: data.phone || undefined,
          password: hashedPassword,
          name: data.name,
          nickname: normalizedNickname,
          gender: data.gender,
          birthDate: (() => {
            if (!data.birthDate) return undefined;
            const dateStr = String(data.birthDate).trim();
            if (dateStr === '') return undefined;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? undefined : date;
          })(),
          affiliateCode: affiliateCode!,
          managerId: assignedManagerId,
          referralSource,
          provider: AuthProvider.LOCAL,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'unknown';
        if (field === 'nickname') throw new ConflictException('이미 사용 중인 닉네임입니다.');
        if (field === 'phone') throw new ConflictException('이미 가입된 전화번호입니다.');
        throw new ConflictException('이미 등록된 정보입니다.');
      }
      throw error;
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      loginId: user.loginId,
      provider: user.provider,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        loginId: user.loginId,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
        managerId: user.managerId,
        affiliateCode: user.affiliateCode,
      },
    };
  }

  // ===== 회원 로그인 (loginId + 비밀번호) =====
  async userLogin(loginId: string, password: string) {
    // loginId로 조회 (하위호환: loginId로 못 찾으면 phone으로 재시도)
    let user = await this.prisma.user.findFirst({
      where: { loginId, deletedAt: null },
    });

    if (!user) {
      // 기존 유저 하위호환: phone으로도 시도
      user = await this.prisma.user.findFirst({
        where: { phone: loginId, deletedAt: null },
      });
    }

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // BOT 계정 로그인 차단
    if (user.provider === 'BOT') {
      throw new UnauthorizedException('로그인할 수 없는 계정입니다.');
    }

    if (!user.password) {
      throw new UnauthorizedException('소셜 로그인으로 가입된 계정입니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // loginId가 전화번호 패턴이면 아이디 설정 필요
    const phonePattern = /^01[016789]\d{7,8}$/;
    const needsLoginIdSetup = !user.loginId || phonePattern.test(user.loginId);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      loginId: user.loginId,
      provider: user.provider,
    });

    return {
      accessToken,
      needsLoginIdSetup,
      user: {
        id: user.id,
        loginId: user.loginId,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ===== SOLAPI 인증 헤더 생성 =====
  private getSolapiAuthHeader(): string {
    const apiKey = this.configService.get<string>('SOLAPI_API_KEY');
    const apiSecret = this.configService.get<string>('SOLAPI_API_SECRET');
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    const signature = crypto.createHmac('sha256', apiSecret || '')
      .update(date + salt)
      .digest('hex');
    return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
  }

  // ===== SMS 인증번호 발송 (SOLAPI) =====
  async sendSmsVerification(phone: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 코드
    const cacheKey = `sms_verification:${phone}`;

    // SMS 발송 제한 확인 (Redis 에러 무시)
    try {
      const dailyKey = `sms_daily:${phone}:${new Date().toISOString().split('T')[0]}`;
      const dailyCount = await this.redis.incr(dailyKey);
      await this.redis.expire(dailyKey, 86400); // 24시간

      if (dailyCount > RATE_LIMITS.SMS_PER_DAY) {
        throw new BadRequestException('하루 SMS 발송 제한을 초과했습니다.');
      }
    } catch (error) {
      // Redis 연결 실패 시 로그만 남기고 계속 진행
      console.warn('Redis rate limit check failed:', error.message);
    }

    // SOLAPI SMS 발송
    try {
      const solapiApiKey = this.configService.get<string>('SOLAPI_API_KEY');
      const solapiApiSecret = this.configService.get<string>('SOLAPI_API_SECRET');
      const solapiSender = this.configService.get<string>('SOLAPI_SENDER');

      // 개발 환경에서는 실제 SMS 발송 건너뛰기
      if (process.env.NODE_ENV !== 'production' && (!solapiApiKey || !solapiApiSecret || solapiApiKey.trim() === '' || solapiApiSecret.trim() === '')) {
        console.log('🔔 [개발 모드] SMS 인증번호:', code);

        // Redis에 인증번호 저장 시도 (5분)
        try {
          await this.redis.set(cacheKey, code, 300);
        } catch (error) {
          console.warn('Redis save failed, continuing without cache:', error.message);
        }

        return { success: true, message: 'SMS 인증번호가 발송되었습니다. (개발 모드: 콘솔 확인)' };
      }

      const response = await axios.post(
        'https://api.solapi.com/messages/v4/send',
        {
          message: {
            to: phone,
            from: solapiSender || '',
            text: `[대한피앤에스] 인증번호: ${code}`,
            type: 'SMS',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.getSolapiAuthHeader(),
          },
        },
      );

      if (response.data.statusCode && response.data.statusCode !== '2000') {
        console.error('SOLAPI 발송 실패:', response.data);
        throw new Error('SMS 발송 실패');
      }

      // Redis에 인증번호 저장 (5분)
      try {
        await this.redis.set(cacheKey, code, 300);
      } catch (error) {
        console.warn('Redis save failed, continuing without cache:', error.message);
      }

      return { success: true, message: 'SMS 인증번호가 발송되었습니다.' };
    } catch (error) {
      console.error('SMS 발송 실패:', error.response?.data || error.message);
      throw new BadRequestException('SMS 발송에 실패했습니다.');
    }
  }

  // ===== SMS 인증번호 확인 =====
  async verifySmsCode(phone: string, code: string) {
    const cacheKey = `sms_verification:${phone}`;

    // 개발 모드에서는 Redis 없이 임의의 6자리 숫자 허용
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔔 [개발 모드] 인증번호 확인:', code);
      if (code.length === 6 && /^\d{6}$/.test(code)) {
        return { success: true, message: '인증이 완료되었습니다. (개발 모드)' };
      }
      throw new UnauthorizedException('인증번호는 6자리 숫자여야 합니다.');
    }

    try {
      const storedCode = await this.redis.get(cacheKey);

      if (!storedCode || storedCode !== code) {
        throw new UnauthorizedException('인증번호가 올바르지 않습니다.');
      }

      // 인증 성공 - 코드 삭제
      await this.redis.del(cacheKey);

      return { success: true, message: '인증이 완료되었습니다.' };
    } catch (error) {
      console.error('SMS verification error:', error);
      throw new UnauthorizedException('인증번호가 올바르지 않습니다.');
    }
  }

  // ===== loginId 중복 확인 =====
  async checkLoginId(loginId: string) {
    if (!loginId || loginId.length < 4) {
      return { available: false, message: '아이디는 4자 이상이어야 합니다.' };
    }

    const existing = await this.prisma.user.findFirst({
      where: { loginId, deletedAt: null },
    });

    if (existing) {
      return { available: false, message: '이미 사용 중인 아이디입니다.' };
    }

    return { available: true, message: '사용 가능한 아이디입니다.' };
  }

  // ===== 기존 유저 loginId 변경 =====
  async updateLoginId(userId: string, data: { loginId: string; password?: string }) {
    if (!data.loginId || data.loginId.length < 4) {
      throw new BadRequestException('아이디는 4자 이상이어야 합니다.');
    }

    // 중복 체크
    const existing = await this.prisma.user.findFirst({
      where: { loginId: data.loginId, deletedAt: null, id: { not: userId } },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    const updateData: any = { loginId: data.loginId };

    // 기존 소셜 유저(password=null)가 비밀번호도 함께 설정
    if (data.password) {
      if (data.password.length < 8) {
        throw new BadRequestException('비밀번호는 8자 이상이어야 합니다.');
      }
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 새 JWT 발급 (loginId 반영)
    const accessToken = this.jwtService.sign({
      sub: user.id,
      loginId: user.loginId,
      provider: user.provider,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        loginId: user.loginId,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ===== 구글 OAuth =====
  async googleLogin(googleUser: any) {
    let user = await this.prisma.user.findFirst({
      where: {
        provider: AuthProvider.GOOGLE,
        providerId: String(googleUser.id),
        deletedAt: null,
      },
    });

    if (!user) {
      return {
        isNewUser: true,
        googleUser: {
          providerId: String(googleUser.id),
          email: googleUser.email,
          name: googleUser.name,
          profileImage: googleUser.picture,
        },
      };
    }

    // BOT 체크
    if (user.provider === 'BOT') {
      throw new UnauthorizedException('로그인할 수 없는 계정입니다.');
    }

    const phonePattern = /^01[016789]\d{7,8}$/;
    const needsLoginIdSetup = !user.loginId || phonePattern.test(user.loginId);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      loginId: user.loginId,
      provider: user.provider,
    });

    return {
      isNewUser: false,
      needsLoginIdSetup,
      accessToken,
      user: {
        id: user.id,
        loginId: user.loginId,
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
        providerId: String(kakaoUser.id),
        deletedAt: null,
      },
    });

    if (!user) {
      return {
        isNewUser: true,
        kakaoUser: {
          providerId: String(kakaoUser.id),
          email: kakaoUser.kakao_account?.email,
          name: kakaoUser.kakao_account?.profile?.nickname,
          profileImage: kakaoUser.kakao_account?.profile?.profile_image_url,
        },
      };
    }

    // BOT 체크
    if (user.provider === 'BOT') {
      throw new UnauthorizedException('로그인할 수 없는 계정입니다.');
    }

    const phonePattern = /^01[016789]\d{7,8}$/;
    const needsLoginIdSetup = !user.loginId || phonePattern.test(user.loginId);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      loginId: user.loginId,
      provider: user.provider,
    });

    return {
      isNewUser: false,
      needsLoginIdSetup,
      accessToken,
      user: {
        id: user.id,
        loginId: user.loginId,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ===== 소셜 회원가입 완료 (loginId + password 필수, phone 선택, SMS 제거) =====
  async completeSocialRegister(data: {
    provider: AuthProvider;
    providerId: string;
    loginId: string;
    password: string;
    phone?: string;
    name: string;
    nickname?: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    email?: string;
    profileImage?: string;
    referralCode?: string;
    managerId?: string;
  }) {
    // loginId 필수 검증
    if (!data.loginId || data.loginId.length < 4) {
      throw new BadRequestException('아이디는 4자 이상이어야 합니다.');
    }
    if (!data.password || data.password.length < 8) {
      throw new BadRequestException('비밀번호는 8자 이상이어야 합니다.');
    }

    // loginId 중복 확인
    const existingByLoginId = await this.prisma.user.findFirst({
      where: { loginId: data.loginId, deletedAt: null },
    });
    if (existingByLoginId) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    // 전화번호 중복 확인 (제공 시에만)
    if (data.phone) {
      const existingByPhone = await this.prisma.user.findFirst({
        where: { phone: data.phone, deletedAt: null },
      });
      if (existingByPhone) {
        throw new ConflictException('이미 가입된 전화번호입니다.');
      }
    }

    // 이메일 중복 확인
    if (data.email) {
      const existingByEmail = await this.prisma.user.findFirst({
        where: { email: data.email, deletedAt: null },
      });
      if (existingByEmail) {
        throw new ConflictException('이미 가입된 이메일입니다. 로그인 페이지에서 로그인해주세요.');
      }
    }

    // 담당자 배정
    let assignedManagerId: string | undefined;
    let affiliateCode: string | undefined;
    let referralSource: 'CODE' | 'SEARCH' | 'INVITE_LINK' | undefined;

    if (data.referralCode) {
      try {
        const manager = await this.managerService.findByReferralCode(data.referralCode);
        assignedManagerId = manager.id;
        affiliateCode = data.referralCode;
        referralSource = 'CODE';
      } catch (error) {
        throw new BadRequestException('유효하지 않은 추천 코드입니다.');
      }
    } else if (data.managerId) {
      const manager = await this.prisma.admin.findUnique({
        where: { id: data.managerId, isActive: true, deletedAt: null },
      });
      if (!manager) {
        throw new BadRequestException('유효하지 않은 담당자입니다.');
      }
      assignedManagerId = manager.id;
      affiliateCode = manager.referralCode || manager.id;
      referralSource = 'SEARCH';
    } else {
      throw new BadRequestException('담당자를 선택해주세요.');
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 닉네임 빈 문자열→undefined 정규화
    const normalizedNickname = data.nickname?.trim() || undefined;

    // 회원 생성
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          provider: data.provider,
          providerId: data.providerId,
          loginId: data.loginId,
          password: hashedPassword,
          phone: data.phone || undefined,
          name: data.name,
          nickname: normalizedNickname,
          gender: data.gender,
          birthDate: (() => {
            if (!data.birthDate) return undefined;
            const dateStr = String(data.birthDate).trim();
            if (dateStr === '') return undefined;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? undefined : date;
          })(),
          affiliateCode: affiliateCode!,
          email: data.email,
          profileImage: data.profileImage,
          managerId: assignedManagerId,
          referralSource,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'unknown';
        if (field === 'nickname') throw new ConflictException('이미 사용 중인 닉네임입니다.');
        if (field === 'phone') throw new ConflictException('이미 가입된 전화번호입니다.');
        throw new ConflictException('이미 등록된 정보입니다.');
      }
      throw error;
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      loginId: user.loginId,
      provider: user.provider,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        loginId: user.loginId,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
        managerId: user.managerId,
        affiliateCode: user.affiliateCode,
      },
    };
  }

  // ===== 추천 코드 검증 =====
  async validateReferralCode(code: string) {
    try {
      const manager = await this.managerService.findByReferralCode(code);
      return {
        valid: true,
        manager: {
          id: manager.id,
          name: manager.name,
          affiliationCode: manager.affiliationCode,
        },
      };
    } catch (error) {
      return {
        valid: false,
        message: '유효하지 않은 추천 코드입니다',
      };
    }
  }

  // ===== 전화번호/이메일 중복 체크 =====
  async checkDuplicate(phone?: string, email?: string) {
    if (!phone && !email) {
      throw new BadRequestException('전화번호 또는 이메일을 입력해주세요.');
    }

    const where: any = {};
    if (phone) {
      where.phone = phone;
    }
    if (email) {
      where.email = email;
    }

    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        phone: true,
        email: true,
        provider: true,
      },
    });

    if (user) {
      return {
        exists: true,
        message: phone
          ? '이미 가입된 전화번호입니다.'
          : '이미 가입된 이메일입니다.',
        provider: user.provider,
      };
    }

    return {
      exists: false,
      message: '사용 가능합니다.',
    };
  }

  // ===== 구글 모바일 로그인 (id_token 또는 authorization code 방식) =====
  async googleMobileLogin(data: { idToken?: string; code?: string; redirectUri?: string }) {
    try {
      let googleProfile: { id: string; email: string; name: string; picture: string };

      if (data.idToken) {
        // 기존 방식: id_token 직접 검증
        const res = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${data.idToken}`,
        );
        const { sub: id, email, name, picture, aud } = res.data;

        const googleClientId = this.configService.get('GOOGLE_CLIENT_ID');
        if (aud !== googleClientId) {
          throw new UnauthorizedException('유효하지 않은 Google 토큰입니다.');
        }

        googleProfile = { id, email, name, picture };
      } else if (data.code && data.redirectUri) {
        // 새 방식: authorization code → token 교환
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
          code: data.code,
          client_id: this.configService.get('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
          redirect_uri: data.redirectUri,
          grant_type: 'authorization_code',
        });

        // id_token에서 사용자 정보 추출
        const verifyRes = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenRes.data.id_token}`,
        );
        const { sub: id, email, name, picture } = verifyRes.data;
        googleProfile = { id, email, name, picture };
      } else {
        throw new BadRequestException('idToken 또는 code가 필요합니다.');
      }

      return this.googleLogin(googleProfile);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Google mobile login error:', error.response?.data || error.message);
      throw new UnauthorizedException('Google 로그인에 실패했습니다.');
    }
  }

  // ===== 카카오 모바일 로그인 (authorization code 방식) =====
  async kakaoMobileLogin(code: string, redirectUri: string) {
    try {
      // 1. code → access_token 교환
      const tokenParams: Record<string, string> = {
        grant_type: 'authorization_code',
        client_id: this.configService.get<string>('KAKAO_CLIENT_ID', ''),
        redirect_uri: redirectUri,
        code,
      };
      const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');
      if (clientSecret) {
        tokenParams.client_secret = clientSecret;
      }

      const tokenRes = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        null,
        { params: tokenParams },
      );
      // 2. access_token → 사용자 정보 조회
      const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`,
        },
      });
      // 3. 기존 kakaoLogin() 재사용
      return this.kakaoLogin(userRes.data);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('카카오 로그인에 실패했습니다.');
    }
  }

  // ===== 담당자 이름 검색 =====
  async searchManagers(name: string) {
    const managers = await this.managerService.searchByName(name);
    return {
      managers: managers.map((m) => ({
        id: m.id,
        name: m.name,
        affiliationCode: m.affiliationCode,
      })),
    };
  }
}
