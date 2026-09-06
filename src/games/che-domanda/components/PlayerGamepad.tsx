import React, { useEffect, useState } from "react";
import { Text, View, TextInput } from "react-native";
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
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setDraft("");
    setTarget(null);
    setError(null);
  }, [roomData.matchId, s?.roundId, playerId]);
  useEffect(() => {
    setTarget(null);
  }, [s?.phase, s?.runoff]);
  if (!s) return <Text>Caricamento…</Text>;
  const host = roomData.hostId === playerId;
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
            : s.phase === "voting"
              ? s.runoff
                ? "Ballottaggio: vota uno dei candidati."
                : "Vota chi pensi abbia ricevuto una domanda diversa."
              : s.phase === "results"
                ? s.cancelled
                  ? "Partita annullata"
                  : `Vincono i ${s.winner}`
                : "Esito della votazione"}
      </Text>
    </View>
  );
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
          {s.participantUids?.map((uid) => (
            <Text key={uid} style={{ color: colors.textPrimary }}>
              {name(uid)}:{" "}
              {s.answeredUids?.includes(uid) ? "ha risposto" : "in attesa"}
            </Text>
          ))}
        </>
      )}
      {s.answersByUid &&
        Object.entries(s.answersByUid).map(([uid, value]) => (
          <Text key={uid} style={{ color: colors.textPrimary, fontSize: 18 }}>
            {name(uid)}: {value}
            {s.eliminatedUids?.includes(uid) ? " · eliminato" : ""}
            {s.roles?.[uid] ? ` · ${s.roles[uid]}` : ""}
          </Text>
        ))}
      {s.phase === "discussion" && (
        <>
          <Text style={{ color: colors.textPrimary }}>
            {s.speakerIndex < s.speakerOrder.length
              ? `Parla ${name(s.speakerOrder[s.speakerIndex])} (${s.speakerIndex + 1}/${s.speakerOrder.length})`
              : "Tutti hanno parlato"}
          </Text>
          {s.speakerOrder.map((uid, i) => (
            <Text
              key={uid}
              style={{
                color:
                  i === s.speakerIndex
                    ? colors.primaryLight
                    : colors.textSecondary,
              }}
            >
              {i + 1}. {name(uid)} {i < s.speakerIndex ? "✓" : ""}
            </Text>
          ))}
          {s.speakerIndex < s.speakerOrder.length &&
            (host || s.speakerOrder[s.speakerIndex] === playerId) && (
              <Button
                disabled={busy}
                onPress={() =>
                  send("nextSpeaker", { expectedSpeakerIndex: s.speakerIndex })
                }
              >
                Ho finito / prossimo oratore
              </Button>
            )}
          {host && s.speakerIndex === s.speakerOrder.length && (
            <Button disabled={busy} onPress={() => send("startVoting")}>
              Apri voto (60 secondi)
            </Button>
          )}
        </>
      )}
      {s.phase === "voting" && (
        <>
          <Text style={{ color: colors.textPrimary }}>
            Voti: {s.voteCount ?? 0}/
            {(s.participantUids?.length ?? 0) - (s.eliminatedUids?.length ?? 0)}{" "}
            · {Math.max(0, Math.ceil(((s.votingEndsAt ?? 0) - now) / 1000))}{" "}
            secondi
          </Text>
          {s.ownVote && (
            <Text style={{ color: colors.textSecondary }}>
              Voto inviato: {name(s.ownVote)}. Puoi cambiarlo finché il voto è
              aperto.
            </Text>
          )}
          {member &&
            !eliminated &&
            (s.candidates ?? [])
              .filter((uid) => uid !== playerId)
              .map((uid) => (
                <Button
                  key={uid}
                  disabled={busy || now >= (s.votingEndsAt ?? 0)}
                  variant={target === uid ? "primary" : "secondary"}
                  onPress={() => setTarget(uid)}
                >
                  {name(uid)}
                </Button>
              ))}
          {member && !eliminated && (
            <Button
              disabled={busy || !target || now >= (s.votingEndsAt ?? 0)}
              onPress={() => send("castVote", { targetUid: target })}
            >
              Conferma voto
            </Button>
          )}
          {host && now >= (s.votingEndsAt ?? Infinity) && (
            <Button disabled={busy} onPress={() => send("closeVoting")}>
              Chiudi voto scaduto
            </Button>
          )}
        </>
      )}
      {s.phase === "elimination" && (
        <>
          <Text style={{ color: colors.textPrimary, fontSize: 20 }}>
            {s.elimination
              ? `${name(s.elimination.uid)} era ${s.elimination.role}.`
              : "Nessuno espulso."}
          </Text>
          {host && (
            <Button disabled={busy} onPress={() => send("continueRound")}>
              {s.winner
                ? "Mostra risultati finali"
                : "Nuovo giro di discussione"}
            </Button>
          )}
        </>
      )}
      {s.phase === "results" && (
        <Text style={{ color: colors.textSecondary }}>
          Domanda alternativa: {s.alternateQuestion}
        </Text>
      )}
      {host && !["idle", "results"].includes(s.phase) && (
        <Button
          disabled={busy}
          variant="secondary"
          onPress={() => send("cancelRound")}
        >
          Annulla la partita senza vincitori
        </Button>
      )}
      {host && (
        <Button disabled={busy} variant="secondary" onPress={() => send("end")}>
          {s.phase === "results" ? "Torna alla lobby" : "Termina partita"}
        </Button>
      )}
    </RoundLayout>
  );
}
