import { Controller, Post, Body, UseGuards, Req, Get, HttpCode } from '@nestjs/common';
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

  // ===== 구글 로그인 =====
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any) {
    return this.authService.googleLogin(req.user);
  }

  // ===== 카카오 로그인 =====
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuth() {
    // Guard redirects to Kakao
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthCallback(@Req() req: any) {
    return this.authService.kakaoLogin(req.user);
  }

  // ===== 소셜 회원가입 완료 =====
  @Post('social/complete')
  async completeSocialRegister(@Body() body: any) {
    return this.authService.completeSocialRegister(body);
  }
}
