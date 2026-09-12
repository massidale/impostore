import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, spacing } from './theme';
import { MetadataBadge } from './MetadataBadge';

interface MetaRowProps {
  roomId: string;
  players: number;
  /** Nome del gioco, centrato tra stanza e giocatori. */
  gameName?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * In-flow header row: room code on the left, game name centered, player
 * count on the right.  Unlike MetaCorner it is part of the normal layout,
 * so it scrolls away with the page instead of staying pinned.
 */
export function MetaRow({ roomId, players, gameName, style }: MetaRowProps) {
  return (
    <View style={[styles.row, style]}>
      <MetadataBadge label="Stanza" value={roomId} />
      {gameName ? (
        <Text style={styles.gameName} numberOfLines={1} ellipsizeMode="tail">
          {gameName}
        </Text>
      ) : null}
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
  gameName: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.md,
    marginHorizontal: spacing.sm,
    marginTop: 2,
  },
});
