import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize } from './theme';

interface ProgressCounterProps {
  completed: number;
  total: number;
  /** Optional prefix word (e.g. "Pronti", "Votato"). */
  prefix?: string;
  /** Optional suffix (default: "completati"). */
  suffix?: string;
  tone?: 'muted' | 'primary' | 'success' | 'warning';
  style?: StyleProp<TextStyle>;
}

export function ProgressCounter({
  completed,
  total,
  prefix,
  suffix,
  tone = 'muted',
  style,
}: ProgressCounterProps) {
  const color =
    tone === 'primary'
      ? colors.primary
      : tone === 'success'
      ? colors.success
      : tone === 'warning'
      ? colors.warning
      : colors.textMuted;
  return (
    <Text style={[styles.text, { color }, style]}>
      {prefix ? `${prefix} ` : ''}
      <Text style={styles.numbers}>
        {completed}/{total}
      </Text>
      {suffix ? ` ${suffix}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  numbers: {
    fontFamily: fonts.code,
    letterSpacing: 0,
  },
});
