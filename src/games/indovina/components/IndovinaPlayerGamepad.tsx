import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import { colors, radius, spacing, fontSize } from '../../../core/ui';
import { IndovinaGameState } from '../types';

export default function IndovinaPlayerGamepad({ roomData }: PlayerGamepadProps) {
  const state = roomData.gameState as IndovinaGameState;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Indovina la parola</Text>
      <View style={styles.card}>
        <Text style={styles.text}>Gioco in sviluppo 🚧</Text>
        <Text style={styles.subtext}>Fase: {state.phase}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    flex: 1,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
