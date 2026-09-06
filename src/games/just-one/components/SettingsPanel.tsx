import React from "react";
import { View, Text } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { NumberSelector, colors, spacing } from "../../../core/ui";
import { ContentEditor } from "../../../core/components/newGames/ContentEditor";
import { JustOneSettings } from "../types";
export default function SettingsPanel({
  settings,
  onSettingsChange,
  roomId,
}: SettingsPanelProps) {
  const s = settings as JustOneSettings;
  return (
    <View style={{ gap: spacing.md }}>
      <NumberSelector
        label="Parole"
        min={5}
        max={20}
        value={s?.rounds ?? 8}
        onChange={(rounds) => onSettingsChange({ rounds })}
      />
      <Text style={{ color: colors.textSecondary }}>
        3–10 giocatori · Una parola per indizio. Tutti i duplicati vengono
        cancellati. Collaborate per indovinare più parole possibile.
      </Text>
      <ContentEditor
        roomId={roomId}
        gameId="just-one"
        example={'["ombrello", "bicicletta", "montagna"]'}
      />
    </View>
  );
}
