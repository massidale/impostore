import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getAllGames } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import { Button, Card, colors, radius, spacing, fontSize } from '../ui';

interface GamePickerModalProps {
  visible: boolean;
  selectedId: string;
  onSelect: (game: GamePlugin) => void;
  onClose: () => void;
  helperText?: string;
}

export default function GamePickerModal({
  visible,
  selectedId,
  onSelect,
  onClose,
  helperText,
}: GamePickerModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <ScrollView contentContainerStyle={styles.modalScrollContent}>
        <Card>
          <Text style={styles.modalTitle}>Seleziona gioco</Text>
          {helperText ? (
            <Text style={styles.helper}>{helperText}</Text>
          ) : null}

          <View style={styles.list}>
            {getAllGames().map((game) => {
              const selected = game.id === selectedId;
              return (
                <TouchableOpacity
                  key={game.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(game);
                    onClose();
                  }}
                  style={[styles.card, selected && styles.cardSelected]}
                >
                  <View style={styles.header}>
                    <Text style={styles.emoji}>{game.icon || '🎲'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{game.name}</Text>
                      <Text style={styles.meta}>
                        {game.minPlayers}+ giocatori
                      </Text>
                    </View>
                    {selected && (
                      <Text style={styles.selectedTag}>ATTIVO</Text>
                    )}
                  </View>
                  {game.description ? (
                    <Text style={styles.description}>{game.description}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <Button
            onPress={onClose}
            variant="secondary"
            style={{ marginTop: spacing.xl }}
          >
            Annulla
          </Button>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  helper: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  emoji: { fontSize: 36 },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  selectedTag: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
