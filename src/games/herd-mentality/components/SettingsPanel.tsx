import React from "react";
import { View } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, spacing } from "../../../core/ui";
import { HerdMentalitySettings } from "../types";
export default function SettingsPanel({
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const s = settings as HerdMentalitySettings;
  return (
    <View style={{ gap: spacing.md }}>
      <NumberSelector
        label="Domande"
        min={5}
        max={20}
        value={s?.rounds ?? 8}
        onChange={(rounds) => onSettingsChange({ rounds })}
      />
    </View>
  );
}
