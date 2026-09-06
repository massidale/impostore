import React from 'react';
import {View, Text} from 'react-native';
import {SettingsPanelProps} from '../../../core/types/gamePlugin';
import {GuesserSelector} from '../../../core/components/GuesserSelector';
import {colors, spacing} from '../../../core/ui';
import type {WavelengthSettings} from '../types';
export default function SettingsPanel({settings, onSettingsChange, roomData}: SettingsPanelProps) {
  const s = (settings ?? {}) as WavelengthSettings;
  return <View style={{gap:spacing.md}}>
    <GuesserSelector roomData={roomData} value={s.guesserUid} onChange={guesserUid => onSettingsChange({...s, guesserUid})} />
    <Text style={{color:colors.textSecondary}}>Un numero da indovinare per partita. Con “Gioca ancora” continuate nella stessa stanza.</Text>
  </View>;
}
