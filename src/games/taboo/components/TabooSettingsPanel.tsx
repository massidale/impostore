import React from 'react';
import { View } from 'react-native';
import { TeamSettings } from '../../../core/components/TeamSettings';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import { NumberSelector, spacing } from '../../../core/ui';
import { TabooSettings, TeamMode } from '../types';


export default function TabooSettingsPanel({
  settings,
  onSettingsChange,
  roomData,
}: SettingsPanelProps) {
  const s = (settings || {}) as TabooSettings;
  const turnSeconds = s.turnSeconds ?? 60;
  const turnsPerTeam = s.turnsPerTeam ?? 3;
  const maxSkips = s.maxSkips ?? 3;
  const teamMode: TeamMode = s.teamMode ?? 'auto';
  const manualTeams = s.manualTeams ?? {};

  const update = (partial: Partial<TabooSettings>) => {
    onSettingsChange({
      turnSeconds,
      turnsPerTeam,
      maxSkips,
      teamMode,
      manualTeams,
      ...partial,
    } satisfies TabooSettings);
  };

  return (
    <View>
      <NumberSelector
        label="Durata turno (secondi)"
        value={turnSeconds}
        onChange={(v) => update({ turnSeconds: v })}
        min={30}
        max={180}
        step={15}
      />

      <NumberSelector
        label="Turni per squadra"
        value={turnsPerTeam}
        onChange={(v) => update({ turnsPerTeam: v })}
        min={1}
        max={10}
        style={{ marginTop: spacing.lg }}
      />

      <NumberSelector
        label="Passi per turno"
        value={maxSkips}
        onChange={(v) => update({ maxSkips: v })}
        min={0}
        max={10}
        style={{ marginTop: spacing.lg }}
      />

      <TeamSettings players={roomData?.players} teamMode={teamMode} manualTeams={manualTeams} onChange={update} />
    </View>
  );
}
