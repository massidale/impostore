import React from "react";
import { View, Text } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, colors, spacing } from "../../../core/ui";
export default function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  return <View style={{ gap: spacing.md }}>
    <NumberSelector label="Temi" min={3} max={10} value={(settings as { rounds?: number } | undefined)?.rounds ?? 5} onChange={(rounds) => onSettingsChange({ rounds })} />
    <Text style={{ color: colors.textSecondary }}>4–10 giocatori · capitano incluso.</Text>
  </View>;
}
