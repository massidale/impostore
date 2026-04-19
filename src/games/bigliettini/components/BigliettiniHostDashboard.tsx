import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import { Button, Card, colors, spacing, fontSize } from '../../../core/ui';
import { BigliettiniGameState } from '../types';
import { endBigliettiniGame } from '../services/bigliettiniLogic';

export default function BigliettiniHostDashboard({ roomData }: HostDashboardProps) {
  const state = roomData.gameState as BigliettiniGameState;
  const roomId = roomData.id;

  const handleEnd = () => endBigliettiniGame(roomId);

  return (
    <Card style={{ padding: 15 }}>
      <Text style={styles.title}>Pannello Host: Bigliettini</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>Fase Attuale: {state.phase}</Text>
      </View>

      <Button onPress={handleEnd} variant="danger">
        Termina Partita
      </Button>
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
});
