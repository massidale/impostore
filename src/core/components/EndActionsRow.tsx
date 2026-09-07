import React, { ComponentProps } from 'react';
import { View } from 'react-native';
import { EndActionButton } from './EndActionButton';
import { spacing } from '../ui/theme';

type Action = Omit<ComponentProps<typeof EndActionButton>, 'kind' | 'style'>;
interface Props {
  game: Action;
  round?: Action & { kind?: 'round' | 'turn' };
}

/** Shared closure commands, with independent confirmations and equal widths. */
export function EndActionsRow({ game, round }: Props) {
  return <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%', minWidth: 0 }}>
    {round && <View style={{ flex: 1, minWidth: 0 }}><EndActionButton {...round} kind={round.kind ?? 'round'} /></View>}
    <View style={{ flex: 1, minWidth: 0 }}><EndActionButton {...game} kind="game" /></View>
  </View>;
}
