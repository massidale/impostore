import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, spacing } from './theme';

interface MetadataBadgeProps {
  label: string;
  value: string;
  align?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}

/**
 * Small label + value pair used inside game cards to surface
 * room id / player count / round number. Aligns left or right.
 */
export function MetadataBadge({ label, value, align = 'left', style }: MetadataBadgeProps) {
  return (
    <View style={[styles.container, align === 'right' && styles.right, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, align === 'right' && styles.valueRight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  value: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.sm,
  },
  valueRight: {
    textAlign: 'right',
  },
});
