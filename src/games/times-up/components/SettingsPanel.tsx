import React from "react";
import { Text, View } from "react-native";
import type { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { Button, colors } from "../../../core/ui";
import { ContentEditor } from "../../../core/components/newGames/ContentEditor";
import type { TimesUpSettings } from "../types";
export const defaults: TimesUpSettings = {
  turnSeconds: 45,
  deckSize: 30,
  teamMode: "auto",
  manualTeams: null,
  contentSource: "default",
};
export default function SettingsPanel({
  settings,
  onSettingsChange,
  roomData,
  roomId,
}: SettingsPanelProps) {
  const s = { ...defaults, ...(settings as Partial<TimesUpSettings>) };
  const update = (v: Partial<TimesUpSettings>) =>
    onSettingsChange({ ...s, ...v });
  const label = { color: colors.textPrimary };
  return (
    <View style={{ gap: 12 }}>
      <Text style={label}>
        Carte: {s.deckSize} · Tre round con lo stesso mazzo
      </Text>
      <View style={{ gap: 8 }}>
        <Button
          disabled={s.deckSize <= 10}
          onPress={() => update({ deckSize: s.deckSize - 5 })}
        >
          − 5 carte
        </Button>
        <Button
          disabled={s.deckSize >= 60}
          onPress={() => update({ deckSize: s.deckSize + 5 })}
        >
          + 5 carte
        </Button>
      </View>
      <Text style={label}>Turno: {s.turnSeconds} secondi</Text>
      <View style={{ gap: 8 }}>
        <Button
          disabled={s.turnSeconds <= 30}
          onPress={() => update({ turnSeconds: s.turnSeconds - 5 })}
        >
          − 5 s
        </Button>
        <Button
          disabled={s.turnSeconds >= 90}
          onPress={() => update({ turnSeconds: s.turnSeconds + 5 })}
        >
          + 5 s
        </Button>
      </View>
      <Text style={label}>
        Composizione squadre: {s.teamMode === "auto" ? "Casuale" : "Manuale"}
      </Text>
      <Button
        variant="secondary"
        onPress={() =>
          update({ teamMode: s.teamMode === "auto" ? "manual" : "auto" })
        }
      >
        Cambia composizione
      </Button>
      {s.teamMode === "manual" && (
        <>
          <Text style={label}>
            Assegna tutti i giocatori: almeno 2 per squadra.
            {!roomData ? " Potrai farlo dopo aver creato la stanza." : ""}
          </Text>
          {Object.entries(roomData?.players ?? {}).map(([id, p]) => (
            <View key={id} style={{ gap: 6 }}>
              <Text style={label}>
                {p.name}:{" "}
                {s.manualTeams?.[id] === "blue"
                  ? "Blu"
                  : s.manualTeams?.[id] === "red"
                    ? "Rossa"
                    : "da assegnare"}
              </Text>
              <View style={{ gap: 8 }}>
                <Button
                  onPress={() =>
                    update({ manualTeams: { ...s.manualTeams, [id]: "blue" } })
                  }
                >
                  Blu
                </Button>
                <Button
                  onPress={() =>
                    update({ manualTeams: { ...s.manualTeams, [id]: "red" } })
                  }
                >
                  Rossa
                </Button>
              </View>
            </View>
          ))}
        </>
      )}
      <Text style={label}>
        Nomi:{" "}
        {s.contentSource === "default"
          ? "Predefiniti"
          : s.contentSource === "custom"
            ? "Personalizzati"
            : "Contributi privati dei giocatori"}
      </Text>
      {(["default", "custom", "players"] as const).map((source, i) => (
        <Button
          key={source}
          variant={s.contentSource === source ? "primary" : "secondary"}
          onPress={() => update({ contentSource: source })}
        >
          {["Predefiniti", "Personalizzati", "Scritti dai giocatori"][i]}
        </Button>
      ))}
      {s.contentSource === "custom" && (
        <>
          <Text style={label}>
            Carica almeno {s.deckSize} nomi distinti nella stanza prima di
            avviare.
          </Text>
          <ContentEditor
            roomId={roomId}
            gameId="times-up"
            example={'["Leonardo da Vinci","Pinocchio"]'}
            title="Carica nomi personalizzati"
          />
        </>
      )}
    </View>
  );
}
