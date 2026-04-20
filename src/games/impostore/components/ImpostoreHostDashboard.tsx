import React from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import { Button, colors, radius, spacing, fontSize } from '../../../core/ui';
import { ImpostoreGameState } from '../types';
import { endImpostoreGame, startVoting } from '../services/impostoreLogic';

function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = false
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annulla', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

export default function ImpostoreHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as ImpostoreGameState;
  const roomId = roomData.id;

  const handleStartVoting = () =>
    confirm(
      'Avviare le votazioni?',
      'I giocatori non potranno più vedere i loro ruoli e dovranno votare chi eliminare.',
      'Avvia votazioni',
      () => startVoting(roomId)
    );

  const handleEndGame = () =>
    confirm(
      'Terminare la partita?',
      'La partita verrà chiusa per tutti i giocatori. Questa azione non può essere annullata.',
      'Termina',
      () => endImpostoreGame(roomId),
      true
    );

  const getPlayerCount = () => Object.keys(roomData.players || {}).length;
  const getReadyCount = () =>
    Object.values(roomData.players || {}).filter((p) => (p as any).revealed).length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.box}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Host</Text>
          <Text style={styles.statusText}>
            Pronti {getReadyCount()}/{getPlayerCount()} · {gameState.phase}
          </Text>
        </View>

        <View style={styles.actions}>
          {gameState.phase === 'playing' && (
            <Button onPress={handleStartVoting} variant="warningMuted" style={styles.actionButton}>
              Vai al Voto
            </Button>
          )}
          <Button onPress={handleEndGame} variant="dangerMuted" style={styles.actionButton}>
            Termina Partita
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  actionButton: { flex: 1 },
});
