import React from 'react';
import {View} from 'react-native';
import type {CoreRoom} from '../types/room';
import {SectionHeader, PlayerSlot, CheckIcon, colors} from '../ui';

export function GuesserSelector({roomData, value, onChange}: {
  roomData?: CoreRoom; value?: string | null; onChange: (uid:string)=>void;
}) {
  const players = Object.entries(roomData?.players ?? {});
  const selected = players.some(([uid]) => uid === value) ? value : players[0]?.[0];
  return <View>
    <SectionHeader label="Chi indovina?" hint="Alla fine della partita passa automaticamente al giocatore successivo." />
    {players.map(([uid, player]) => <PlayerSlot key={uid} uid={uid} name={player.name ?? 'Giocatore'} subtitle={null}
      variant={uid === selected ? 'selected' : 'default'}
      right={uid === selected ? <CheckIcon color={colors.primaryLight} size={20} /> : undefined}
      onPress={() => onChange(uid)} />)}
  </View>;
}
