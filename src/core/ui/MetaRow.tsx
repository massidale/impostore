import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { spacing } from './theme';
import { MetadataBadge } from './MetadataBadge';

interface MetaRowProps {
  roomId: string;
  players: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * In-flow header row: room code on the left, player count on the right.
 * Unlike MetaCorner it is part of the normal layout, so it scrolls away
 * with the page instead of staying pinned.
 */
export function MetaRow({ roomId, players, style }: MetaRowProps) {
  return (
    <View style={[styles.row, style]}>
      <MetadataBadge label="Stanza" value={roomId} />
      <MetadataBadge label="Giocatori" value={String(players)} align="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
});
