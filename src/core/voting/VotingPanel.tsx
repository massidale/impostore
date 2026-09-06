import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckIcon, CountdownBar, ErrorBanner, InlineConfirm, PhaseCard, PlayerSlot, ProgressCounter, colors, fonts, fontSize, radius, spacing } from '../ui';
import { useCountdown } from '../hooks/useCountdown';

interface VotingPanelProps {
  playerId: string;
  candidates: { uid: string; name: string }[];
  ownVote: string | null;
  voteCount: number;
  totalVoters: number;
  endsAt: number;
  totalSeconds: number;
  runoff?: boolean;
  canVote?: boolean;
  note?: React.ReactNode;
  onVote: (uid: string) => Promise<unknown>;
}

/** Same row selection and inline confirmation for every player ballot. */
export function VotingPanel(props: VotingPanelProps) {
  // A new ballot or identity must never retain a pending choice from the previous one.
  return <Ballot key={`${props.playerId}:${props.endsAt}`} {...props} />;
}

function Ballot({playerId, candidates, ownVote, voteCount, totalVoters, endsAt, totalSeconds, runoff, canVote = true, note, onVote}: VotingPanelProps) {
  const remaining = useCountdown(endsAt);
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const closed = Date.now() >= endsAt;
  const confirm = async (uid: string) => {
    if (submitting.current || Date.now() >= endsAt || !canVote || uid === playerId || !candidates.some(p => p.uid === uid)) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onVote(uid);
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Voto non inviato. Riprova.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return <View>
    <CountdownBar seconds={remaining ?? 0} total={totalSeconds} size="md" style={{marginBottom: spacing.md}} />
    <PhaseCard title={runoff ? 'Ballottaggio' : 'Votazione'} tone={runoff ? 'warning' : 'cyan'} description={
      !canVote ? 'Non puoi votare. Attendi il risultato della votazione.' : runoff ? 'Pareggio. Scegli tra i candidati qui sotto.' : "Tocca il giocatore che pensi sia l'impostore. Puoi cambiare voto finché il tempo non scade."
    }>
      {note}
      <View style={styles.list}>
        {candidates.map(({uid, name}) => {
          const self = uid === playerId;
          const selected = uid === ownVote;
          const disabled = self || !canVote || busy || closed;
          return <View key={uid} style={[styles.row, selected && styles.selected]}>
            <PlayerSlot uid={uid} name={name} isMe={self} subtitle={null}
              disabled={disabled} onPress={disabled ? undefined : () => {setPending(pending === uid ? null : uid); setError(null);}}
              variant={self ? 'dimmed' : selected ? 'selected' : 'default'}
              right={pending === uid && !disabled ? <InlineConfirm onConfirm={() => {void confirm(uid);}} onCancel={() => setPending(null)} /> : selected ? <CheckIcon size={20} color={colors.primaryLight} /> : undefined} />
          </View>;
        })}
      </View>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {busy && <Text style={styles.note}>Invio del voto…</Text>}
      {closed && <Text style={styles.note}>Tempo scaduto. In attesa dell’esito.</Text>}
      <ProgressCounter completed={voteCount} total={totalVoters} suffix="hanno votato" style={{textAlign: 'center'}} />
    </PhaseCard>
  </View>;
}
const styles = StyleSheet.create({
  list: {width: '100%', marginTop: spacing.sm, marginBottom: spacing.lg},
  row: {backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, marginBottom: spacing.sm},
  selected: {borderColor: colors.primary},
  note: {fontFamily: fonts.body, color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.sm},
});
