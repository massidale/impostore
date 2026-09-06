import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { Button, Input, colors, fonts, spacing } from "../../../core/ui";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { sendAction } from "../services/herdMentalityLogic";
import { HerdMentalitySettings, HerdMentalityView } from "../types";
const textStyle = {
  color: colors.textPrimary,
  fontFamily: fonts.body,
  fontSize: 16,
};
export default function PlayerGamepad({
  roomData,
  playerId,
}: PlayerGamepadProps) {
  const s = (roomData.gameState ?? {}) as HerdMentalityView;
  const settings = roomData.settings as HerdMentalitySettings;
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDraft("");
    setSelected([]);
    setError(null);
  }, [roomData.matchId, s.roundId, s.phase, playerId]);
  useEffect(() => {
    setSelected((previous) =>
      previous.filter((id) => (s.groups ?? []).some((g) => g.id === id)),
    );
  }, [JSON.stringify(s.groups)]);
  const act = async (action: string, payload: unknown = {}) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action, payload);
      if (action === "mergeGroups" || action === "undoMerge") setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invio non riuscito. Riprova.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const name = (u: string) => roomData.players?.[u]?.name ?? u;
  const isHost = roomData.hostId === playerId;
  const participant = (s.participantUids ?? []).includes(playerId);
  const submitted = (s.submittedUids ?? []).includes(playerId);
  return (
    <RoundLayout
      roomData={roomData}
      title={
        s.phase === "results"
          ? "Herd Mentality · Partita conclusa"
          : `Herd Mentality · Domanda ${(s.roundIndex ?? 0) + 1}/${settings?.rounds ?? 8}`
      }
      error={error}
      card={
        s.question ? (
          <Text
            style={[
              textStyle,
              { fontSize: 30, fontFamily: fonts.displayHeavy },
            ]}
          >
            {s.question}
          </Text>
        ) : undefined
      }
    >
      {!participant && (
        <Text style={textStyle}>
          Sei spettatore. Giocherai dalla prossima partita.
        </Text>
      )}
      {s.phase === "answering" && (
        <>
          <Text style={textStyle}>
            {s.submittedUids?.length ?? 0}/{s.participantUids?.length ?? 0}{" "}
            risposte ricevute
          </Text>
          {participant && !submitted && (
            <>
              <Input
                accessibilityLabel="La tua risposta privata"
                value={draft}
                onChangeText={setDraft}
                maxLength={60}
                placeholder="Pensa alla risposta più popolare"
              />
              <Text style={textStyle}>
                Da 1 a 60 caratteri. La risposta resta privata finché tutti
                hanno inviato.
              </Text>
              <Button
                disabled={busy || !draft.trim()}
                onPress={() => act("submitAnswer", { text: draft })}
              >
                {busy ? "Invio…" : "Conferma risposta"}
              </Button>
            </>
          )}
          {submitted && (
            <Text style={textStyle}>
              La tua risposta: {s.myAnswer}. Attendi gli altri.
            </Text>
          )}
        </>
      )}
      {["review", "roundResults"].includes(s.phase) && (
        <>
          <Text style={textStyle}>
            {s.phase === "review"
              ? "Controllate insieme i gruppi di risposte."
              : "Risposte del round"}
          </Text>
          {(s.groups ?? []).map((g) => (
            <View
              key={g.id}
              style={{
                padding: spacing.md,
                gap: spacing.sm,
                backgroundColor: colors.surfaceAlt,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected.includes(g.id)
                  ? colors.primary
                  : "transparent",
              }}
            >
              <Text style={[textStyle, { fontFamily: fonts.bodySemi }]}>
                Gruppo · {g.memberUids.length}{" "}
                {g.memberUids.length === 1 ? "persona" : "persone"}
              </Text>
              {g.memberUids.map((u) => (
                <Text key={u} style={textStyle}>
                  {name(u)}: {s.answersByUid?.[u]}
                </Text>
              ))}
              {isHost && s.phase === "review" && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    setSelected((v) =>
                      v.includes(g.id)
                        ? v.filter((id) => id !== g.id)
                        : [...v, g.id],
                    )
                  }
                >
                  {selected.includes(g.id)
                    ? "Deseleziona gruppo"
                    : "Seleziona per unire"}
                </Button>
              )}
            </View>
          ))}
          {s.phase === "review" && isHost && (
            <>
              <Text style={textStyle}>
                Seleziona almeno due gruppi equivalenti. La fusione è visibile a
                tutti e può essere annullata prima della conferma.
              </Text>
              <Button
                disabled={busy || selected.length < 2}
                onPress={() => act("mergeGroups", { groupIds: selected })}
              >
                Unisci {selected.length} gruppi selezionati
              </Button>
              <Button
                disabled={busy || !s.canUndo}
                variant="secondary"
                onPress={() => act("undoMerge")}
              >
                Annulla ultima fusione
              </Button>
              <Button disabled={busy} onPress={() => act("confirmResults")}>
                Conferma gruppi
              </Button>
            </>
          )}
          {s.phase === "review" && !isHost && (
            <Text style={textStyle}>
              L’host può unire risposte equivalenti e confermare i gruppi.
            </Text>
          )}
        </>
      )}
      {s.phase === "roundResults" && (
        <>
          <Text style={textStyle}>
            {s.roundResult?.cancelled
              ? "Round annullato."
              : s.roundResult?.winners?.length
                ? `Risposta più popolare: ${s.roundResult.winners.map(name).join(", ")}`
                : "Nessuna risposta più popolare."}
          </Text>
          {!isHost && <Text style={textStyle}>Attendi l’host.</Text>}
        </>
      )}
    </RoundLayout>
  );
}
