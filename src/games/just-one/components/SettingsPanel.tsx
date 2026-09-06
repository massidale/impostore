import React from "react";
import { View, Text } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, SegmentedControl, colors, spacing } from "../../../core/ui";
import { JustOneSettings } from "../types";
export default function SettingsPanel({
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const s = settings as JustOneSettings;
  return (
    <View style={{ gap: spacing.md }}>
      <SegmentedControl
        value={s?.mode ?? "cooperative"}
        options={[
          { value: "cooperative", label: "Tutti insieme", description: "3–10 giocatori" },
          { value: "teams", label: "Due squadre", description: "4–10 giocatori" },
        ]}
        onChange={(mode) => onSettingsChange({ ...s, mode })}
      />
      <NumberSelector
        label={s?.mode === "teams" ? "Parole per squadra" : "Parole"}
        min={5}
        max={20}
        value={s?.rounds ?? 8}
        onChange={(rounds) => onSettingsChange({ ...s, rounds })}
      />
      <Text style={{ color: colors.textSecondary }}>
        {s?.mode === "teams"
          ? "Due squadre casuali ed equilibrate giocano contemporaneamente, ognuna con le proprie parole e un indovino a rotazione. Vince chi indovina più parole; è possibile pareggiare."
          : "Una parola per indizio. Tutti i duplicati vengono cancellati. Collaborate per indovinare le parole."}
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        Si usano le parole incluse nel gioco. Nelle squadre di due persone basta un indizio valido.
      </Text>
    </View>
  );
}
