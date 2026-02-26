/**
 * 색상 팔레트
 */

export const COLORS = {
  // Primary
  primary: '#4A90E2',
  primaryDark: '#357ABD',
  primaryLight: '#74AAEB',

  // Secondary
  secondary: '#50C878',
  secondaryDark: '#3BA05F',
  secondaryLight: '#7DD89A',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Chat
  chatBubbleMine: '#4A90E2',
  chatBubbleOther: '#F5F5F5',
  chatTextMine: '#FFFFFF',
  chatTextOther: '#212121',
  systemMessage: '#999999',

  // Background
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',

  // Border
  border: '#E0E0E0',
  borderLight: '#F0F0F0',

  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  textPlaceholder: '#9E9E9E',

  // Badge
  badgeMaster: '#FFD700',
  badgeLeader: '#4A90E2',
  badgeOnline: '#10B981',
  badgeOffline: '#9E9E9E',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorKey = keyof typeof COLORS;
