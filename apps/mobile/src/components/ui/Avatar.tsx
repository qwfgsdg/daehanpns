/**
 * 아바타 컴포넌트
 */

import React from 'react';
import { Avatar as PaperAvatar } from 'react-native-paper';
import { COLORS } from '@/constants';

interface Props {
  imageUrl?: string;
  name: string;
  size?: number;
  isOnline?: boolean;
}

export const Avatar: React.FC<Props> = ({
  imageUrl,
  name,
  size = 40,
  isOnline,
}) => {
  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (imageUrl) {
    return (
      <PaperAvatar.Image
        size={size}
        source={{ uri: imageUrl }}
      />
    );
  }

  return (
    <PaperAvatar.Text
      size={size}
      label={getInitials(name)}
      style={{ backgroundColor: COLORS.primary }}
    />
  );
};
