import React from 'react';
import { Image, View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, radius, spacing } from './theme';

const LOGO_SOURCE = require('../../../assets/logo-senza-sfondo.png');

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
export type LogoVariant = 'symbol' | 'wordmark' | 'lockup';

const SIZE_MAP: Record<LogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 80,
  xl: 160,
};

const WORDMARK_SIZE_MAP: Record<LogoSize, number> = {
  sm: 16,
  md: 20,
  lg: 32,
  xl: 48,
};

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  style?: StyleProp<ViewStyle>;
  withHalo?: boolean;
}

export function Logo({ size = 'md', variant = 'lockup', style, withHalo = false }: LogoProps) {
  const symbolSize = SIZE_MAP[size];
  const wordmarkSize = WORDMARK_SIZE_MAP[size];

  if (variant === 'wordmark') {
    return (
      <View style={[styles.row, style]}>
        <Wordmark size={wordmarkSize} />
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <View style={withHalo ? styles.halo : undefined}>
        <Image
          source={LOGO_SOURCE}
          style={{
            width: symbolSize,
            height: symbolSize,
          }}
          resizeMode="contain"
          accessibilityLabel="gamesHub logo"
        />
      </View>
      {variant === 'lockup' && (
        <Wordmark size={wordmarkSize} style={{ marginLeft: spacing.md }} />
      )}
    </View>
  );
}

function Wordmark({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={[styles.wordmark, { fontSize: size, lineHeight: size * 1.05 }]}>
        <Text style={styles.wordmarkPrefix}>games</Text>
        <Text style={styles.wordmarkAccent}>Hub</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halo: {
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  wordmark: {
    fontFamily: fonts.displayHeavy,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  wordmarkPrefix: {
    color: colors.textPrimary,
  },
  wordmarkAccent: {
    color: colors.primary,
  },
});
