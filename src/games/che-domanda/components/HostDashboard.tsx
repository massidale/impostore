import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { HostDashboardProps } from '../../../core/types/gamePlugin';
import { HostDashboardShell, Button, ErrorBanner, ProgressCounter, confirmDialog, spacing } from '../../../core/ui';
import { EndActionButton } from '../../../core/components/EndActionButton';
import { roomCommand } from '../../../core/services/roomCommand';
import type { CheDomandaView } from '../types';

export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = roomData.gameState as CheDomandaView;
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (s.phase !== 'voting') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [s.phase]);
  const send = async (action: string) => {
    setBusy(true);
    setError(null);
    try { await roomCommand(roomData.id, `che-domanda.${action}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Riprova'); }
    finally { setBusy(false); }
  };

  const handleStartVoting = async () => {
    const answered = s.answeredUids?.length ?? 0;
    const total = s.participantUids?.length ?? 0;
    if (answered < total) {
      const ok = await confirmDialog({
        title: 'Non tutti hanno risposto',
        message: `${total - answered} giocatore/i non ha/anno ancora risposto. Avviare comunque le votazioni?`,
        confirmLabel: 'Vai al voto',
      });
      if (!ok) return;
    }
    send('startVoting');
  };

  return (
    <HostDashboardShell
      gameName="Che domanda?"
      status={
        s.phase === 'answering' ? (
          <ProgressCounter
            prefix="Risposte"
            completed={s.answeredUids?.length ?? 0}
            total={s.participantUids?.length ?? 0}
            tone="primary"
          />
        ) : null
      }
      waitingNames={Object.values(roomData.players ?? {}).filter(p => p.waiting).map(p => p.name ?? 'Giocatore')}
      actions={
        <>
          {s.phase === 'discussion' && (
            <Button onPress={handleStartVoting} variant="warningMuted" disabled={busy} style={{ flex: 1 }}>
              Vai al Voto
            </Button>
          )}
          {s.phase === 'voting' && now >= (s.votingEndsAt ?? Infinity) && (
            <Button onPress={() => send('closeVoting')} disabled={busy} style={{ flex: 1 }}>
              Chiudi voto scaduto
            </Button>
          )}
          {s.phase === 'elimination' && !s.winner && (
            <Button onPress={() => send('continueRound')} disabled={busy} style={{ flex: 1 }}>
              Continua
            </Button>
          )}
          <EndActionButton kind="game" onConfirm={() => send('end')} style={{ flex: 1 }} />
        </>
      }
    >
      {error && <ErrorBanner message={error} />}
    </HostDashboardShell>
  );
}
