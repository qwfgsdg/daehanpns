/**
 * Install Referrer 유틸리티
 * Play Store에서 설치 시 referrer 파라미터를 읽어 AsyncStorage에 저장
 * EAS 프로덕션 빌드에서만 동작, Expo Go에서는 무시
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const INVITE_REF_KEY = 'invite_ref';
const REFERRER_CHECKED_KEY = 'install_referrer_checked';

/**
 * 앱 최초 실행 시 Install Referrer 확인
 * Play Store URL: ...&referrer=CODE 형태로 전달된 값을 읽음
 */
export const checkInstallReferrer = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  try {
    // 이미 체크했으면 스킵
    const alreadyChecked = await AsyncStorage.getItem(REFERRER_CHECKED_KEY);
    if (alreadyChecked) return;

    // 체크 완료 표시 (한 번만 실행)
    await AsyncStorage.setItem(REFERRER_CHECKED_KEY, 'true');

    // 이미 초대 코드가 있으면 스킵 (딥링크로 먼저 설정된 경우)
    const existingRef = await AsyncStorage.getItem(INVITE_REF_KEY);
    if (existingRef) return;

    // react-native-install-referrer 동적 로드 (Expo Go에서는 실패함)
    const InstallReferrer = require('react-native-install-referrer');
    const referrerInfo = await InstallReferrer.default.getInstallReferrerInfo();

    if (referrerInfo?.installReferrer) {
      const referrer = referrerInfo.installReferrer;
      // referrer가 추천코드 형태인지 확인 (알파벳+숫자, 3자 이상)
      if (/^[A-Za-z0-9]{3,}$/.test(referrer)) {
        await AsyncStorage.setItem(INVITE_REF_KEY, referrer);
      }
    }
  } catch {
    // Expo Go 또는 네이티브 모듈 미설치 시 무시
  }
};
