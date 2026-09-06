import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';
import { wrappingText } from './wrappingText';
import { capitalize } from '../utils/text';

type Tone = 'neutral' | 'muted' | 'primary' | 'success' | 'danger';

interface WordBoxProps {
  /** Small uppercase label above the word (e.g. "La parola"). */
  label?: string;
  /** The word itself. Wraps across as many lines as needed. */
  word: string;
  tone?: Tone;
  /** Capitalize the first letter (default true). */
  autoCapitalize?: boolean;
  /** Base font size; the enclosing card scales to available space. */
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const toneColor: Record<Tone, string> = {
  neutral: colors.textPrimary,
  muted: colors.textMuted,
  primary: colors.primaryLight,
  success: colors.success,
  danger: colors.danger,
};

/**
 * The "big word" display used across games: secret word, hint,
 * submitted word, taboo word… Label on top, wrapping word below.
 */
export function WordBox({
  label,
  word,
  tone = 'neutral',
  autoCapitalize = true,
  size = 'lg',
  style,
}: WordBoxProps) {
  const base = size === 'lg' ? 48 : 34;
  return (
    <View style={[styles.box, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text
        style={[
          styles.word,
          { fontSize: base, color: toneColor[tone] },
        ]}
      >
        {autoCapitalize ? capitalize(word) : word}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  word: {
    ...wrappingText,
    width: '100%',
    fontFamily: fonts.displayHeavy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
