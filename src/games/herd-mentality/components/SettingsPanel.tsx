import React from "react";
import { View, Text } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, colors, spacing } from "../../../core/ui";
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
      <Text style={{ color: colors.textSecondary }}>
        3–12 giocatori · Cerca la risposta più popolare. Confrontate le risposte e scoprite chi ha pensato come il gruppo.
      </Text>
    </View>
  );
}
