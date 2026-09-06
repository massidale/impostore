import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import { NumberSelector, colors, fonts, spacing, fontSize } from '../../../core/ui';

export interface ImpostoreSettings {
  numImpostors: number;
  numClowns: number;
  hintEnabled: boolean;
  hintOnlyFirst: boolean;
  votingSeconds: number;
}

export default function ImpostoreSettingsPanel({ settings, onSettingsChange, roomId }: SettingsPanelProps) {
  const s = settings as ImpostoreSettings;

  const update = (partial: Partial<ImpostoreSettings>) => {
    onSettingsChange({ ...s, ...partial });
  };

  return (
    <View>
      <NumberSelector
        label="Numero di Impostori"
        value={s.numImpostors}
        onChange={(v) => update({ numImpostors: v })}
        min={1}
      />

      <NumberSelector
        label="Numero di Pagliacci"
        value={s.numClowns}
        onChange={(v) => update({ numClowns: v })}
        min={0}
        style={{ marginTop: spacing.lg }}
      />

      <NumberSelector
        label="Durata votazione (secondi)"
        value={s.votingSeconds ?? 60}
        onChange={(v) => update({ votingSeconds: v })}
        min={15}
        max={300}
        step={15}
        style={{ marginTop: spacing.lg }}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Abilita indizi</Text>
        <Switch value={s.hintEnabled} onValueChange={(v) => update({ hintEnabled: v })} />
      </View>

      {s.hintEnabled && (
        <View style={styles.nestedContainer}>
          <View style={styles.nestedRow}>
            <Text style={styles.nestedLabel}>Indizio solo al primo giocatore</Text>
            <Switch value={s.hintOnlyFirst} onValueChange={(v) => update({ hintOnlyFirst: v })} />
          </View>
        </View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
  },
  nestedContainer: {
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    marginLeft: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  nestedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  nestedLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
});
