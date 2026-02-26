/**
 * 이모지 반응 컴포넌트 (추천사항 2)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { EmojiReaction as EmojiReactionType } from '@/types';
import { addMessageReaction } from '@/lib/api';
import { COLORS } from '@/constants';

interface Props {
  messageId: string;
  reactions?: EmojiReactionType[];
  canReact: boolean;
}

const EMOJI_OPTIONS: Array<'👍' | '❤️' | '😊' | '🎉' | '👏'> = [
  '👍',
  '❤️',
  '😊',
  '🎉',
  '👏',
];

export const EmojiReaction: React.FC<Props> = ({
  messageId,
  reactions = [],
  canReact,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // 이모지별로 그룹화하고 카운트
  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleEmojiSelect = async (emoji: typeof EMOJI_OPTIONS[number]) => {
    try {
      await addMessageReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
    setShowPicker(false);
  };

  if (reactions.length === 0 && !canReact) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* 기존 반응들 표시 */}
      {Object.entries(grouped).map(([emoji, count]) => (
        <TouchableOpacity
          key={emoji}
          style={styles.reactionBubble}
          onPress={() => canReact && handleEmojiSelect(emoji as any)}
          disabled={!canReact}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.count}>{count}</Text>
        </TouchableOpacity>
      ))}

      {/* 추가 버튼 */}
      {canReact && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* 이모지 선택 모달 */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.emojiPicker}>
            {EMOJI_OPTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiOption}
                onPress={() => handleEmojiSelect(emoji)}
              >
                <Text style={styles.emojiLarge}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addButton: {
    backgroundColor: COLORS.gray200,
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPicker: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  emojiOption: {
    padding: 8,
  },
  emojiLarge: {
    fontSize: 32,
  },
});
