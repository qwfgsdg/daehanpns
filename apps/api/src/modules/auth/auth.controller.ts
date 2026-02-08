import { Controller, Post, Body, UseGuards, Req, Get, HttpCode, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  // ===== 회원 로그인 =====
  @Post('user/login')
  @HttpCode(200)
  async userLogin(@Body() body: { phone: string; password: string }) {
    return this.authService.userLogin(body.phone, body.password);
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

  // ===== 구글 로그인 =====
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any, @Res() res: Response) {
    // platform 쿼리 파라미터를 쿠키에 저장
    if (req.query.platform) {
      res.cookie('oauth_platform', req.query.platform, {
        maxAge: 5 * 60 * 1000, // 5분
        httpOnly: true,
      });
    }
    // Guard가 자동으로 Google로 리다이렉트하지만,
    // passReq를 사용하므로 여기서는 컨트롤을 넘겨줌
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);
    const platform = req.cookies?.oauth_platform || 'web';

    // 쿠키 삭제
    res.clearCookie('oauth_platform');

    if (result.isNewUser) {
      // 신규 회원 → 회원가입 페이지로 리다이렉트
      const userData = encodeURIComponent(JSON.stringify(result.googleUser));

      if (platform === 'mobile') {
        // 모바일 딥링크
        return res.redirect(`daehanpns://register/social?provider=google&data=${userData}`);
      } else {
        // 웹 URL
        return res.redirect(`http://localhost:3002/register/social?provider=google&data=${userData}`);
      }
    } else {
      // 기존 회원 → 토큰과 함께 리다이렉트
      if (platform === 'mobile') {
        return res.redirect(`daehanpns://auth/callback?token=${result.accessToken}`);
      } else {
        return res.redirect(`http://localhost:3002/auth/callback?token=${result.accessToken}`);
      }
    }
  }

  // ===== 카카오 로그인 =====
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuth(@Req() req: any, @Res() res: Response) {
    // platform 쿼리 파라미터를 쿠키에 저장
    if (req.query.platform) {
      res.cookie('oauth_platform', req.query.platform, {
        maxAge: 5 * 60 * 1000, // 5분
        httpOnly: true,
      });
    }
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.kakaoLogin(req.user);
    const platform = req.cookies?.oauth_platform || 'web';

    // 쿠키 삭제
    res.clearCookie('oauth_platform');

    if (result.isNewUser) {
      // 신규 회원 → 회원가입 페이지로 리다이렉트
      const userData = encodeURIComponent(JSON.stringify(result.kakaoUser));

      if (platform === 'mobile') {
        return res.redirect(`daehanpns://register/social?provider=kakao&data=${userData}`);
      } else {
        return res.redirect(`http://localhost:3002/register/social?provider=kakao&data=${userData}`);
      }
    } else {
      // 기존 회원 → 토큰과 함께 리다이렉트
      if (platform === 'mobile') {
        return res.redirect(`daehanpns://auth/callback?token=${result.accessToken}`);
      } else {
        return res.redirect(`http://localhost:3002/auth/callback?token=${result.accessToken}`);
      }
    }
  }

  // ===== 소셜 회원가입 완료 =====
  @Post('social/complete')
  async completeSocialRegister(@Body() body: any) {
    return this.authService.completeSocialRegister(body);
  }
}
