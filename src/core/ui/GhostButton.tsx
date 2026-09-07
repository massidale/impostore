import { ButtonLabel } from './ButtonLabel';
import React, { ReactNode } from 'react';
import { Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

interface GhostButtonProps {
  onPress: () => void;
  /** Icon rendered before the label. */
  icon?: ReactNode;
  children: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Low-emphasis pill button on a muted surface — used for secondary
 * in-game actions like "Nascondi" that must not compete with the
 * primary CTA.
 */
export function GhostButton({ onPress, icon, children, style }: GhostButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} activeOpacity={0.7}>
      {icon}
      <ButtonLabel style={styles.label}>{children}</ButtonLabel>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.md,
  },
});
