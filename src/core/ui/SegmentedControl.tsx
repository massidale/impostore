import { ButtonLabel } from './ButtonLabel';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional second line under the label. */
  description?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

/**
 * Equal-width segmented selector. With `description` set it renders as
 * tall option cards (settings); without it, as a compact toggle.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
            style={[
              styles.segment,
              !opt.description && styles.segmentCompact,
              compact && { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
              active && styles.segmentActive,
            ]}
          >
            <ButtonLabel style={[styles.label, active && styles.labelActive]}>{opt.label}</ButtonLabel>
            {opt.description ? (
              <Text style={[styles.description, active && styles.descriptionActive]}>
                {opt.description}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentCompact: {
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  label: {
    maxWidth: '100%',
    color: colors.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.sm,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.textPrimary,
  },
  description: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  descriptionActive: {
    color: colors.textSecondary,
  },
});
