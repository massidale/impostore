import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

interface PillProps {
  label: string;
  variant?: 'cyan' | 'neutral' | 'outline';
  icon?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Pill({ label, variant = 'neutral', icon, onPress, style }: PillProps) {
  const wrapStyle = [
    styles.base,
    variant === 'cyan' && styles.cyan,
    variant === 'neutral' && styles.neutral,
    variant === 'outline' && styles.outline,
    style,
  ];
  const textStyle = [
    styles.label,
    variant === 'cyan' && styles.labelCyan,
    variant === 'outline' && styles.labelOutline,
  ];

  const inner = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={textStyle}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={wrapStyle} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={wrapStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  cyan: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  neutral: {
    backgroundColor: colors.surfaceAlt,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
  labelCyan: {
    color: colors.primaryLight,
  },
  labelOutline: {
    color: colors.textSecondary,
  },
});
