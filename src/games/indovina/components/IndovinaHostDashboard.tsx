import React from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import { Button, colors, radius, spacing, fontSize } from '../../../core/ui';
import { IndovinaGameState, IndovinaPlayerState } from '../types';
import { endIndovinaGame } from '../services/indovinaLogic';

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

export default function IndovinaHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as IndovinaGameState;
  const roomId = roomData.id;
  const players = Object.entries(roomData.players || {});
  const playerCount = players.length;

  const isCollecting = gameState?.phase === 'collecting';
  const submittedCount = isCollecting
    ? players.filter(([, p]) => !!(p as IndovinaPlayerState).submittedWord).length
    : 0;

  const handleEndGame = () =>
    confirm(
      'Terminare la partita?',
      'La partita verrà chiusa per tutti i giocatori.',
      'Termina',
      () => endIndovinaGame(roomId),
      true
    );

  const statusText = isCollecting
    ? `${submittedCount}/${playerCount} parole inviate · ${gameState.phase}`
    : `${playerCount} giocatori · ${gameState?.phase ?? '-'}`;

  return (
    <View style={styles.wrapper}>
      <View style={styles.box}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Host</Text>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <Button onPress={handleEndGame} variant="dangerMuted">
          Termina
        </Button>
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
});
