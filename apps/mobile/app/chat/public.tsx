/**
 * 공개 채팅방 목록 화면
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ChatRoomCard } from '@/components/chat';
import { useChat } from '@/hooks';
import { joinPublicRoom } from '@/lib/api';
import { ChatRoom } from '@/types';
import { COLORS, SPACING } from '@/constants';

export default function PublicChatRoomsScreen() {
  const router = useRouter();
  const { loadPublicRooms } = useChat();
  const [publicRooms, setPublicRooms] = useState<ChatRoom[]>([]);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadPublicRoomsData();
  }, []);

  const loadPublicRoomsData = async () => {
    const data = await loadPublicRooms();
    setPublicRooms(data);
  };

  const handleJoinRoom = async (roomId: string) => {
    if (joining) return;

    setJoining(true);
    try {
      await joinPublicRoom(roomId);
      router.push(`/chat/${roomId}`);
    } catch (error: any) {
      Alert.alert('오류', error.message || '채팅방 참여에 실패했습니다.');
    } finally {
      setJoining(false);
    }
  };

  const handleRoomPress = (room: ChatRoom) => {
    Alert.alert(
      '채팅방 참여',
      `'${room.name}' 채팅방에 참여하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '참여',
          onPress: () => handleJoinRoom(room.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {publicRooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📢</Text>
          <Text style={styles.emptyText}>공개 채팅방이 없습니다</Text>
          <Text style={styles.emptySubtext}>
            관리자가 공개 채팅방을 생성하면 여기에 표시됩니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={publicRooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatRoomCard
              room={item}
              onPress={() => handleRoomPress(item)}
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
