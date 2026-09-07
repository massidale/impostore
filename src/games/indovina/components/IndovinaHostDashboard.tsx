import { EndActionButton } from '../../../core/components/EndActionButton';
import React from 'react';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import {
  HostDashboardShell,
  ProgressCounter,
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
        <EndActionButton kind="game" onConfirm={() => endIndovinaGame(roomId)} style={{ flex: 1 }} />
      }
    />
  );
}
