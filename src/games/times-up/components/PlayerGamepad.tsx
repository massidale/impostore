import { WordCollectionCard } from '../../../core/components/WordCollectionCard';
import { EndActionButton } from '../../../core/components/EndActionButton';
import React, { useState, useEffect } from "react";
import { Text, View } from "react-native";
import type { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { Button, colors, fonts } from "../../../core/ui";
import { sendAction } from "../services/timesUpLogic";
import type { TimesUpView, TimesUpSettings } from "../types";
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
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
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
  if (s.phase === 'collecting') return <WordCollectionCard key={roomData.matchId}
    collected={s.collectedCount ?? 0} total={(roomData.settings as TimesUpSettings).deckSize}
    myWords={s.myWords ?? []} canSubmit={!!participant}
    onSubmit={word => sendAction(roomData.id, 'submitWord', {word})} />;
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
      card={content}
      error={error}
    >
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
            Indovinata
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
        <EndActionButton kind="turn" disabled={busy} onConfirm={() => run("endTurn")} />
      )}
      {s.phase === "turnResults" && (
        <Text style={label}>Turno concluso. Ora tocca all’altra squadra.</Text>
      )}
      {s.phase === "roundResults" && (
        <Text style={label}>
          Mazzo completato! Lo stesso mazzo ritorna con la nuova regola.
        </Text>
      )}
      {s.phase === "results" && <Text style={label}>Partita conclusa! Avete completato tutti e tre i round.</Text>}
      {(["blue", "red"] as const).map((team) => (
        <Text key={team} style={label}>
          {team === "blue" ? "Blu" : "Rossa"}:{" "}
          {s.teams?.[team]?.map(name).join(", ")}
        </Text>
      ))}
    </RoundLayout>
  );
}
