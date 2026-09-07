import React from "react";
import { View } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector } from "../../../core/ui";
import { CheDomandaSettings } from "../types";
export default function SettingsPanel({
  settings,
  onSettingsChange,
  roomId,
  roomData,
}: SettingsPanelProps) {
  const s = {
    numImpostors: 1,
    votingSeconds: 60,
    ...(settings as Partial<CheDomandaSettings>),
  };
  const max = Math.max(
    1,
    Math.floor(
      ((roomData ? Object.keys(roomData.players ?? {}).length : 3) - 1) / 2,
    ),
  );
  return (
    <View style={{ gap: 12 }}>
      <NumberSelector label="Numero di Impostori" value={s.numImpostors} min={1} max={max}
        onChange={numImpostors => onSettingsChange({...s, numImpostors})} />

    </View>
  );
}
