import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import { colors, fontSize, spacing } from '../../../core/ui';

export default function IndovinaSettingsPanel(_props: SettingsPanelProps) {
  return (
    <View>
      <Text style={styles.placeholder}>
        Nessuna impostazione disponibile per ora.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
});
