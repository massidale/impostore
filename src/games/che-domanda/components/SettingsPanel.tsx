import React from "react";
import { Text, View } from "react-native";
import { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { Button, colors } from "../../../core/ui";
import { ContentEditor } from "../../../core/components/newGames/ContentEditor";
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
      <Text style={{ color: colors.textPrimary }}>
        Impostori: {s.numImpostors} (massimo {max} con i partecipanti attuali)
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          disabled={s.numImpostors <= 1}
          onPress={() =>
            onSettingsChange({ ...s, numImpostors: s.numImpostors - 1 })
          }
        >
          −
        </Button>
        <Button
          disabled={s.numImpostors >= max}
          onPress={() =>
            onSettingsChange({ ...s, numImpostors: s.numImpostors + 1 })
          }
        >
          +
        </Button>
      </View>
      <Text style={{ color: colors.textSecondary }}>
        Rispondete con un numero. Alcuni ricevono una domanda simile: scopriteli
        discutendo le risposte. Voto: 60 secondi; ballottaggio: 30 secondi.
      </Text>
      <ContentEditor
        roomId={roomId}
        gameId="che-domanda"
        example={
          '[{"id":"q1","question":"Quante tazze hai?","alternateQuestion":"Quanti bicchieri hai?","min":0,"max":100,"decimals":0}]'
        }
      />
    </View>
  );
}
