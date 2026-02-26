/**
 * 버튼 컴포넌트 (Paper 래퍼)
 */

import React from 'react';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface Props extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  fullWidth?: boolean;
}

export const Button: React.FC<Props> = ({
  variant = 'primary',
  fullWidth = false,
  style,
  ...props
}) => {
  const getMode = () => {
    switch (variant) {
      case 'primary':
        return 'contained';
      case 'secondary':
        return 'contained-tonal';
      case 'outline':
        return 'outlined';
      case 'text':
        return 'text';
      default:
        return 'contained';
    }
  };

  return (
    <PaperButton
      mode={getMode()}
      style={[fullWidth && styles.fullWidth, style]}
      contentStyle={styles.content}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  content: {
    height: 48,
  },
});
