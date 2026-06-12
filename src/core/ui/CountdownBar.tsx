import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, spacing } from './theme';

interface CountdownBarProps {
  /** Remaining whole seconds. */
  seconds: number;
  /** Total duration, for the progress bar ratio. */
  total: number;
  /** Number size variant. */
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const SIZE_PRESET = {
  sm: { fontSize: 22, lineHeight: 26 },
  md: { fontSize: 36, lineHeight: 40 },
  lg: { fontSize: 56, lineHeight: 60 },
} as const;

/**
 * Countdown display shared by timed phases (Taboo turns, voting rounds):
 * big seconds counter over a thin progress bar, shifting to amber then
 * red as time runs out.
 */
export function CountdownBar({ seconds, total, size = 'lg', style }: CountdownBarProps) {
  const ratio = total > 0 ? seconds / total : 0;
  const color =
    seconds <= 10 ? colors.danger : seconds <= 20 ? colors.warning : colors.primaryLight;
  return (
    <View style={[styles.wrap, style]}>
      <Text
        style={[styles.value, { color, ...SIZE_PRESET[size] }]}
        allowFontScaling={false}
      >
        {seconds}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  value: {
    fontFamily: fonts.displayHeavy,
    letterSpacing: 1,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
