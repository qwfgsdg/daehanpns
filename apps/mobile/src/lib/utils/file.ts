/**
 * 파일 관련 유틸리티
 */

import { UPLOAD_LIMITS } from '@/constants';

/**
 * 파일 크기 포맷 (바이트 → 사람이 읽기 쉬운 형식)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
};

/**
 * 파일 확장자 추출
 */
export const getFileExtension = (filename: string): string => {
  const match = /\.(\w+)$/.exec(filename);
  return match ? match[1].toLowerCase() : '';
};

/**
 * 이미지 파일인지 확인
 */
export const isImageFile = (uri: string): boolean => {
  const ext = getFileExtension(uri);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
};

/**
 * 이미지 MIME 타입 확인
 */
export const isValidImageType = (mimeType: string): boolean => {
  return (UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
};

/**
 * 파일 MIME 타입 확인
 */
export const isValidFileType = (mimeType: string): boolean => {
  return (UPLOAD_LIMITS.ALLOWED_FILE_TYPES as readonly string[]).includes(mimeType);
};

/**
 * 이미지 크기 검증
 */
export const validateImageSize = (size: number): boolean => {
  return size <= UPLOAD_LIMITS.IMAGE_MAX_SIZE;
};

/**
 * 파일 크기 검증
 */
export const validateFileSize = (size: number): boolean => {
  return size <= UPLOAD_LIMITS.FILE_MAX_SIZE;
};

/**
 * 파일명에서 이름과 확장자 분리
 */
export const splitFilename = (
  filename: string
): { name: string; ext: string } => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return { name: filename, ext: '' };
  }
  return {
    name: filename.substring(0, lastDot),
    ext: filename.substring(lastDot + 1),
  };
};

/**
 * URI에서 파일명 추출
 */
export const getFilenameFromUri = (uri: string): string => {
  return uri.split('/').pop() || 'file';
};

/**
 * 파일 타입 아이콘 가져오기 (이모지)
 */
export const getFileIcon = (filename: string): string => {
  const ext = getFileExtension(filename);

  const iconMap: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📊',
    pptx: '📊',
    zip: '🗜️',
    rar: '🗜️',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎥',
    mp3: '🎵',
  };

  return iconMap[ext] || '📎';
};
