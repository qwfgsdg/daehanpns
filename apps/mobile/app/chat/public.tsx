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
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';

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
      const result = await joinPublicRoom(roomId);
      if (result?.isPending) {
        Alert.alert('입장 요청 완료', '관리자 승인 후 입장이 가능합니다.');
        loadPublicRoomsData();
      } else {
        loadPublicRoomsData();
        router.push(`/chat/${roomId}`);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('구독 필요', '이 채팅방은 구독이 필요합니다.');
      } else {
        const msg = error.response?.data?.message || error.message || '채팅방 참여에 실패했습니다.';
        Alert.alert('오류', msg);
      }
    } finally {
      setJoining(false);
    }
  };

  const handleRoomPress = (room: any) => {
    // 이미 참여 중인 방은 바로 이동
    if (room.isJoined) {
      router.push(`/chat/${room.id}`);
      return;
    }

    // 승인 대기 중
    if (room.isPending) {
      Alert.alert('승인 대기 중', '관리자 승인을 기다리고 있습니다.');
      return;
    }

    // APPROVAL 방
    if (room.joinType === 'APPROVAL') {
      Alert.alert(
        '입장 요청',
        `'${room.name}' 채팅방은 관리자 승인이 필요합니다.\n입장을 요청하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '요청',
            onPress: () => handleJoinRoom(room.id),
          },
        ]
      );
      return;
    }

    // FREE 방
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
