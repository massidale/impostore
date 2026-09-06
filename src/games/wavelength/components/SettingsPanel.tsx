import React from "react";
import { View, Text } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, colors, spacing } from "../../../core/ui";
export default function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  return <View style={{ gap: spacing.md }}>
    <NumberSelector label="Giri completi" min={1} max={3} value={(settings as { cycles?: number } | undefined)?.cycles ?? 1} onChange={(cycles) => onSettingsChange({ cycles })} />
    <Text style={{ color: colors.textSecondary }}>Tutti indovinano una volta per giro.</Text>
  </View>;
}
