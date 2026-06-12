import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

type Tone = 'neutral' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';

interface StatusCardProps {
  title: string;
  message?: string;
  tone?: Tone;
  /** Optional icon / illustration above the title. */
  icon?: ReactNode;
  /** Extra content under the message (progress counters, buttons…). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const toneColor: Record<Tone, string> = {
  neutral: colors.textPrimary,
  muted: colors.textMuted,
  primary: colors.primaryLight,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

/**
 * Centered status panel used for transient game states:
 * waiting for the host, eliminated, loading, vote registered…
 */
export function StatusCard({ title, message, tone = 'neutral', icon, children, style }: StatusCardProps) {
  return (
    <View style={[styles.card, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.title, { color: toneColor[tone] }]}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
