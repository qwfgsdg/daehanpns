/**
 * 타이핑 인디케이터 컴포넌트
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';

interface Props {
  userNames: string[];
}

export const TypingIndicator: React.FC<Props> = ({ userNames }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userNames.length === 0) return;

    // 점 애니메이션
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      animate(dot1, 0),
      animate(dot2, 150),
      animate(dot3, 300),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [userNames]);

  if (userNames.length === 0) return null;

  const displayText =
    userNames.length === 1
      ? `${userNames[0]}님이 입력 중`
      : userNames.length === 2
      ? `${userNames[0]}님, ${userNames[1]}님이 입력 중`
      : `${userNames[0]}님 외 ${userNames.length - 1}명이 입력 중`;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{displayText}</Text>
      <View style={styles.dots}>
        <Animated.View
          style={[
            styles.dot,
            { opacity: dot1, transform: [{ translateY: dot1.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { opacity: dot2, transform: [{ translateY: dot2.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { opacity: dot3, transform: [{ translateY: dot3.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  text: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
  },
});
