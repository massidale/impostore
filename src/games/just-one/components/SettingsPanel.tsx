import { TeamSettings } from '../../../core/components/TeamSettings';
import {GuesserSelector} from '../../../core/components/GuesserSelector';
import React from "react";
import { View } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, SegmentedControl, spacing } from "../../../core/ui";
import { JustOneSettings } from "../types";
export default function SettingsPanel({
  settings,
  onSettingsChange,
  roomData,
}: SettingsPanelProps) {
  const s = settings as JustOneSettings;
  return (
    <View style={{ gap: spacing.md }}>
      <SegmentedControl
        value={s?.mode ?? "cooperative"}
        options={[
          { value: "cooperative", label: "Tutti insieme", description: "Almeno 3 giocatori" },
          { value: "teams", label: "Due squadre", description: "Almeno 4 giocatori" },
        ]}
        onChange={(mode) => onSettingsChange({ ...s, mode, rounds: mode === "teams" ? 8 : 1 })}
      />
      {s?.mode === "teams" ? <NumberSelector
        label="Parole per squadra"
        min={5}
        max={20}
        value={s?.rounds ?? 8}
        onChange={(rounds) => onSettingsChange({ ...s, rounds })}
      /> : <GuesserSelector roomData={roomData} value={s?.guesserUid} onChange={guesserUid => onSettingsChange({...s, guesserUid})} />}
      {s?.mode === "teams" && <TeamSettings players={roomData?.players} teamMode={s.teamMode} manualTeams={s.manualTeams} onChange={value => onSettingsChange({...s, ...value})} />}
    </View>
  );
}
