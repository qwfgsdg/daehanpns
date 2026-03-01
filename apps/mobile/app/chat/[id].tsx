/**
 * 채팅방 화면 (핵심!)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import ImageViewing from 'react-native-image-viewing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChatMessage,
  ChatInput,
  TypingIndicator,
  SystemMessage,
} from '@/components/chat';
import { useChat, usePermission, useAuth } from '@/hooks';
import { getChatRoom, getChatMessages } from '@/lib/api';
import { useChatStore } from '@/store';
import { formatDateDivider, isSameDay, isSameMinute } from '@/lib/utils';
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';
import { Text } from 'react-native-paper';
import { ChatRoom } from '@/types';

export default function ChatRoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerOffset = insets.top + 56; // 상태바 + 네비게이션 헤더(56px)
  const { user } = useAuth();
  const { currentRoom, currentMessages, currentTypingUsers, hasMore, loadMessages, handleLeaveRoom } = useChat(roomId);
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
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // 메시지 검색
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 이미지 URL 판별
  const isImageUrl = (url: string): boolean => {
    try {
      const pathname = new URL(url).pathname;
      return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(pathname);
    } catch {
      return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
    }
  };

  // 이미지 목록 (뷰어용)
  const imageUrls = useMemo(() =>
    currentMessages
      .filter(m => m.fileUrl && isImageUrl(m.fileUrl))
      .map(m => ({ uri: m.fileUrl! })),
    [currentMessages]
  );

  const onImagePress = (imageUrl: string) => {
    const idx = imageUrls.findIndex(img => img.uri === imageUrl);
    setSelectedImageIndex(idx >= 0 ? idx : 0);
    setImageViewerVisible(true);
  };

  // 메시지 검색 실행
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || !roomId) return;
    setIsSearching(true);
    try {
      const results = await getChatMessages(roomId, 0, 50, q);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, roomId]);

  const closeSearch = () => {
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 나가기 버튼 핸들러
  const onLeavePress = () => {
    // OWNER는 나가기 불가
    const myParticipant = activeRoom?.participants?.find((p: any) => p.userId === user?.id);
    if (myParticipant?.ownerType === 'OWNER') {
      Alert.alert('알림', '방장은 채팅방을 나갈 수 없습니다.');
      return;
    }
    Alert.alert(
      '채팅방 나가기',
      '정말로 이 채팅방을 나가시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              await handleLeaveRoom(roomId!);
              router.back();
            } catch (err) {
              Alert.alert('오류', '채팅방 나가기에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

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

  // 날짜 구분선이 필요한지 확인 (inverted + DESC: index 0=최신, last=가장 오래된)
  const shouldShowDateDivider = (index: number) => {
    if (index === currentMessages.length - 1) return true; // 가장 오래된 메시지 (화면 최상단)
    const current = currentMessages[index];
    const next = currentMessages[index + 1]; // 화면상 위(더 오래된) 메시지
    return !isSameDay(current.createdAt, next.createdAt);
  };

  // 송신자 정보 표시 여부 (inverted: 그룹의 최상단=가장 오래된 쪽에 표시)
  const shouldShowSender = (index: number) => {
    if (index === currentMessages.length - 1) return true; // 가장 오래된 메시지
    const current = currentMessages[index];
    if (current.type === 'SYSTEM') return true;
    const next = currentMessages[index + 1]; // 화면상 위(더 오래된) 메시지
    if (current.senderId !== next.senderId) return true;
    if (!isSameDay(current.createdAt, next.createdAt)) return true;
    return false;
  };

  // 시간 표시 여부 (inverted: 그룹의 최하단=가장 최신 쪽에 표시)
  const shouldShowTime = (index: number) => {
    if (index === 0) return true; // 가장 최신 메시지 (화면 최하단)
    const current = currentMessages[index];
    const prev = currentMessages[index - 1]; // 화면상 아래(더 최신) 메시지
    if (current.senderId !== prev.senderId) return true;
    if (!isSameMinute(current.createdAt, prev.createdAt)) return true;
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
          onImagePress={onImagePress}
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity onPress={() => setIsSearchMode(!isSearchMode)} style={{ marginRight: 4 }}>
                <MaterialCommunityIcons name="magnify" size={24} color={isSearchMode ? COLORS.primary : COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onLeavePress} style={{ marginRight: 8 }}>
                <MaterialCommunityIcons name="logout" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={headerOffset}
      >
        {/* 검색바 */}
        {isSearchMode && (
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="메시지 검색..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
              autoCorrect={false}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <TouchableOpacity onPress={handleSearch}>
                <MaterialCommunityIcons name="magnify" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={closeSearch}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* 검색 결과 또는 메시지 리스트 */}
        {isSearchMode && searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.searchResultHeader}>
                <Text style={styles.searchResultText}>
                  검색 결과 {searchResults.length}건
                </Text>
              </View>
            }
          />
        ) : isSearchMode && searchQuery.trim() && !isSearching && searchResults.length === 0 ? (
          <View style={styles.searchEmpty}>
            <Text style={styles.searchEmptyText}>검색 결과가 없습니다</Text>
          </View>
        ) : (
          <FlatList
            data={currentMessages}
            renderItem={renderItem}
            inverted
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={ListFooterComponent}
            ListFooterComponent={ListHeaderComponent}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* 입력창 */}
        {!isSearchMode && (
          <ChatInput
            roomId={roomId!}
            canSendMessage={permission.canSendMessage}
            roomType={activeRoom.type}
          />
        )}
      </KeyboardAvoidingView>

      <ImageViewing
        images={imageUrls}
        imageIndex={selectedImageIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  searchResultHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray50,
  },
  searchResultText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  searchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  searchEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
