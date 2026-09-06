import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { Button, Input, colors, fonts, spacing } from "../../../core/ui";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { sendAction } from "../services/justOneLogic";
import { JustOneSettings, JustOneView } from "../types";
const textStyle = {
  color: colors.textPrimary,
  fontFamily: fonts.body,
  fontSize: 16,
};
export default function PlayerGamepad({
  roomData,
  playerId,
}: PlayerGamepadProps) {
  const state = (roomData.gameState ?? {}) as JustOneView;
  const s = state.myTeam ?? state;
  const teamMode = (roomData.settings as JustOneSettings)?.mode === "teams";
  const settings = roomData.settings as JustOneSettings;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDraft("");
    setError(null);
  }, [roomData.matchId, s.roundId, s.phase, playerId]);
  const act = async (action: string, payload: Record<string, unknown> = {}) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action, {
        ...payload,
        ...(s.id ? { teamId: s.id, teamRoundId: s.roundId, teamPhaseVersion: s.phaseVersion } : {}),
      });
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
  const guesser = s.guesserUid === playerId;
  const ready = (s.readyUids ?? []).includes(playerId);
  const submitted = (s.submittedUids ?? []).includes(playerId);
  const title =
    state.phase === "results"
      ? "Just One · Esito"
      : s.phase === "results"
        ? `${s.name ?? "Just One"} · Parole completate`
        : teamMode && !state.myTeam
          ? "Just One · Due squadre"
          : teamMode ? `${s.name ?? "Just One"} · Parola ${(s.roundIndex ?? 0) + 1}/${settings?.rounds ?? 8}` : "Just One";
  return (
    <RoundLayout
      roomData={roomData}
      title={title}
      error={error}
      card={
        s.target ? (
          <View
            style={{
              padding: spacing.md,
              backgroundColor: colors.surfaceAlt,
              borderRadius: 16,
            }}
          >
            <Text style={textStyle}>Parola da far indovinare</Text>
            <Text
              selectable
              style={[
                textStyle,
                { fontFamily: fonts.displayHeavy, fontSize: 36, flexShrink: 1 },
              ]}
            >
              {s.target}
            </Text>
          </View>
        ) : undefined
      }
    >
      {teamMode && (
        <View style={{ gap: spacing.sm }}>
          {(state.teams ?? []).map((team) => (
            <Text key={team.id} style={textStyle}>
              {team.name}: {team.wordsGuessed} parole indovinate · {team.phase === "results" ? "Terminata" : `Parola ${team.roundIndex + 1}/${settings.rounds}`}
              {"\n"}{team.participantUids.map(name).join(", ")}
            </Text>
          ))}
          {s.name && <Text style={textStyle}>Giochi con {s.name}.</Text>}
          {state.phase === "results" && (
            <Text style={[textStyle, { fontSize: 28 }]}>
              {(state.winnerTeamIds?.length ?? 0) > 1
                ? "Pareggio!"
                : `Vince ${state.teams?.find(t => state.winnerTeamIds?.includes(t.id))?.name ?? ""}!`}
            </Text>
          )}
        </View>
      )}
      {!participant && (
        <Text style={textStyle}>
          Sei spettatore. Giocherai dalla prossima partita.
        </Text>
      )}
      {s.guesserUid && (
        <Text style={textStyle}>Indovino: {name(s.guesserUid)}</Text>
      )}
      {s.phase === "clues" && (
        <>
          <Text style={textStyle}>
            {s.submittedUids?.length ?? 0}/
            {Math.max(0, (s.participantUids?.length ?? 0) - 1)} indizi ricevuti
          </Text>
          {participant && !guesser && !submitted && (
            <>
              <Input
                accessibilityLabel="Indizio di una parola"
                value={draft}
                onChangeText={setDraft}
                maxLength={30}
                autoCapitalize="none"
                placeholder="Una sola parola"
              />
              <Text style={textStyle}>
                Solo lettere e apostrofi interni, massimo 30 caratteri.
              </Text>
              <Button
                disabled={busy || !draft.trim()}
                onPress={() => act("submitClue", { text: draft })}
              >
                {busy ? "Invio…" : "Conferma indizio"}
              </Button>
            </>
          )}
          {submitted && (
            <Text style={textStyle}>
              Il tuo indizio: {s.myClue}. Attendi gli altri autori.
            </Text>
          )}
          {guesser && (
            <Text style={textStyle}>
              Gli altri stanno scrivendo. Non guardare i loro schermi.
            </Text>
          )}
        </>
      )}
      {s.phase === "review" && (
        <>
          <Text style={textStyle}>
            Revisione · {s.readyUids?.length ?? 0}/
            {Math.max(0, (s.participantUids?.length ?? 0) - 1)} pronti
          </Text>
          {participant && !guesser ? (
            <>
              <Text style={textStyle}>
                {(s.participantUids?.length ?? 0) === 2
                  ? "Il tuo unico indizio è valido. Puoi ritirarlo oppure confermare per far rispondere l’indovino."
                  : "I duplicati sono annullati automaticamente. Servono due segnalazioni distinte per escludere un indizio. Conferma quando hai finito."}
              </Text>
              {(s.reviewClues ?? []).map((c) => (
                <View
                  key={c.authorUid}
                  style={{
                    gap: spacing.sm,
                    padding: spacing.md,
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: 12,
                  }}
                >
                  <Text style={textStyle}>
                    {name(c.authorUid)}: {c.text} ·{" "}
                    {c.invalid ? "Annullato" : "Valido"}
                  </Text>
                  {(s.participantUids?.length ?? 0) > 2 && <>
                  <Text style={textStyle}>Segnalazioni: {c.flagCount}/2</Text>
                  <Button
                    disabled={
                      busy ||
                      ready ||
                      c.invalid ||
                      s.myFlaggedUids?.includes(c.authorUid)
                    }
                    variant="secondary"
                    onPress={() => act("flagClue", { authorUid: c.authorUid })}
                  >
                    Segnala indizio
                  </Button>
                  </>}
                  {c.authorUid === playerId && (
                    <Button
                      variant="secondary"
                      disabled={busy || ready || c.invalid}
                      onPress={() => act("withdrawClue")}
                    >
                      Ritira il mio indizio
                    </Button>
                  )}
                </View>
              ))}
              <Button
                disabled={busy || ready}
                onPress={() => act("confirmReview")}
              >
                {ready ? "Pronto, attendi gli altri" : "Sono pronto"}
              </Button>
            </>
          ) : (
            <Text style={textStyle}>
              Gli autori stanno controllando gli indizi.
            </Text>
          )}
        </>
      )}
      {s.phase === "guessing" && (
        <>
          <Text style={textStyle}>Indizi validi, senza autori</Text>
          {(s.validClues ?? []).map((clue, i) => (
            <Text
              key={i}
              style={[textStyle, { fontSize: 24, fontFamily: fonts.bodySemi }]}
            >
              {clue}
            </Text>
          ))}
          {guesser && participant ? (
            <>
              <Input
                accessibilityLabel="Il tuo unico tentativo"
                value={draft}
                onChangeText={setDraft}
                maxLength={60}
                placeholder="Qual è la parola?"
              />
              <Button
                disabled={busy || !draft.trim()}
                onPress={() => act("submitGuess", { text: draft })}
              >
                Conferma unico tentativo
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onPress={() => act("pass")}
              >
                Passo
              </Button>
            </>
          ) : (
            <Text style={textStyle}>Attendi il tentativo dell’indovino.</Text>
          )}
        </>
      )}
      {(s.phase === "roundResults" || (!teamMode && s.phase === "results")) && s.roundResult && (
        <>
          <Text style={[textStyle, { fontSize: 28 }]}>
            La parola era: {s.roundResult.word}
          </Text>
          <Text style={textStyle}>
            {s.roundResult.correct
              ? "Indovinata!"
              : s.roundResult.reason === "cancelled"
                ? "Partita annullata"
                : s.roundResult.reason === "noClues"
                  ? "Nessun indizio valido"
                  : s.roundResult.reason === "passed"
                    ? "Parola passata"
                    : `Tentativo: ${s.roundResult.guess}. Parola non indovinata.`}
          </Text>
          {teamMode && guesser && (
            <Button disabled={busy} onPress={() => act("nextRound")}>
              {s.roundIndex + 1 >= settings.rounds ? "Concludi la partita della squadra" : "Prossima parola"}
            </Button>
          )}
          {!isHost && !(teamMode && guesser) && (
            <Text style={textStyle}>{teamMode ? "L’indovino o l’host avvia la prossima parola." : "L’host può avviare una nuova partita."}</Text>
          )}
        </>
      )}
      {teamMode && s.phase === "results" && (
        <>
          {teamMode && state.phase !== "results" && (
            <Text style={textStyle}>La tua squadra ha finito. Attendete l’altra squadra.</Text>
          )}
          {(s.history ?? []).map((h) => (
            <Text key={h.round} style={textStyle}>
              {h.round}. {h.word} · {h.correct ? "Indovinata" : "Non indovinata"}
            </Text>
          ))}
        </>
      )}
    </RoundLayout>
  );
}
