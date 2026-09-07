import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from '../ui';

interface Props {
  name?: string | null;
  isMe?: boolean;
  roleLabel?: string;
}

/** Shared announcement for games whose conversation starts with one player. */
export function FirstPlayerCard({ name, isMe = false, roleLabel = "il primo giocatore" }: Props) {
  if (!name) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.message}>
        <Text style={styles.name}>{name}{isMe ? ' (tu)' : ''}</Text>
        {` è ${roleLabel}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  message: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
  },
});
