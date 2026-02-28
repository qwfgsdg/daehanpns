/**
 * 채팅방 카드 컴포넌트 (목록용)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Badge } from 'react-native-paper';
import { ChatRoom } from '@/types';
import { Avatar } from '@/components/ui';
import { formatChatListTime } from '@/lib/utils';
import { COLORS } from '@/constants';
import { SPACING, BORDER_RADIUS } from '@/theme';

interface Props {
  room: ChatRoom;
  onPress: () => void;
}

export const ChatRoomCard: React.FC<Props> = ({ room, onPress }) => {
  const getRoomIcon = () => {
    if (room.type === 'ONE_TO_ONE') return '🔒';
    if (room.type === 'ONE_TO_N') return '📢';
    if (room.type === 'TWO_WAY') return '💬';
    return '💬';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 아바타 */}
      <Avatar name={room.name} size={56} />

      {/* 내용 */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.icon}>{getRoomIcon()}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {room.name}
            </Text>
          </View>
          <Text style={styles.time}>
            {room.lastMessage && formatChatListTime(room.lastMessage.createdAt)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {room.lastMessage?.content || '메시지가 없습니다'}
          </Text>
          {room.unreadCount > 0 && (
            <Badge style={styles.badge}>{room.unreadCount}</Badge>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
  },
});
