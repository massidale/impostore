import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { HostDashboardProps } from '../../../core/types/gamePlugin';
import { HostRoundControls } from '../../../core/components/HostRoundControls';
import { Button, ErrorBanner, spacing } from '../../../core/ui';
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
  return <HostRoundControls roomData={roomData} gameName="Che domanda?">
    <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
      {error && <ErrorBanner message={error} />}
      {s.phase === 'discussion' && <Button disabled={busy} onPress={() => send('startVoting')}>Apri voto (60 secondi)</Button>}
      {s.phase === 'voting' && now >= (s.votingEndsAt ?? Infinity) && <Button disabled={busy} onPress={() => send('closeVoting')}>Chiudi voto scaduto</Button>}
      {s.phase === 'elimination' && <Button disabled={busy} onPress={() => send('continueRound')}>{s.winner ? 'Mostra risultati finali' : 'Nuovo giro di discussione'}</Button>}
    </View>
  </HostRoundControls>;
}
