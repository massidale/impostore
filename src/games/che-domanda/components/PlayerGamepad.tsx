import { AnswerCards, AlternativeQuestionCard } from './AnswerCards';
import { VotingPanel } from '../../../core/voting/VotingPanel';
import React, { useEffect, useState } from "react";
import { Text, View, TextInput, ScrollView } from "react-native";
import { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { AvatarPlayer, Button, EliminatedPlayerCard, WordBox, colors, fonts, spacing } from "../../../core/ui";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { roomCommand } from "../../../core/services/roomCommand";
import { CheDomandaView } from "../types";

export default function PlayerGamepad({
  roomData,
  playerId,
}: PlayerGamepadProps) {
  const s = roomData.gameState as CheDomandaView | undefined;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDraft("");
    setError(null);
  }, [roomData.matchId, s?.roundId, playerId]);
  if (!s) return <Text>Caricamento…</Text>;
  const member = s.participantUids?.includes(playerId);
  const eliminated = s.eliminatedUids?.includes(playerId);
  const name = (id: string) => roomData.players?.[id]?.name ?? "Giocatore";
  const isText = s.textAnswer === true;
  const send = async (action: string, payload: unknown = {}) => {
    setBusy(true);
    setError(null);
    try {
      await roomCommand(roomData.id, "che-domanda." + action, [payload]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Riprova: invio non riuscito");
    } finally {
      setBusy(false);
    }
  };
  const submit = () => {
    if (isText) {
      if (!draft.trim()) {
        setError("Inserisci una risposta.");
        return;
      }
      send("submitAnswer", { text: draft.trim() });
    } else {
      if (
        !/^-?\d+(?:[.,]\d+)?$/.test(draft) ||
        (draft.split(/[.,]/)[1]?.length ?? 0) > (s.domain?.decimals ?? 0)
      ) {
        setError(
          "Inserisci un numero valido, senza migliaia né notazione scientifica.",
        );
        return;
      }
      send("submitAnswer", { value: Number(draft.replace(",", ".")) });
    }
  };
  const answers = <AnswerCards
    answers={s.answersByUid ?? {}}
    players={roomData.players ?? {}}
    roles={s.roles}
    eliminatedUids={s.eliminatedUids}
    textAnswer={isText}
  />;
  if (s.phase === "voting") return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemi, textAlign: "center" }}>{s.question}</Text>
      <VotingPanel playerId={playerId}
        candidates={(s.candidates ?? []).map(uid => ({ uid, name: name(uid) }))}
        ownVote={s.ownVote ?? null} voteCount={s.voteCount ?? 0}
        totalVoters={(s.participantUids?.length ?? 0) - (s.eliminatedUids?.length ?? 0)}
        endsAt={s.votingEndsAt ?? 0} totalSeconds={s.runoff ? 30 : 60}
        runoff={s.runoff} canVote={!!member && !eliminated}
        onVote={uid => roomCommand(roomData.id, "che-domanda.castVote", [{ targetUid: uid }])}
      />
      {answers}
      {error && <Text style={{ color: colors.textSecondary }}>{error}</Text>}
    </ScrollView>
  );
  const questionCard = (
    <View style={{ padding: 24, backgroundColor: colors.surfaceAlt, borderRadius: 20, gap: 16 }}>
      <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 26, color: colors.textPrimary, textAlign: "center" }}>
        {s.phase === "answering"
          ? (s.ownQuestion ?? "Le risposte sono private")
          : (s.question ?? "Che domanda?")}
      </Text>
      <Text style={{ fontSize: 17, color: colors.textSecondary, textAlign: "center" }}>
        {s.phase === "answering"
          ? member
            ? isText
              ? "Rispondi con un testo (massimo 60 caratteri)."
              : `Rispondi con un numero da ${s.domain?.min} a ${s.domain?.max} (${s.domain?.decimals === 0 ? "intero" : `${s.domain?.decimals} decimali`}).`
            : "Sei spettatore: entrerai nella prossima partita."
          : s.phase === "discussion"
            ? "Questa è la domanda dei civili. Spiegate le risposte a turno."
            : s.phase === "results"
              ? s.cancelled
                ? "Partita annullata"
                : `Vincono i ${s.winner}`
              : "Esito della votazione"}
      </Text>
    </View>
  );

  // Layout eliminazione: WordBox eliminato → domanda → risposte
  if (s.phase === "elimination") return (
    <RoundLayout roomData={roomData} gameName="Che domanda?" title={s.cancelled ? "Partita annullata" : undefined} error={error}>
      {s.elimination ? (
        <EliminatedPlayerCard name={name(s.elimination.uid)} role={s.elimination.role} />
      ) : (
        <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md }}>
          Nessuno espulso
        </Text>
      )}
      <WordBox label="La domanda" word={s.question ?? ""} size="md" />
      {answers}
    </RoundLayout>
  );

  // Layout results: eliminato → domanda → domanda alternativa → risposte
  if (s.phase === "results") return (
    <RoundLayout roomData={roomData} gameName="Che domanda?" title={s.cancelled ? "Partita annullata" : s.winner ? `Vincono i ${s.winner}` : undefined} error={error}>
      {s.elimination && (
        <EliminatedPlayerCard name={name(s.elimination.uid)} role={s.elimination.role} />
      )}
      <WordBox label="La domanda" word={s.question ?? ""} size="md" />
      <AlternativeQuestionCard question={s.alternateQuestion} />
      {answers}
    </RoundLayout>
  );

  // Fase discussion: domanda → risposte (niente FirstPlayerCard)
  if (s.phase === "discussion") return (
    <RoundLayout roomData={roomData} gameName="Che domanda?" error={error} centerContent>
      <View style={{ width: '100%', gap: 8 }}>
        {questionCard}
        {answers}
      </View>
    </RoundLayout>
  );

  // Fase answering
  return (
    <RoundLayout roomData={roomData} gameName="Che domanda?" card={questionCard} error={error}>
      {busy && <Text style={{ color: colors.textSecondary }}>Invio…</Text>}
      {eliminated && (
        <Text style={{ color: colors.textSecondary }}>
          Sei eliminato: puoi osservare la partita.
        </Text>
      )}
      {s.phase === "answering" && member && (
        <>
          {s.ownAnswer != null ? (
            <WordBox label="La tua risposta" word={String(s.ownAnswer).replace('.', ',')} size="md" />
          ) : (
            <>
              <TextInput
                accessibilityLabel={isText ? "Risposta testuale" : "Risposta numerica"}
                keyboardType={isText ? "default" : "decimal-pad"}
                value={draft}
                onChangeText={setDraft}
                editable={!busy}
                maxLength={isText ? 60 : undefined}
                placeholder={isText ? "Scrivi la tua risposta" : "Scrivi un numero"}
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surfaceAlt,
                  color: colors.textPrimary,
                  borderRadius: 12,
                  padding: 14,
                  minHeight: 48,
                  fontSize: 18,
                }}
              />
              <Button disabled={busy || !draft.trim()} onPress={submit}>
                Conferma risposta
              </Button>
            </>
          )}
          {/* Griglia avatar: cerchi con iniziale + nome, contorno verde se pronto */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
            {(s.participantUids ?? []).map(uid => {
              const answered = (s.answeredUids ?? []).includes(uid);
              return (
                <AvatarPlayer
                  key={uid}
                  uid={uid}
                  name={name(uid)}
                  ready={answered}
                  size="sm"
                />
              );
            })}
          </View>
        </>
      )}
      {s.phase === "answering" && !member && (
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Sei spettatore: entrerai nella prossima partita.
        </Text>
      )}
    </RoundLayout>
  );
}
