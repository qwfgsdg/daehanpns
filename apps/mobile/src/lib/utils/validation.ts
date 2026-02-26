/**
 * 유효성 검사 유틸리티
 */

/**
 * 이메일 형식 검증
 */
export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * 비밀번호 강도 검증
 * - 8자 이상
 * - 영문 + 숫자 포함
 */
export const validatePassword = (
  password: string
): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: '비밀번호는 8자 이상이어야 합니다' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      message: '비밀번호는 영문과 숫자를 포함해야 합니다',
    };
  }

  return { isValid: true };
};

/**
 * 전화번호 형식 검증 (한국)
 */
export const validatePhone = (phone: string): boolean => {
  // 010-1234-5678 또는 01012345678
  const regex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
  return regex.test(phone);
};

/**
 * 전화번호 포맷팅 (010-1234-5678)
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
};

/**
 * 이름 검증 (2-20자, 한글/영문)
 */
export const validateName = (name: string): boolean => {
  if (name.length < 2 || name.length > 20) return false;
  const regex = /^[가-힣a-zA-Z\s]+$/;
  return regex.test(name);
};

/**
 * 빈 문자열 체크 (공백 제거 후)
 */
export const isEmpty = (str: string): boolean => {
  return str.trim().length === 0;
};

/**
 * URL 형식 검증
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 메시지 길이 검증 (1-1000자)
 */
export const validateMessageLength = (message: string): boolean => {
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= 1000;
};

/**
 * 채팅방 이름 검증 (2-50자)
 */
export const validateRoomName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};
