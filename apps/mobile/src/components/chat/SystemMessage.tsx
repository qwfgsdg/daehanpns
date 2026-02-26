/**
 * 시스템 메시지 컴포넌트 (추천사항 1: 입장/퇴장)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

interface Props {
  content: string;
}

export const SystemMessage: React.FC<Props> = ({ content }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  text: {
    fontSize: 12,
    color: COLORS.systemMessage,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
