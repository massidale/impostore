import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

type Tone = 'warning' | 'danger' | 'primary' | 'neutral';

interface NoticeBannerProps {
  /** Short uppercase badge on the left (e.g. "In attesa"). */
  badge?: string;
  message: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

const toneStyles: Record<Tone, { bg: string; badge: string }> = {
  warning: { bg: 'rgba(245, 158, 11, 0.10)', badge: colors.warning },
  danger: { bg: 'rgba(244, 63, 94, 0.10)', badge: colors.danger },
  primary: { bg: 'rgba(6, 182, 212, 0.10)', badge: colors.primaryLight },
  neutral: { bg: colors.surfaceAlt, badge: colors.textSecondary },
};

/**
 * Inline tinted banner with an optional badge. Used for soft notices like
 * "players waiting for the next round" — not for errors (see ErrorBanner).
 */
export function NoticeBanner({ badge, message, tone = 'warning', style }: NoticeBannerProps) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }, style]}>
      {badge ? <Text style={[styles.badge, { color: t.badge }]}>{badge}</Text> : null}
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  badge: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  message: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
});
