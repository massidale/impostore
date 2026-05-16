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
import { IndovinaGameState, IndovinaPlayerState } from '../types';
import { endIndovinaGame } from '../services/indovinaLogic';
import { getWaitingPlayerUids } from '../../../core/services/playerSelection';
import type { CorePlayer } from '../../../core/types/room';

export default function IndovinaHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as IndovinaGameState;
  const roomId = roomData.id;
  const allPlayers = roomData.players || {};
  const activeEntries = Object.entries(allPlayers).filter(
    ([, p]) => !(p as CorePlayer).waiting
  );
  const playerCount = activeEntries.length;

  const isCollecting = gameState?.phase === 'collecting';
  const submittedCount = isCollecting
    ? activeEntries.filter(([, p]) => !!(p as IndovinaPlayerState).submittedWord).length
    : 0;

  const waitingUids = getWaitingPlayerUids(roomData);
  const waitingNames = waitingUids
    .map((uid) => (allPlayers[uid] as CorePlayer | undefined)?.name)
    .filter((n): n is string => !!n && n.length > 0);

  const handleEndGame = async () => {
    const ok = await confirmDialog({
      title: 'Terminare la partita?',
      message: 'La partita verrà chiusa per tutti i giocatori.',
      confirmLabel: 'Termina',
      destructive: true,
    });
    if (ok) endIndovinaGame(roomId);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Host · Indovina</Text>
        {isCollecting ? (
          <ProgressCounter
            prefix="Parole"
            completed={submittedCount}
            total={playerCount}
            tone="primary"
          />
        ) : (
          <ProgressCounter
            prefix="Giocatori"
            completed={playerCount}
            total={playerCount}
            tone="primary"
          />
        )}
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
        <Button onPress={handleEndGame} variant="dangerMuted" style={{ flex: 1 }}>
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
