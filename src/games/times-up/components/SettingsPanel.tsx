import React from "react";
import { Text, View } from "react-native";
import type { SettingsPanelProps } from "../../../core/types/gamePlugin";
import { Button, NumberSelector, colors } from "../../../core/ui";
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
}: SettingsPanelProps) {
  const s = { ...defaults, ...(settings as Partial<TimesUpSettings>) };
  const update = (v: Partial<TimesUpSettings>) =>
    onSettingsChange({ ...s, ...v, contentSource: "default" });
  const label = { color: colors.textPrimary };
  return (
    <View style={{ gap: 12 }}>
      <NumberSelector label="Carte" min={10} max={60} step={5} value={s.deckSize} onChange={(deckSize) => update({ deckSize })} />
      <NumberSelector label="Durata turno (secondi)" min={30} max={90} step={5} value={s.turnSeconds} onChange={(turnSeconds) => update({ turnSeconds })} />
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
    </View>
  );
}
