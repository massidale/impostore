import React from 'react';
import { View, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { colors, spacing } from './theme';
import { CheckIcon, XIcon } from './icons';

interface InlineConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Compact ✓ / ✕ pair shown next to a tapped row (votes, night picks):
 * confirms the choice in place instead of a modal dialog.
 */
export function InlineConfirm({ onConfirm, onCancel }: InlineConfirmProps) {
  // The pair often sits inside a touchable row (PlayerSlot): without
  // stopPropagation the tap would ALSO fire the row's onPress on web,
  // re-opening the pending state right after confirming/cancelling.
  const handle = (fn: () => void) => (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    fn();
  };
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={handle(onConfirm)}
        style={[styles.circle, styles.confirm]}
        accessibilityLabel="Conferma"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <CheckIcon size={16} color={colors.background} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handle(onCancel)}
        style={[styles.circle, styles.cancel]}
        accessibilityLabel="Annulla"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <XIcon size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: {
    backgroundColor: colors.success,
  },
  cancel: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
