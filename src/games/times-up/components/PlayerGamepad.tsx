import React, { useState, useEffect } from "react";
import { Text, View } from "react-native";
import type { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { Button, Input, colors, fonts } from "../../../core/ui";
import { sendAction } from "../services/timesUpLogic";
import type { TimesUpSettings, TimesUpView } from "../types";
const rules = [
  "Descrivi liberamente",
  "Una sola parola",
  "Solo mimo, senza suoni",
];
export default function PlayerGamepad({
  roomData,
  playerId,
}: PlayerGamepadProps) {
  const s = roomData.gameState as unknown as TimesUpView;
  const [names, setNames] = useState((s.ownNames ?? []).join("\n")),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setNames((s.ownNames ?? []).join("\n"));
    setError(null);
  }, [roomData.matchId]);
  const run = async (action: string, payload: unknown = {}) => {
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action, payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Riprova");
    } finally {
      setBusy(false);
    }
  };
  const actor = s.describerUid === playerId,
    participant = s.participantUids?.includes(playerId);
  const label = { color: colors.textPrimary, fontSize: 18 };
  const remaining = s.deadline
    ? Math.max(0, Math.ceil((s.deadline - now) / 1000))
    : 0;
  const name = (id: string) => roomData.players?.[id]?.name ?? id;
  const content = (
    <View
      style={{
        padding: 24,
        gap: 16,
        borderRadius: 20,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      <Text style={{ ...label, fontFamily: fonts.displayHeavy, fontSize: 28 }}>
        {rules[s.roundNumber - 1]}
      </Text>
      {s.phase === "turn" && (
        <>
          <Text style={{ ...label, fontSize: 32 }}>{remaining} s</Text>
          <Text style={{ ...label, fontSize: 36 }}>
            {actor
              ? (s.currentCard?.name ?? "Preparazione carta")
              : `${name(s.describerUid)} descrive`}
          </Text>
          {actor && !!s.currentCard?.aliases?.length && (
            <Text style={label}>
              Non dire neanche: {s.currentCard.aliases.join(", ")}
            </Text>
          )}
        </>
      )}
      <Text style={label}>
        Squadra {s.team === "blue" ? "Blu" : "Rossa"} · {s.remaining} carte
        rimaste
      </Text>
      <Text style={label}>
        Blu {s.scores?.blue ?? 0} — Rossa {s.scores?.red ?? 0}
      </Text>
      {!participant && (
        <Text style={label}>
          Spettatore · parteciperai dalla prossima partita
        </Text>
      )}
    </View>
  );
  return (
    <RoundLayout
      roomData={roomData}
      title={`Time’s Up · round ${s.roundNumber}/3`}
      card={s.phase === "collecting" ? undefined : content}
      error={error}
    >
      {s.phase === "collecting" && (
        <>
          <Text style={label}>
            Ogni nome resta privato. Inserisci un nome per riga. Puoi aggiungere
            nomi aggiornando il tuo contributo fino alla preparazione del mazzo.
            Servono almeno{" "}
            {(roomData.settings as TimesUpSettings)?.deckSize ?? 30} nomi
            distinti.
          </Text>
          <Text style={label}>
            {s.collectedCount} nomi distinti · {s.submittedCount} partecipanti
            hanno inviato.
          </Text>
          {participant ? (
            <>
              <Input
                multiline
                value={names}
                onChangeText={setNames}
                placeholder="Un nome per riga"
                style={{ minHeight: 120, textAlignVertical: "top" }}
              />
              <Button
                disabled={busy || !names.trim()}
                onPress={() =>
                  run("submitNames", {
                    names: names
                      .split(/\r?\n/)
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              >
                {s.submitted ? "Aggiorna nomi privati" : "Invia nomi privati"}
              </Button>
            </>
          ) : (
            <Text style={label}>
              {s.submitted
                ? "Nomi inviati. Attendi la preparazione del mazzo."
                : "Raccolta dei nomi in corso."}
            </Text>
          )}
        </>
      )}
      {["ready", "turnResults"].includes(s.phase) && (
        <>
          <Text style={label}>
            Descrittore: {name(s.describerUid)}. Pronti?
          </Text>
          {actor && (
            <Button disabled={busy} onPress={() => run("beginTurn")}>
              Avvia turno
            </Button>
          )}
        </>
      )}
      {s.phase === "turn" && actor && (
        <>
          <Button
            disabled={busy || remaining === 0}
            onPress={() =>
              run("resolveCard", {
                outcome: "correct",
                actionVersion: s.actionVersion,
              })
            }
          >
            Indovinata · +1
          </Button>
          <View style={{ gap: 8 }}>
            <Button
              disabled={busy || remaining === 0}
              variant="secondary"
              onPress={() =>
                run("resolveCard", {
                  outcome: "skip",
                  actionVersion: s.actionVersion,
                })
              }
            >
              Passa
            </Button>
            <Button
              disabled={busy || remaining === 0}
              variant="secondary"
              onPress={() =>
                run("resolveCard", {
                  outcome: "violation",
                  actionVersion: s.actionVersion,
                })
              }
            >
              Violazione
            </Button>
          </View>
          <Button
            disabled={busy || !s.canUndo || remaining === 0}
            variant="secondary"
            onPress={() => run("undoCard", { actionVersion: s.actionVersion })}
          >
            Annulla ultima azione
          </Button>
        </>
      )}
      {s.phase === "turn" && remaining === 0 && participant && (
        <Button disabled={busy} onPress={() => run("endTurn")}>
          Tempo scaduto · chiudi turno
        </Button>
      )}
      {s.phase === "turnResults" && (
        <Text style={label}>Turno concluso. Ora tocca all’altra squadra.</Text>
      )}
      {s.phase === "roundResults" && (
        <Text style={label}>
          Mazzo completato! Punti del round: Blu {s.roundScores.blue}, Rossa{" "}
          {s.roundScores.red}. Lo stesso mazzo ritorna con la nuova regola.
        </Text>
      )}
      {s.phase === "results" && (
        <>
          <Text style={{ ...label, fontSize: 24 }}>
            {s.scores.blue === s.scores.red
              ? "Vittoria condivisa"
              : `Vince la squadra ${s.scores.blue > s.scores.red ? "Blu" : "Rossa"}!`}
          </Text>
          {s.history?.map((h) => (
            <Text key={h.round} style={label}>
              Round {h.round}: Blu {h.scores.blue} — Rossa {h.scores.red}
              {h.cancelled ? " · annullato" : ""}
            </Text>
          ))}
        </>
      )}
      {(["blue", "red"] as const).map((team) => (
        <Text key={team} style={label}>
          {team === "blue" ? "Blu" : "Rossa"}:{" "}
          {s.teams?.[team]?.map(name).join(", ")}
        </Text>
      ))}
    </RoundLayout>
  );
}
