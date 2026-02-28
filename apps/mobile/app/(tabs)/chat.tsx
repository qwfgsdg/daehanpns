/**
 * 채팅 목록 화면
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ChatRoomCard } from '@/components/chat';
import { useChat } from '@/hooks';
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';

export default function ChatListScreen() {
  const router = useRouter();
  const { rooms, loadRooms } = useChat();

  useEffect(() => {
    loadRooms();
  }, []);

  const handleRoomPress = (roomId: string) => {
    router.push(`/chat/${roomId}`);
  };

  return (
    <View style={styles.container}>
      {rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>참여 중인 채팅방이 없습니다</Text>
          <Text style={styles.emptySubtext}>
            공개 채팅방에 참여하거나 초대를 기다려주세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatRoomCard
              room={item}
              onPress={() => handleRoomPress(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
