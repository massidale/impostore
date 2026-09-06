import { retryAction } from '../../../core/services/retryAction';
import React, { useEffect, useRef } from 'react';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import {
  Button,
  HostDashboardShell,
  ProgressCounter,
  confirmDialog,
} from '../../../core/ui';
import { useCountdown } from '../../../core/hooks/useCountdown';
import { ImpostoreGameState } from '../types';
import {
  closeVotingByTimeout,
  endImpostoreGame,
  startVoting,
} from '../services/impostoreLogic';
import { getWaitingPlayerUids } from '../../../core/services/playerSelection';
import type { CorePlayer } from '../../../core/types/room';

export default function ImpostoreHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as ImpostoreGameState;
  const roomId = roomData.id;

  // The host's client closes the voting round when the timer expires —
  // late voters simply aren't counted (closeVotingByTimeout is idempotent).
  const isVoting = gameState.phase === 'voting';
  const remaining = useCountdown(isVoting ? gameState.votingEndsAt : null);
  useEffect(() => {
    if (!isVoting || remaining !== 0) return;
    return retryAction(() => closeVotingByTimeout(roomId));
  }, [isVoting, remaining, roomId]);

  const handleStartVoting = async () => {
    const ok = await confirmDialog({
      title: 'Avviare le votazioni?',
      message:
        'I giocatori non potranno più vedere i loro ruoli e dovranno votare chi eliminare.',
      confirmLabel: 'Avvia votazioni',
    });
    if (ok) startVoting(roomId);
  };

  const handleEndGame = async () => {
    const ok = await confirmDialog({
      title: 'Terminare la partita?',
      message:
        'La partita verrà chiusa per tutti i giocatori. Questa azione non può essere annullata.',
      confirmLabel: 'Termina',
      destructive: true,
    });
    if (ok) endImpostoreGame(roomId);
  };

  const allPlayers = roomData.players || {};
  const waitingUids = getWaitingPlayerUids(roomData);
  const playerCount = Object.keys(allPlayers).length - waitingUids.length;
  const readyCount = Object.entries(allPlayers).filter(
    ([, p]) => !(p as CorePlayer).waiting && (p as { revealed?: boolean }).revealed
  ).length;

  const waitingNames = waitingUids
    .map((uid) => (allPlayers[uid] as CorePlayer | undefined)?.name)
    .filter((n): n is string => !!n && n.length > 0);

  return (
    <HostDashboardShell
      gameName="Impostore"
      status={
        <ProgressCounter
          prefix="Pronti"
          completed={readyCount}
          total={playerCount}
          tone="primary"
        />
      }
      waitingNames={waitingNames}
      actions={
        <>
          {gameState.phase === 'playing' && (
            <Button onPress={handleStartVoting} variant="warningMuted" style={{ flex: 1 }}>
              Vai al Voto
            </Button>
          )}
          <Button onPress={handleEndGame} variant="dangerMuted" style={{ flex: 1 }}>
            Termina
          </Button>
        </>
      }
    />
  );
}
