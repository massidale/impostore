import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from './theme';

type Tone = 'naked' | 'neutral' | 'warning' | 'danger';

interface HostActionFooterProps {
  /** Buttons (Button components) — laid out horizontally with flex:1 each. */
  children: ReactNode;
  tone?: Tone;
  layout?: 'row' | 'stack';
  style?: StyleProp<ViewStyle>;
}

/**
 * Footer block for host actions inside game phases.
 *
 * - `naked` (default): no background, no padding — just a row of buttons.
 *   Used when the host dashboard itself already provides a container.
 * - `neutral`/`warning`/`danger`: tinted background block, used when the
 *   actions need to stand out from surrounding content.
 */
export function HostActionFooter({
  children,
  tone = 'naked',
  layout = 'row',
  style,
}: HostActionFooterProps) {
  const isNaked = tone === 'naked';
  return (
    <View style={[!isNaked && styles.container, !isNaked && toneStyles[tone], style]}>
      <View style={[styles.actions, layout === 'stack' && styles.stack]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stack: {
    flexDirection: 'column',
  },
});

const toneStyles: Record<Exclude<Tone, 'naked'>, ViewStyle> = {
  warning: { backgroundColor: 'rgba(245, 158, 11, 0.10)' },
  danger: { backgroundColor: 'rgba(244, 63, 94, 0.10)' },
  neutral: { backgroundColor: colors.surfaceAlt },
};
