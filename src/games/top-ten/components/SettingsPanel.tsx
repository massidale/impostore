import React from "react";
import { View } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, spacing } from "../../../core/ui";
export default function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  return <View style={{ gap: spacing.md }}>
    <NumberSelector label="Temi" min={3} max={10} value={(settings as { rounds?: number } | undefined)?.rounds ?? 5} onChange={(rounds) => onSettingsChange({ rounds })} />
  </View>;
}
