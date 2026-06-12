import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

interface GameRulesProps {
  rules: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Collapsible "Regole" section used in the settings sheets. A plain
 * expandable card (no nested modal — sheets-in-sheets are fragile on
 * native), closed by default.
 */
export function GameRules({ rules, style }: GameRulesProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        style={styles.headerRow}
        accessibilityLabel={open ? 'Nascondi regole' : 'Mostra regole'}
      >
        <Text style={styles.title}>Regole</Text>
        <Text style={styles.chevron}>{open ? '−' : '+'}</Text>
      </TouchableOpacity>
      {open ? <Text style={styles.body}>{rules}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.displaySemi,
    fontSize: fontSize.md,
  },
  chevron: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginTop: spacing.md,
  },
});
