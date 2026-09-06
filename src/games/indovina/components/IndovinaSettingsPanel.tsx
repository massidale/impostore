import React from 'react';
import { Text } from 'react-native';
import { colors, fonts } from '../../../core/ui';
export default function IndovinaSettingsPanel() {
  return <Text style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Le parole vengono scelte dal mazzo del gioco e distribuite a caso.</Text>;
}
