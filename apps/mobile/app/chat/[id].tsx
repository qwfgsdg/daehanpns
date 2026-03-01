/**
 * 채팅방 화면 (핵심!)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import {
  ChatMessage,
  ChatInput,
  TypingIndicator,
  SystemMessage,
} from '@/components/chat';
import { useChat, usePermission, useAuth } from '@/hooks';
import { getChatRoom } from '@/lib/api';
import { useChatStore } from '@/store';
import { formatDateDivider, isSameDay, isSameMinute } from '@/lib/utils';
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';
import { Text } from 'react-native-paper';
import { ChatRoom } from '@/types';

export default function ChatRoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { currentRoom, currentMessages, currentTypingUsers, hasMore, loadMessages } = useChat(roomId);
  const { addRoom } = useChatStore();
  const [fallbackRoom, setFallbackRoom] = useState<ChatRoom | null>(null);

  // currentRoom이 null이면 REST API로 방 정보 조회 (join 직후 rooms에 없는 경우)
  useEffect(() => {
    if (!currentRoom && roomId) {
      getChatRoom(roomId)
        .then((room) => {
          addRoom(room);
          setFallbackRoom(room);
        })
        .catch((err) => console.error('Failed to fetch room:', err));
    }
  }, [currentRoom, roomId]);

  const activeRoom = currentRoom || fallbackRoom;
  const permission = usePermission(activeRoom);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 무한 스크롤 (과거 메시지 로드)
  const handleLoadMore = async () => {
    if (isLoadingMore || !activeRoom || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = currentMessages.length;
      await loadMessages(roomId!, offset, 50);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 날짜 구분선이 필요한지 확인
  const shouldShowDateDivider = (index: number) => {
    if (index === 0) return true;
    const current = currentMessages[index];
    const previous = currentMessages[index - 1];
    return !isSameDay(current.createdAt, previous.createdAt);
  };

  // 송신자 정보 표시 여부
  const shouldShowSender = (index: number) => {
    if (index === 0) return true;
    const current = currentMessages[index];
    const previous = currentMessages[index - 1];

    // 시스템 메시지는 항상 표시
    if (current.type === 'SYSTEM') return true;

    // 다른 사람이면 표시
    if (current.senderId !== previous.senderId) return true;

    // 날짜가 다르면 표시
    if (!isSameDay(current.createdAt, previous.createdAt)) return true;

    return false;
  };

  // 시간 표시 여부
  const shouldShowTime = (index: number) => {
    if (index === currentMessages.length - 1) return true;
    const current = currentMessages[index];
    const next = currentMessages[index + 1];

    // 다음 메시지가 다른 사람이면 표시
    if (current.senderId !== next.senderId) return true;

    // 다음 메시지와 시간이 다르면 표시
    if (!isSameMinute(current.createdAt, next.createdAt)) return true;

    return false;
  };

  // 렌더 아이템
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMine = item.senderId === user?.id;
    const showDateDivider = shouldShowDateDivider(index);
    const showSender = shouldShowSender(index);
    const showTime = shouldShowTime(index);

    return (
      <View>
        {/* 날짜 구분선 */}
        {showDateDivider && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateDividerText}>
              {formatDateDivider(item.createdAt)}
            </Text>
          </View>
        )}

        {/* 메시지 */}
        <ChatMessage
          message={item}
          isMine={isMine}
          showSender={showSender}
          showTime={showTime}
          canReact={permission.canReact}
          senderRole={
            activeRoom?.participants?.find((p) => p.userId === item.senderId)?.ownerType || 'MEMBER'
          }
        />
      </View>
    );
  };

  // 헤더 (공지사항)
  const ListHeaderComponent = useMemo(() => {
    if (!activeRoom?.notice) return null;

    return (
      <View style={styles.noticeContainer}>
        <Text style={styles.noticeIcon}>📌</Text>
        <Text style={styles.noticeText}>{activeRoom.notice}</Text>
      </View>
    );
  }, [activeRoom?.notice]);

  // 푸터 (타이핑 인디케이터)
  const ListFooterComponent = useMemo(() => {
    return <TypingIndicator userNames={currentTypingUsers} />;
  }, [currentTypingUsers]);

  if (!activeRoom) {
    return (
      <View style={styles.container}>
        <Text>채팅방을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: activeRoom.name,
          headerBackTitle: '뒤로',
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* 메시지 리스트 */}
        <FlashList
          data={currentMessages}
          renderItem={renderItem}
          estimatedItemSize={80}
          inverted
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          contentContainerStyle={styles.listContent}
        />

        {/* 입력창 */}
        <ChatInput
          roomId={roomId!}
          canSendMessage={permission.canSendMessage}
          roomType={activeRoom.type}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateDividerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight + '20',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  noticeIcon: {
    fontSize: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});
