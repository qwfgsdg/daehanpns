/**
 * 입력 컴포넌트 (Paper 래퍼)
 */

import React from 'react';
import { TextInput, TextInputProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface Props extends Omit<TextInputProps, 'mode'> {
  error?: boolean;
  helperText?: string;
}

export const Input: React.FC<Props> = ({
  error,
  helperText,
  style,
  ...props
}) => {
  return (
    <TextInput
      mode="outlined"
      error={error}
      style={[styles.input, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'transparent',
  },
});
