import React from 'react';
import { View, Text } from 'react-native';
import { PhaseCard, PlayerSlot, colors, fonts, spacing } from '../ui';

export function TeamRosterCard({ name, uids, players, detail, color }: {
  name: string; uids: string[]; players: Record<string, { name?: string }>;
  detail?: string; color?: string;
}) {
  return <PhaseCard compact>
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: color ?? colors.textPrimary, fontFamily: fonts.bodySemi, fontSize: 14 }}>{name}</Text>
      {detail && <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{detail}</Text>}
      {uids.map(uid => <PlayerSlot key={uid} uid={uid} name={players[uid]?.name ?? 'Giocatore'} compact subtitle={null} />)}
    </View>
  </PhaseCard>;
}
