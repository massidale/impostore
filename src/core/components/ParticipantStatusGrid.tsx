import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckIcon, colors, spacing } from '../ui';
import { ParticipantTile } from './ParticipantTile';

interface Props {
  participantUids: string[];
  completedUids?: string[];
  players: Record<string, { name?: string }>;
  completedLabel?: string;
}

/** Public progress only: never accepts answers, clues or secret roles. */
export function ParticipantStatusGrid({ participantUids, completedUids = [], players, completedLabel = 'Ha risposto' }: Props) {
  const completed = new Set(completedUids);
  return <View style={styles.grid}>
    {participantUids.map(uid => {
      const name = players[uid]?.name || 'Giocatore';
      const ready = completed.has(uid);
      return <ParticipantTile key={uid} uid={uid} name={name} accessibilityLabel={`${name}: ${ready ? completedLabel : 'In attesa'}`}>
        <View style={styles.status}>
          {ready ? <CheckIcon size={16} color={colors.success} /> : <Text style={styles.waiting}>···</Text>}
        </View>
      </ParticipantTile>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  status: { height: 18, alignItems: 'center', justifyContent: 'center' },
  waiting: { color: colors.textMuted, fontSize: 18, lineHeight: 18 },
});
