import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, fontSize } from './theme';

interface NumberSelectorProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function NumberSelector({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  label,
  style,
}: NumberSelectorProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.selector}>
        <TouchableOpacity
          onPress={dec}
          disabled={atMin}
          style={[styles.button, atMin && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{value}</Text>
        <TouchableOpacity
          onPress={inc}
          disabled={atMax}
          style={[styles.button, atMax && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    marginBottom: spacing.sm + 2,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: colors.surfaceAlt,
    padding: 15,
    borderRadius: radius.sm,
    width: 50,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg + 2,
    fontWeight: 'bold',
  },
  value: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginHorizontal: spacing.xl,
  },
});
