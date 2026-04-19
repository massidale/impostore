import React from 'react';
import {
  TouchableOpacity,
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
  | 'danger'
  | 'dangerOutline'
  | 'accent';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const gradientFor: Record<ButtonVariant, [string, string]> = {
  primary: [colors.primary, colors.primaryDark],
  success: [colors.success, colors.successDark],
  secondary: [colors.surfaceAlt, colors.surfaceAlt],
  warning: [colors.warning, colors.warning],
  danger: [colors.danger, colors.danger],
  accent: [colors.accent, colors.accent],
  dangerOutline: ['transparent', 'transparent'],
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
}: ButtonProps) {
  const grad = disabled
    ? ([colors.disabled, colors.disabled] as [string, string])
    : gradientFor[variant];
  const isOutline = variant === 'dangerOutline';

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
          isOutline && styles.outline,
        ]}
      >
        <Text
          style={[
            styles.text,
            { fontSize: fontFor[size] },
            isOutline && styles.outlineText,
            textStyle,
          ]}
        >
          {children}
        </Text>
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
  outline: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
  },
  text: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  outlineText: {
    color: colors.danger,
  },
});
