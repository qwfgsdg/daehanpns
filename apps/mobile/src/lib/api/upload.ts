/**
 * 파일 업로드 API
 * 백엔드는 래핑 없이 직접 반환
 */

import { apiClient } from './client';
import { UploadResponse, Banner } from '@/types';

/**
 * 이미지 업로드
 */
export const uploadImage = async (uri: string): Promise<UploadResponse> => {
  const formData = new FormData();

  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post('/files/upload/chat', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * 파일 업로드 (문서 등)
 */
export const uploadFile = async (uri: string): Promise<UploadResponse> => {
  const formData = new FormData();

  const filename = uri.split('/').pop() || 'file.pdf';
  const match = /\.(\w+)$/.exec(filename);
  const type = match
    ? `application/${match[1]}`
    : 'application/octet-stream';

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post('/files/upload/chat', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * 활성 배너 목록 조회
 */
export const getBanners = async (): Promise<Banner[]> => {
  const response = await apiClient.get('/banners', {
    params: { isActive: true },
  });
  return response.data || [];
};
