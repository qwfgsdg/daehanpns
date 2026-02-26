/**
 * 날짜 포맷 유틸리티
 */

import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';

dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.locale('ko');

/**
 * 상대 시간 포맷 (5분 전, 1시간 전 등)
 */
export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

/**
 * 채팅 메시지 시간 포맷
 * - 오늘: 오후 3:30
 * - 어제: 어제 오후 3:30
 * - 그 외: 2026-02-10 오후 3:30
 */
export const formatChatTime = (date: string | Date): string => {
  const d = dayjs(date);
  const today = dayjs().startOf('day');
  const yesterday = today.subtract(1, 'day');

  if (d.isSame(today, 'day')) {
    return d.format('A h:mm'); // 오후 3:30
  } else if (d.isSame(yesterday, 'day')) {
    return `어제 ${d.format('A h:mm')}`;
  } else {
    return d.format('YYYY-MM-DD A h:mm');
  }
};

/**
 * 채팅 목록 시간 포맷
 * - 오늘: 오후 3:30
 * - 어제: 어제
 * - 일주일 이내: 요일 (월요일)
 * - 그 외: YYYY-MM-DD
 */
export const formatChatListTime = (date: string | Date): string => {
  const d = dayjs(date);
  const today = dayjs().startOf('day');
  const yesterday = today.subtract(1, 'day');
  const weekAgo = today.subtract(7, 'day');

  if (d.isSame(today, 'day')) {
    return d.format('A h:mm');
  } else if (d.isSame(yesterday, 'day')) {
    return '어제';
  } else if (d.isAfter(weekAgo)) {
    return d.format('dddd'); // 월요일, 화요일 등
  } else {
    return d.format('YYYY-MM-DD');
  }
};

/**
 * 날짜 구분선용 포맷
 * 예: 2026년 2월 10일 월요일
 */
export const formatDateDivider = (date: string | Date): string => {
  return dayjs(date).format('YYYY년 M월 D일 dddd');
};

/**
 * 구독 남은 날짜 계산
 */
export const calculateDaysLeft = (endDate: string | Date): number => {
  const end = dayjs(endDate);
  const today = dayjs();
  return end.diff(today, 'day');
};

/**
 * 구독 만료일 포맷
 */
export const formatSubscriptionDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY년 M월 D일');
};

/**
 * 날짜가 오늘인지 확인
 */
export const isToday = (date: string | Date): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};

/**
 * 두 날짜가 같은 날인지 확인 (메시지 그룹화용)
 */
export const isSameDay = (
  date1: string | Date,
  date2: string | Date
): boolean => {
  return dayjs(date1).isSame(dayjs(date2), 'day');
};

/**
 * 메시지 시간이 같은 분인지 확인 (시간 표시 최적화용)
 */
export const isSameMinute = (
  date1: string | Date,
  date2: string | Date
): boolean => {
  return dayjs(date1).isSame(dayjs(date2), 'minute');
};
