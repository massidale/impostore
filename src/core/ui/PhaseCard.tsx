import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

type Tone = 'neutral' | 'cyan' | 'warning' | 'danger' | 'success';

interface PhaseCardProps {
  /** Phase title displayed in the header strip — keep short. */
  title?: string;
  /** Optional one-line description under the title. */
  description?: string;
  /** Tone influences accent color (left bar + title color). */
  tone?: Tone;
  /** Compact mode: smaller padding, smaller title. */
  compact?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Common "phase card" used by all games to wrap a self-contained
 * piece of game state (role reveal, voting list, word display, etc.).
 * Provides consistent padding, radius and a tonal accent.
 */
export function PhaseCard({
  title,
  description,
  tone = 'neutral',
  compact,
  children,
  style,
}: PhaseCardProps) {
  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      {title ? (
        <View style={styles.header}>
          <View style={[styles.accent, toneAccentStyles[tone]]} />
          <View style={styles.headerText}>
            <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
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
  },
  cardCompact: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  accent: {
    width: 3,
    borderRadius: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleCompact: {
    fontSize: fontSize.lg,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 2,
  },
});

const toneAccentStyles: Record<Tone, ViewStyle> = {
  neutral: { backgroundColor: colors.primary },
  cyan: { backgroundColor: colors.primary },
  warning: { backgroundColor: colors.warning },
  danger: { backgroundColor: colors.danger },
  success: { backgroundColor: colors.success },
};
