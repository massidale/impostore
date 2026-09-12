import { ParticipantStatusGrid } from '../../../core/components/ParticipantStatusGrid';
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { Button, Input, WordBox, StatusCard, PhaseCard, PlayerSlot, colors, fonts, spacing } from "../../../core/ui";
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
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDraft("");
    setError(null);
  }, [roomData.matchId, s.roundId, s.phase, playerId]);
  const act = async (action: string, payload: unknown = {}) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action, payload);
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
      gameName="Herd Mentality"
      title={
        s.phase === "results"
          ? "Partita conclusa"
          : `Domanda ${(s.roundIndex ?? 0) + 1}/${settings?.rounds ?? 8}`
      }
      error={error}
      card={
        s.question ? (
          <WordBox label="La domanda" word={s.question} size="md" />
        ) : undefined
      }
    >
      {!participant && (
<StatusCard title="Spettatore" message="Giocherai dalla prossima partita." tone="muted" />
      )}
      {s.phase === "answering" && (
        <>
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
            <WordBox label="La tua risposta" word={s.myAnswer ?? ""} size="md" />
          )}
          <ParticipantStatusGrid participantUids={s.participantUids ?? []} completedUids={s.submittedUids} players={roomData.players ?? {}} />
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
            <PhaseCard key={g.id} title={`Gruppo · ${g.memberUids.length}`} compact>
              {g.memberUids.map((u) => (
                <View key={u} style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
                  <PlayerSlot uid={u} name={name(u)} compact subtitle={null} />
                  <Text style={[textStyle, { marginLeft: 38 }]}>{s.answersByUid?.[u] ?? ''}</Text>
                </View>
              ))}

            </PhaseCard>
          ))}

          {s.phase === "review" && !isHost && (
            <Text style={textStyle}>
              L’host può unire risposte equivalenti e confermare i gruppi.
            </Text>
          )}
        </>
      )}
      {s.phase === 'results' && <StatusCard title="Partita conclusa" message="Tutte le domande sono state giocate." />}
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
