import { FitContent } from '../../../core/ui/FitContent';
import { TurnTimer } from '../../../core/components/TurnTimer';
import { TeamRosterCard } from '../../../core/components/TeamRosterCard';
import { FirstPlayerCard } from '../../../core/components/FirstPlayerCard';
import { useCountdown } from '../../../core/hooks/useCountdown';
import { WordCollectionCard } from '../../../core/components/WordCollectionCard';
import { EndActionButton } from '../../../core/components/EndActionButton';
import React, { useState, useEffect } from "react";
import { Text, View } from "react-native";
import type { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { Button, colors, fonts, WordBox, StatusCard, PhaseCard, ErrorBanner, spacing } from "../../../core/ui";
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
    [error, setError] = useState<string | null>(null);
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
  const label = { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 14 };
  const remaining = useCountdown(s.phase === 'turn' ? s.deadline : null) ?? 0;
  const name = (id: string) => roomData.players?.[id]?.name ?? id;
  if (s.phase === 'collecting') return <WordCollectionCard key={roomData.matchId}
    collected={s.collectedCount ?? 0} total={(roomData.settings as TimesUpSettings).deckSize}
    myWords={s.myWords ?? []} canSubmit={!!participant}
    onSubmit={word => sendAction(roomData.id, 'submitWord', {word})} />;
  if (s.phase === 'turn') return <View style={{ flex: 1, minHeight: 0, padding: spacing.sm, gap: spacing.sm }}>
    <TurnTimer seconds={remaining} total={(roomData.settings as TimesUpSettings).turnSeconds}
      onUndo={actor && s.canUndo && !busy && remaining > 0 ? () => run('undoCard', { actionVersion: s.actionVersion }) : undefined} />
    {error && <ErrorBanner message={error} />}
    <Text style={[label, { textAlign: 'center' }]}>{rules[s.roundNumber - 1]} · Squadra {s.team === 'blue' ? 'Blu' : 'Rossa'}</Text>
    <FitContent minContentWidth={400} testID="times-up-turn-card">
      {actor ? <WordBox label="La parola" word={s.currentCard?.name ?? 'Preparazione carta'} />
        : <StatusCard title="Indovina!" message={`${name(s.describerUid)} sta descrivendo una parola.`} tone="primary" />}
      {actor && !!s.currentCard?.aliases?.length && <Text style={[label, { textAlign: 'center', marginTop: spacing.sm }]}>Non dire neanche: {s.currentCard.aliases.join(', ')}</Text>}
    </FitContent>
    {actor && <View style={{ gap: spacing.sm }}>
      <Button variant="success" disabled={busy || remaining === 0} onPress={() => run('resolveCard', { outcome: 'correct', actionVersion: s.actionVersion })}>Indovinata</Button>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button variant="secondary" style={{ flex: 1 }} disabled={busy || remaining === 0} onPress={() => run('resolveCard', { outcome: 'skip', actionVersion: s.actionVersion })}>Passa</Button>
        <Button variant="dangerMuted" style={{ flex: 1 }} disabled={busy || remaining === 0} onPress={() => run('resolveCard', { outcome: 'violation', actionVersion: s.actionVersion })}>Violazione</Button>
      </View>
    </View>}
    {remaining === 0 && participant && roomData.hostId !== playerId && <EndActionButton kind="turn" disabled={busy} onConfirm={() => run('endTurn')} />}
  </View>;
  const content = (
    <View style={{ gap: spacing.sm }}>
      <PhaseCard compact title={rules[s.roundNumber - 1]}>
        <Text style={[label, { color: s.team === 'blue' ? colors.teamBlue : colors.teamRed, textAlign: 'center', marginTop: spacing.sm }]}>
          Squadra {s.team === 'blue' ? 'Blu' : 'Rossa'} · {s.remaining} carte rimaste
        </Text>
      </PhaseCard>
      <FirstPlayerCard name={name(s.describerUid)} isMe={actor} roleLabel="il descrittore" />
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
          {actor && roomData.hostId !== playerId && (
            <Button disabled={busy} onPress={() => run("beginTurn")}>
              Avvia turno
            </Button>
          )}
        </>
      )}
      {s.phase === "turnResults" && (
        <StatusCard title="Turno concluso" message="Ora tocca all’altra squadra." />
      )}
      {s.phase === "roundResults" && (
        <StatusCard title="Mazzo completato!" message="Lo stesso mazzo ritorna con la nuova regola." tone="success" />
      )}
      {s.phase === "results" && <StatusCard title="Partita conclusa!" message="Avete completato tutti e tre i round." tone="success" />}
      {!participant && <StatusCard title="Spettatore" message="Parteciperai dalla prossima partita." tone="muted" />}
      {(['blue', 'red'] as const).map(team => <TeamRosterCard key={team}
        name={team === 'blue' ? 'Squadra Blu' : 'Squadra Rossa'} color={team === 'blue' ? colors.teamBlue : colors.teamRed}
        uids={s.teams?.[team] ?? []} players={roomData.players ?? {}} />)}
    </RoundLayout>
  );
}
