/**
 * 역할 뱃지 컴포넌트 (백엔드 OwnerType 일치)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OwnerType } from '@/types';
import { ROLE_CONFIG } from '@/constants';

interface Props {
  role: OwnerType;
  userName: string;
  showLabel?: boolean;
}

export const RoleBadge: React.FC<Props> = ({
  role,
  userName,
  showLabel = true,
}) => {
  const config = ROLE_CONFIG[role];

  // 일반 멤버는 역할 표시 없이 이름만
  if (role === 'MEMBER') {
    return <Text style={styles.userName}>{userName}</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.userName, { color: config.color }]}>
        {userName}
      </Text>
      {showLabel && config.label && (
        <View style={[styles.badge, { backgroundColor: config.color }]}>
          <Text style={styles.badgeText}>{config.label}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
});
