import React from 'react';
import { TextInput, StyleSheet, StyleProp, TextStyle, TextInputProps } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

interface InputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  numberOfLines?: number;
  accessibilityLabel?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<TextStyle>;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  maxLength,
  autoFocus,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  accessibilityLabel,
  style,
}: InputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={onChangeText}
      maxLength={maxLength}
      autoFocus={autoFocus}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      selectionColor={colors.primary}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
});
