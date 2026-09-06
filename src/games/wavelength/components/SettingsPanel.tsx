import React from "react";
import { Text, View } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { Button, colors } from "../../../core/ui";
import { ContentEditor } from "../../../core/components/newGames/ContentEditor";
import { WavelengthSettings } from "../types";
export default function SettingsPanel({
  settings,
  onSettingsChange,
  roomId,
}: SettingsPanelProps) {
  const s = { cycles: 1, ...(settings as Partial<WavelengthSettings>) };
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.textPrimary }}>
        Giri completi: {s.cycles}. Tutti indovinano una volta per giro.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3].map((n) => (
          <Button
            key={n}
            variant={s.cycles === n ? "primary" : "secondary"}
            onPress={() => onSettingsChange({ cycles: n })}
          >
            {n}
          </Button>
        ))}
      </View>
      <Text style={{ color: colors.textSecondary }}>
        Un solo numero segreto da 1 a 10, uguale per tutti tranne l’indovino.
        Esatto: 2 punti; scarto di uno: 1 punto.
      </Text>
      <ContentEditor
        roomId={roomId}
        gameId="wavelength"
        example={
          '[{"id":"s1","text":"Se fosse un cibo, quale sarebbe per piccantezza?"}]'
        }
      />
    </View>
  );
}
