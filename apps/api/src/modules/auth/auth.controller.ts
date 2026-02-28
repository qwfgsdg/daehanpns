import { Controller, Post, Body, UseGuards, Req, Get, HttpCode, Query, Res, ExecutionContext, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

/**
 * OAuth Guard: state 파라미터로 platform 전달
 * (쿠키 방식은 Guard가 먼저 redirect해서 쿠키가 설정되지 않음)
 */
@Injectable()
class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    return { state: request.query.platform || 'web' };
  }
}

@Injectable()
class KakaoOAuthGuard extends AuthGuard('kakao') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    return { state: request.query.platform || 'web' };
  }
}

@Controller('auth')
export class AuthController {
  private readonly webUrl: string;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    this.webUrl = this.configService.get<string>('WEB_URL', 'https://dhpns.kr');
  }

  // ===== 관리자 로그인 =====
  @Post('admin/login')
  @HttpCode(200)
  async adminLogin(@Body() body: { loginId: string; password: string }, @Req() req: any) {
    return this.authService.adminLogin(
      body.loginId,
      body.password,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ===== 현재 관리자 정보 조회 =====
  @Get('admin/me')
  @UseGuards(AuthGuard('jwt'))
  async getAdminProfile(@Req() req: any) {
    return this.authService.getAdminProfile(req.user.sub);
  }

  // ===== 회원 회원가입 =====
  @Post('user/register')
  async userRegister(@Body() body: any) {
    return this.authService.userRegister(body);
  }

  // ===== 회원 로그인 (loginId + 비밀번호) =====
  @Post('user/login')
  @HttpCode(200)
  async userLogin(@Body() body: { loginId: string; password: string }) {
    return this.authService.userLogin(body.loginId, body.password);
  }

  // ===== loginId 중복 확인 =====
  @Get('check-login-id')
  async checkLoginId(@Query('loginId') loginId: string) {
    return this.authService.checkLoginId(loginId);
  }

  // ===== 기존 유저 loginId 변경 =====
  @Post('update-login-id')
  @UseGuards(AuthGuard('jwt'))
  async updateLoginId(@Body() body: { loginId: string; password?: string }, @Req() req: any) {
    return this.authService.updateLoginId(req.user.id || req.user.sub, body);
  }

  // ===== SMS 인증번호 발송 =====
  @Post('sms/send')
  async sendSms(@Body() body: { phone: string }) {
    return this.authService.sendSmsVerification(body.phone);
  }

  // ===== SMS 인증번호 확인 =====
  @Post('sms/verify')
  async verifySms(@Body() body: { phone: string; code: string }) {
    return this.authService.verifySmsCode(body.phone, body.code);
  }

  // ===== 추천 코드 검증 =====
  @Get('validate-referral-code')
  async validateReferralCode(@Query('code') code?: string) {
    return this.authService.validateReferralCode(code || '');
  }

  // ===== 담당자 이름 검색 =====
  @Get('search-managers')
  async searchManagers(@Query('name') name?: string) {
    return this.authService.searchManagers(name || '');
  }

  // ===== 전화번호/이메일 중복 체크 =====
  @Get('check-duplicate')
  async checkDuplicate(@Query('phone') phone?: string, @Query('email') email?: string) {
    return this.authService.checkDuplicate(phone, email);
  }

  // ===== 구글 모바일 로그인 (id_token 또는 authorization code 방식) =====
  @Post('google/mobile')
  @HttpCode(200)
  async googleMobileLogin(@Body() body: { idToken?: string; code?: string; redirectUri?: string }) {
    return this.authService.googleMobileLogin(body);
  }

  // ===== 구글 모바일 redirect 프록시 =====
  // Google OAuth callback → 앱의 return URL로 code 전달
  @Get('google/mobile/redirect')
  async googleMobileRedirect(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    const allowedSchemes = ['exp://', 'daehanpns://'];
    const returnUrl = decodeURIComponent(state);
    const isAllowed = allowedSchemes.some((scheme) => returnUrl.startsWith(scheme));
    if (!isAllowed) {
      return res.status(400).send('Invalid return URL scheme');
    }

    const separator = returnUrl.includes('?') ? '&' : '?';
    return res.redirect(`${returnUrl}${separator}code=${code}`);
  }

  // ===== 카카오 모바일 로그인 (authorization code 방식) =====
  @Post('kakao/mobile')
  @HttpCode(200)
  async kakaoMobileLogin(@Body() body: { code: string; redirectUri: string }) {
    return this.authService.kakaoMobileLogin(body.code, body.redirectUri);
  }

  // ===== 카카오 모바일 redirect 프록시 =====
  // 카카오 OAuth callback → 앱의 return URL로 code 전달
  // (Expo Go에서 동적 exp:// 스킴을 카카오 콘솔에 등록할 수 없으므로
  //  고정 서버 URL을 redirect_uri로 사용하고, state에 앱 return URL을 담아 전달)
  @Get('kakao/mobile/redirect')
  async kakaoMobileRedirect(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    // state에 담긴 앱 return URL의 스킴 검증 (보안)
    const allowedSchemes = ['exp://', 'daehanpns://'];
    const returnUrl = decodeURIComponent(state);
    const isAllowed = allowedSchemes.some((scheme) => returnUrl.startsWith(scheme));
    if (!isAllowed) {
      return res.status(400).send('Invalid return URL scheme');
    }

    const separator = returnUrl.includes('?') ? '&' : '?';
    return res.redirect(`${returnUrl}${separator}code=${code}`);
  }

  // ===== 구글 로그인 (웹용 - 기존 redirect 방식) =====
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    // GoogleOAuthGuard가 state=platform과 함께 Google로 리다이렉트
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);
    const platform = req.query.state || 'web';

    if (result.isNewUser) {
      const userData = encodeURIComponent(JSON.stringify(result.googleUser));

      if (platform === 'mobile') {
        return res.redirect(`daehanpns://register/social?provider=google&data=${userData}`);
      } else {
        return res.redirect(`${this.webUrl}/register/social?provider=google&data=${userData}`);
      }
    } else {
      if (platform === 'mobile') {
        return res.redirect(`daehanpns://auth/callback?token=${result.accessToken}`);
      } else {
        return res.redirect(`${this.webUrl}/auth/callback?token=${result.accessToken}`);
      }
    }
  }

  // ===== 카카오 로그인 =====
  @Get('kakao')
  @UseGuards(KakaoOAuthGuard)
  async kakaoAuth() {
    // KakaoOAuthGuard가 state=platform과 함께 Kakao로 리다이렉트
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.kakaoLogin(req.user);
    const platform = req.query.state || 'web';

    if (result.isNewUser) {
      const userData = encodeURIComponent(JSON.stringify(result.kakaoUser));

      if (platform === 'mobile') {
        return res.redirect(`daehanpns://register/social?provider=kakao&data=${userData}`);
      } else {
        return res.redirect(`${this.webUrl}/register/social?provider=kakao&data=${userData}`);
      }
    } else {
      if (platform === 'mobile') {
        return res.redirect(`daehanpns://auth/callback?token=${result.accessToken}`);
      } else {
        return res.redirect(`${this.webUrl}/auth/callback?token=${result.accessToken}`);
      }
    }
  }

  // ===== 소셜 회원가입 완료 =====
  @Post('social/complete')
  async completeSocialRegister(@Body() body: any) {
    return this.authService.completeSocialRegister(body);
  }
}
