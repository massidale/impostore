import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import { Button, Card, colors, spacing, fontSize } from '../../../core/ui';
import { ImpostoreGameState } from '../types';
import { endImpostoreGame, startVoting } from '../services/impostoreLogic';

export default function ImpostoreHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as ImpostoreGameState;
  const roomId = roomData.id;

  const handleEndGame = () => endImpostoreGame(roomId);
  const handleStartVoting = () => startVoting(roomId);

  const getPlayerCount = () => Object.keys(roomData.players || {}).length;
  const getReadyCount = () =>
    Object.values(roomData.players || {}).filter((p) => (p as any).revealed).length;

  return (
    <Card style={{ padding: 15 }}>
      <Text style={styles.title}>Pannello Host: Impostore</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>Fase Attuale: {gameState.phase}</Text>
        <Text style={styles.statusText}>
          Pronti: {getReadyCount()} / {getPlayerCount()}
        </Text>
      </View>

      <View style={styles.actions}>
        {gameState.phase === 'playing' && (
          <Button onPress={handleStartVoting} variant="warning" style={styles.actionButton}>
            Vai alle Votazioni
          </Button>
        )}
        <Button onPress={handleEndGame} variant="danger" style={styles.actionButton}>
          Termina Partita
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm + 2,
    textTransform: 'uppercase',
  },
  statusBox: { marginBottom: 15 },
  statusText: { color: colors.textPrimary, fontSize: fontSize.md },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm + 2,
  },
  actionButton: { flex: 1 },
});
