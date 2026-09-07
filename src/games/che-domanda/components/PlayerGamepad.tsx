import { AnswerCards, AlternativeQuestionCard, RoleBadge } from './AnswerCards';
import { ParticipantStatusGrid } from '../../../core/components/ParticipantStatusGrid';
import { FirstPlayerCard } from '../../../core/components/FirstPlayerCard';
import { VotingPanel } from '../../../core/voting/VotingPanel';
import React, { useEffect, useState } from "react";
import { Text, View, TextInput, ScrollView } from "react-native";
import { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { Button, colors, fonts } from "../../../core/ui";
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
  };
  const answers = <AnswerCards answers={s.answersByUid ?? {}} players={roomData.players ?? {}}
    roles={s.roles} eliminatedUids={s.eliminatedUids} />;
  if (s.phase === "voting") return (
    <ScrollView contentContainerStyle={{flexGrow: 1, padding: 16, gap: 12}} keyboardShouldPersistTaps="handled">
      <Text style={{color: colors.textPrimary, fontFamily: fonts.bodySemi, textAlign: "center"}}>{s.question}</Text>
      <VotingPanel playerId={playerId}
        candidates={(s.candidates ?? []).map(uid => ({uid, name: name(uid)}))}
        ownVote={s.ownVote ?? null} voteCount={s.voteCount ?? 0}
        totalVoters={(s.participantUids?.length ?? 0) - (s.eliminatedUids?.length ?? 0)}
        endsAt={s.votingEndsAt ?? 0} totalSeconds={s.runoff ? 30 : 60}
        runoff={s.runoff} canVote={!!member && !eliminated}
        onVote={uid => roomCommand(roomData.id, "che-domanda.castVote", [{targetUid: uid}])}
      />
      {answers}
      {error && <Text style={{color: colors.textSecondary}}>{error}</Text>}
    </ScrollView>
  );
  const card = (
    <View
      style={{
        padding: 24,
        backgroundColor: colors.surfaceAlt,
        borderRadius: 20,
        gap: 16,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.displayHeavy,
          fontSize: 26,
          color: colors.textPrimary,
          textAlign: "center",
        }}
      >
        {s.phase === "answering"
          ? (s.ownQuestion ?? "Le risposte sono private")
          : (s.question ?? "Che domanda?")}
      </Text>
      <Text
        style={{
          fontSize: 17,
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        {s.phase === "answering"
          ? member
            ? `Rispondi con un numero da ${s.domain?.min} a ${s.domain?.max} (${s.domain?.decimals === 0 ? "intero" : `${s.domain?.decimals} decimali`}).`
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
  // Once answers are revealed, the question, first speaker and answer
  // grid form one full-width group, centred when space permits.
  if (s.phase !== 'answering') return <RoundLayout roomData={roomData} title="Che domanda?" error={error} centerContent>
    <View style={{ width: '100%', gap: 8 }}>
      {card}
      {s.phase === "discussion" && (
        <>
          <FirstPlayerCard name={s.speakerOrder?.[0] ? name(s.speakerOrder[0]) : null} isMe={s.speakerOrder?.[0] === playerId} />
        </>
      )}
      {answers}
      {s.phase === "elimination" && (
        <>
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMuted, borderRadius: 14, padding: 12, gap: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{s.elimination ? 'Giocatore espulso' : 'Nessuno espulso'}</Text>
            {s.elimination && <>
              <Text numberOfLines={1} ellipsizeMode="tail" style={{ maxWidth: '100%', color: colors.textPrimary, fontFamily: fonts.bodyMedium }}>{name(s.elimination.uid)}</Text>
              <RoleBadge role={s.elimination.role} />
            </>}
          </View>

        </>
      )}
      {s.phase === "results" && <AlternativeQuestionCard question={s.alternateQuestion} />}
    </View>
  </RoundLayout>;
  return (
    <RoundLayout
      roomData={roomData}
      title="Che domanda?"
      card={card}
      error={error}
    >
      {busy && <Text style={{ color: colors.textSecondary }}>Invio…</Text>}
      {eliminated && (
        <Text style={{ color: colors.textSecondary }}>
          Sei eliminato: puoi osservare la partita.
        </Text>
      )}
      {s.phase === "answering" && (
        <>
          {member &&
            (s.ownAnswer != null ? (
              <Text style={{ color: colors.textPrimary }}>
                La tua risposta: {s.ownAnswer}
              </Text>
            ) : (
              <>
                <TextInput
                  accessibilityLabel="Risposta numerica"
                  keyboardType="decimal-pad"
                  value={draft}
                  onChangeText={setDraft}
                  editable={!busy}
                  placeholder="Scrivi un numero"
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
                <Button disabled={busy || !draft} onPress={submit}>
                  Conferma risposta
                </Button>
              </>
            ))}
          <ParticipantStatusGrid participantUids={s.participantUids ?? []} completedUids={s.answeredUids} players={roomData.players ?? {}} />
        </>
      )}

    </RoundLayout>
  );
}
