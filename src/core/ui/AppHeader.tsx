import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, layout, spacing } from './theme';
import { Logo } from './Logo';

interface AppHeaderProps {
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function AppHeader({ actions, style, compact = false }: AppHeaderProps) {
  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <Logo size={compact ? 'sm' : 'md'} variant="lockup" />
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: layout.headerHeight,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: layout.headerBorderColor,
  },
  compact: {
    height: 48,
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
