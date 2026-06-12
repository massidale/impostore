import React from 'react';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import {
  Button,
  HostDashboardShell,
  ProgressCounter,
  confirmDialog,
} from '../../../core/ui';
import { TabooGameState } from '../types';
import { endTabooGame, endTabooTurn } from '../services/tabooLogic';
import { getWaitingPlayerUids } from '../../../core/services/playerSelection';
import type { CorePlayer } from '../../../core/types/room';

export default function TabooHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as TabooGameState;
  const roomId = roomData.id;
  const allPlayers = roomData.players || {};

  const totalTurns = (gameState.turnsPerTeam ?? 0) * 2;
  const playedTurns = Math.min((gameState.turnNumber ?? 0) + (gameState.phase === 'results' ? 1 : 0), totalTurns);

  const waitingUids = getWaitingPlayerUids(roomData);
  const waitingNames = waitingUids
    .map((uid) => (allPlayers[uid] as CorePlayer | undefined)?.name)
    .filter((n): n is string => !!n && n.length > 0);

  const handleEndTurn = async () => {
    const ok = await confirmDialog({
      title: 'Terminare il turno?',
      message: 'Il turno in corso verrà chiuso e si passerà alla squadra successiva.',
      confirmLabel: 'Termina turno',
    });
    if (ok) endTabooTurn(roomId);
  };

  const handleEndGame = async () => {
    const ok = await confirmDialog({
      title: 'Terminare la partita?',
      message: 'La partita verrà chiusa per tutti i giocatori.',
      confirmLabel: 'Termina',
      destructive: true,
    });
    if (ok) endTabooGame(roomId);
  };

  return (
    <HostDashboardShell
      gameName="Taboo"
      status={
        <ProgressCounter
          prefix="Turni"
          completed={playedTurns}
          total={totalTurns}
          tone="primary"
        />
      }
      waitingNames={waitingNames}
      actions={
        <>
          {gameState.phase === 'turn' && (
            <Button onPress={handleEndTurn} variant="warningMuted" style={{ flex: 1 }}>
              Termina turno
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
