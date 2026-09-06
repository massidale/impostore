import React from "react";
import { Text, View } from "react-native";
import type { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { Button, colors } from "../../../core/ui";
import { ContentEditor } from "../../../core/components/newGames/ContentEditor";
import type { TopTenSettings } from "../types";
export default function SettingsPanel({
  settings,
  onSettingsChange,
  roomId,
}: SettingsPanelProps) {
  const rounds = (settings as TopTenSettings)?.rounds ?? 5;
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.textPrimary }}>
        Temi: {rounds} · 4–10 giocatori · capitano incluso
      </Text>
      <View style={{ gap: 8 }}>
        <Button
          disabled={rounds <= 3}
          onPress={() => onSettingsChange({ rounds: rounds - 1 })}
        >
          − Tema
        </Button>
        <Button
          disabled={rounds >= 10}
          onPress={() => onSettingsChange({ rounds: rounds + 1 })}
        >
          + Tema
        </Button>
      </View>
      <ContentEditor
        roomId={roomId}
        gameId="top-ten"
        example={
          '[{"prompt":"Inventa un saluto","lowLabel":"timido","highLabel":"esuberante"}]'
        }
      />
    </View>
  );
}
