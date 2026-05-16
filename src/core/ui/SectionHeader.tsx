import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, spacing } from './theme';

interface SectionHeaderProps {
  label: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
}

export function SectionHeader({ label, hint, style, size = 'md' }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, size === 'sm' && styles.labelSm]}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.primary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  labelSm: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
