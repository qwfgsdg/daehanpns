import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:4000'; // 개발 환경 (실제 배포 시 변경 필요)

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export class ApiClient {
  // ===== 회원가입 =====
  static async register(data: {
    phone: string;
    password: string;
    name: string;
    nickname?: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    affiliateCode: string;
    referralCode?: string;
    managerId?: string;
  }) {
    const response = await api.post('/auth/user/register', data);
    return response.data;
  }

  // ===== 로그인 =====
  static async login(phone: string, password: string) {
    const response = await api.post('/auth/user/login', { phone, password });
    return response.data;
  }

  // ===== SMS 인증번호 발송 =====
  static async sendSms(phone: string) {
    const response = await api.post('/auth/sms/send', { phone });
    return response.data;
  }

  // ===== SMS 인증번호 확인 =====
  static async verifySms(phone: string, code: string) {
    const response = await api.post('/auth/sms/verify', { phone, code });
    return response.data;
  }

  // ===== 추천 코드 검증 =====
  static async validateReferralCode(code: string) {
    const response = await api.get(`/auth/validate-referral-code?code=${encodeURIComponent(code)}`);
    return response.data;
  }

  // ===== 담당자 이름 검색 =====
  static async searchManagers(name: string) {
    const response = await api.get(`/auth/search-managers?name=${encodeURIComponent(name)}`);
    return response.data;
  }

  // ===== 소셜 회원가입 완료 =====
  static async completeSocialRegister(data: {
    provider: 'GOOGLE' | 'KAKAO';
    providerId: string;
    phone: string;
    name: string;
    nickname?: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    affiliateCode: string;
    email?: string;
    profileImage?: string;
    referralCode?: string;
    managerId?: string;
  }) {
    const response = await api.post('/auth/social/complete', data);
    return response.data;
  }
}
