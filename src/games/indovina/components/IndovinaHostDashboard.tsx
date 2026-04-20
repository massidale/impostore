import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import { Button, Card, colors, spacing, fontSize } from '../../../core/ui';
import { IndovinaGameState } from '../types';
import { endIndovinaGame } from '../services/indovinaLogic';

export default function IndovinaHostDashboard({ roomData }: HostDashboardProps) {
  const state = roomData.gameState as IndovinaGameState;
  const roomId = roomData.id;

  const handleEnd = () => endIndovinaGame(roomId);

  return (
    <Card style={{ padding: 15 }}>
      <Text style={styles.title}>Pannello Host: Indovina la parola</Text>

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
