import React, { useState } from 'react';
import type { HostDashboardProps } from '../../../core/types/gamePlugin';
import { HostRoundControls } from '../../../core/components/HostRoundControls';
import { Button, ErrorBanner } from '../../../core/ui';
import type { WavelengthView } from '../types';
import { roomCommand } from '../../../core/services/roomCommand';
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replay = async () => {
    setBusy(true); setError(null);
    try { await roomCommand(roomData.id, 'wavelength.replay'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Riprova'); }
    finally { setBusy(false); }
  };
  return <HostRoundControls roomData={roomData} gameName="Wavelength">
    {error && <ErrorBanner message={error} />}
    {(roomData.gameState as WavelengthView | undefined)?.phase === 'results' && <Button disabled={busy} onPress={replay} style={{ marginBottom: 8 }}>Gioca ancora</Button>}
  </HostRoundControls>;
}
