import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';
import { capitalize } from '../utils/text';

type Tone = 'neutral' | 'muted' | 'primary' | 'success' | 'danger';

interface WordBoxProps {
  /** Small uppercase label above the word (e.g. "La parola"). */
  label?: string;
  /** The word itself. Auto-shrinks to fit on one line. */
  word: string;
  tone?: Tone;
  /** Capitalize the first letter (default true). */
  autoCapitalize?: boolean;
  /** Base font size — shrinks automatically for long words. */
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

function fittedFontSize(word: string, base: number): number {
  const len = word ? word.length : 0;
  if (len <= 8) return base;
  if (len <= 11) return Math.round(base * 0.85);
  if (len <= 14) return Math.round(base * 0.72);
  if (len <= 18) return Math.round(base * 0.6);
  if (len <= 24) return Math.round(base * 0.48);
  return Math.round(base * 0.4);
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
 * submitted word, taboo word… Label on top, auto-fitted word below.
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
          { fontSize: fittedFontSize(word, base), color: toneColor[tone] },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
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
    fontFamily: fonts.displayHeavy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
