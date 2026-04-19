import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getAllGames } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import { colors, radius, spacing, fontSize } from '../ui';

interface GameSelectorProps {
  selectedId: string;
  onSelect: (game: GamePlugin) => void;
  label?: string;
}

export default function GameSelector({ selectedId, onSelect, label = 'Seleziona Gioco' }: GameSelectorProps) {
  const games = getAllGames();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.list}>
        {games.map((game) => {
          const selected = selectedId === game.id;
          return (
            <TouchableOpacity
              key={game.id}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => onSelect(game)}
            >
              <Text style={[styles.cardText, selected && styles.cardTextSelected]}>
                {game.name}
              </Text>
              <Text style={styles.cardMeta}>{game.minPlayers}+ giocatori</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    marginBottom: spacing.sm + 2,
  },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    flex: 1,
    minWidth: 120,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#1e3a5f',
  },
  cardText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  cardTextSelected: { color: '#60a5fa' },
  cardMeta: { color: colors.textSecondary, fontSize: fontSize.xs },
});
