import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, fontSize } from './theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'warningMuted'
  | 'danger'
  | 'dangerMuted'
  | 'dangerOutline'
  | 'accent'
  | 'accentOutline';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
}

const gradientFor: Record<ButtonVariant, [string, string]> = {
  primary: [colors.primary, colors.primaryDark],
  success: [colors.success, colors.successDark],
  secondary: [colors.surfaceAlt, colors.surfaceAlt],
  warning: [colors.warning, colors.warning],
  warningMuted: [colors.warningMuted, colors.warningMuted],
  danger: [colors.danger, colors.danger],
  dangerMuted: [colors.dangerMuted, colors.dangerMuted],
  accent: [colors.accent, colors.accent],
  dangerOutline: ['transparent', 'transparent'],
  accentOutline: ['transparent', 'transparent'],
};

const paddingFor: Record<ButtonSize, number> = {
  sm: spacing.sm + 2,
  md: spacing.md + 2,
  lg: spacing.xl + 2,
};

const radiusFor: Record<ButtonSize, number> = {
  sm: radius.sm,
  md: radius.sm,
  lg: radius.lg,
};

const fontFor: Record<ButtonSize, number> = {
  sm: fontSize.sm,
  md: fontSize.md,
  lg: fontSize.lg - 1,
};

export function Button({
  onPress,
  disabled,
  variant = 'primary',
  size = 'md',
  children,
  style,
  textStyle,
  leftIcon,
}: ButtonProps) {
  const isDangerOutline = variant === 'dangerOutline';
  const isAccentOutline = variant === 'accentOutline';
  const isOutline = isDangerOutline || isAccentOutline;
  const grad = disabled && !isOutline
    ? ([colors.disabled, colors.disabled] as [string, string])
    : gradientFor[variant];
  const outlineColor = isAccentOutline ? colors.accent : colors.danger;

  const label = (
    <Text
      style={[
        styles.text,
        { fontSize: fontFor[size] },
        isOutline && { color: outlineColor },
        textStyle,
      ]}
    >
      {children}
    </Text>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.wrapper, style]}
    >
      <LinearGradient
        colors={grad}
        style={[
          styles.base,
          { paddingVertical: paddingFor[size], borderRadius: radiusFor[size] },
          isOutline && { borderWidth: 1, borderColor: outlineColor, backgroundColor: 'transparent' },
          disabled && isOutline && { opacity: 0.5 },
        ]}
      >
        {leftIcon ? (
          <View style={styles.iconRow}>
            {leftIcon}
            {label}
          </View>
        ) : (
          label
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    ...Platform.select({ web: { cursor: 'pointer' as any } }),
  },
  base: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
