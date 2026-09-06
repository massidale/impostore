import { TeamSettings } from '../../../core/components/TeamSettings';
import React from "react";
import { View } from "react-native";
import type { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector } from "../../../core/ui";
import type { TimesUpSettings } from "../types";
export const defaults: TimesUpSettings = {
  turnSeconds: 45,
  deckSize: 30,
  teamMode: "auto",
  manualTeams: null,
  contentSource: "default",
};
export default function SettingsPanel({
  settings,
  onSettingsChange,
  roomData,
}: SettingsPanelProps) {
  const s = { ...defaults, ...(settings as Partial<TimesUpSettings>) };
  const update = (v: Partial<TimesUpSettings>) =>
    onSettingsChange({ ...s, ...v, contentSource: "default" });
  return (
    <View style={{ gap: 12 }}>
      <NumberSelector label="Carte" min={10} max={60} step={5} value={s.deckSize} onChange={(deckSize) => update({ deckSize })} />
      <NumberSelector label="Durata turno (secondi)" min={30} max={90} step={5} value={s.turnSeconds} onChange={(turnSeconds) => update({ turnSeconds })} />
      <TeamSettings players={roomData?.players} teamMode={s.teamMode} manualTeams={s.manualTeams} onChange={update} />
    </View>
  );
}
