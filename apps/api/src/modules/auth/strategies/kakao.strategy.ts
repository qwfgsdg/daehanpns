import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>('KAKAO_CALLBACK_URL', 'http://localhost:4000/api/auth/kakao/callback'),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    done(null, profile._json);
  }
}
