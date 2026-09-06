import React from 'react';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import {
  Button,
  HostDashboardShell,
  ProgressCounter,
  confirmDialog,
} from '../../../core/ui';
import { endIndovinaGame } from '../services/indovinaLogic';
import { getWaitingPlayerUids } from '../../../core/services/playerSelection';
import type { CorePlayer } from '../../../core/types/room';

export default function IndovinaHostDashboard({ roomData }: HostDashboardProps) {
  const roomId = roomData.id;
  const allPlayers = roomData.players || {};
  const activeEntries = Object.entries(allPlayers).filter(
    ([, p]) => !(p as CorePlayer).waiting
  );
  const playerCount = activeEntries.length;

  const waitingUids = getWaitingPlayerUids(roomData);
  const waitingNames = waitingUids
    .map((uid) => (allPlayers[uid] as CorePlayer | undefined)?.name)
    .filter((n): n is string => !!n && n.length > 0);

  const handleEndGame = async () => {
    const ok = await confirmDialog({
      title: 'Terminare la partita?',
      message: 'La partita verrà chiusa per tutti i giocatori.',
      confirmLabel: 'Termina',
      destructive: true,
    });
    if (ok) endIndovinaGame(roomId);
  };

  return (
    <HostDashboardShell
      gameName="Indovina"
      status={
          <ProgressCounter
            prefix="Giocatori"
            completed={playerCount}
            total={playerCount}
            tone="primary"
          />
      }
      waitingNames={waitingNames}
      actions={
        <Button onPress={handleEndGame} variant="dangerMuted" style={{ flex: 1 }}>
          Termina
        </Button>
      }
    />
  );
}
