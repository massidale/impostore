import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import {
  Button,
  HostActionFooter,
  ProgressCounter,
  colors,
  confirmDialog,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../../../core/ui';
import { ImpostoreGameState } from '../types';
import { endImpostoreGame, startVoting } from '../services/impostoreLogic';
import { getWaitingPlayerUids } from '../../../core/services/playerSelection';
import type { CorePlayer } from '../../../core/types/room';

export default function ImpostoreHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as ImpostoreGameState;
  const roomId = roomData.id;

  const handleStartVoting = async () => {
    const ok = await confirmDialog({
      title: 'Avviare le votazioni?',
      message:
        'I giocatori non potranno più vedere i loro ruoli e dovranno votare chi eliminare.',
      confirmLabel: 'Avvia votazioni',
    });
    if (ok) startVoting(roomId);
  };

  const handleEndGame = async () => {
    const ok = await confirmDialog({
      title: 'Terminare la partita?',
      message:
        'La partita verrà chiusa per tutti i giocatori. Questa azione non può essere annullata.',
      confirmLabel: 'Termina',
      destructive: true,
    });
    if (ok) endImpostoreGame(roomId);
  };

  const allPlayers = roomData.players || {};
  const waitingUids = getWaitingPlayerUids(roomData);
  const playerCount = Object.keys(allPlayers).length - waitingUids.length;
  const readyCount = Object.entries(allPlayers).filter(
    ([, p]) => !(p as CorePlayer).waiting && (p as { revealed?: boolean }).revealed
  ).length;

  const waitingNames = waitingUids
    .map((uid) => (allPlayers[uid] as CorePlayer | undefined)?.name)
    .filter((n): n is string => !!n && n.length > 0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Host · Impostore</Text>
        <ProgressCounter
          prefix="Pronti"
          completed={readyCount}
          total={playerCount}
          tone="primary"
        />
      </View>

      {waitingNames.length > 0 && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingBadge}>In attesa</Text>
          <Text style={styles.waitingNames} numberOfLines={2}>
            {waitingNames.join(', ')}
          </Text>
        </View>
      )}

      <HostActionFooter>
        {gameState.phase === 'playing' && (
          <Button onPress={handleStartVoting} variant="warningMuted" style={styles.actionButton}>
            Vai al Voto
          </Button>
        )}
        <Button onPress={handleEndGame} variant="dangerMuted" style={styles.actionButton}>
          Termina
        </Button>
      </HostActionFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  actionButton: { flex: 1 },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  waitingBadge: {
    color: colors.warning,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  waitingNames: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
});
