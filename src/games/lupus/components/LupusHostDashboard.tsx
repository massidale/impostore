import { EndActionButton } from '../../../core/components/EndActionButton';
import React, { useEffect, useRef } from 'react';
import { HostDashboardProps } from '../../../core/types/gamePlugin';
import {
  Button,
  HostDashboardShell,
  ProgressCounter,
  confirmDialog,
} from '../../../core/ui';
import { useCountdown } from '../../../core/hooks/useCountdown';
import { LupusGameState } from '../types';
import {
  closeLupusVoting,
  closeNightByTimeout,
  endLupusGame,
  startLupusNight,
  startLynchVoting,
} from '../services/lupusLogic';
import { getWaitingPlayerUids } from '../../../core/services/playerSelection';
import type { CorePlayer } from '../../../core/types/room';

export default function LupusHostDashboard({ roomData }: HostDashboardProps) {
  const gameState = roomData.gameState as LupusGameState;
  const roomId = roomData.id;
  const allPlayers = roomData.players || {};

  const aliveEntries = Object.entries(gameState.alive ?? {});
  const aliveCount = aliveEntries.filter(([, a]) => a !== false).length;
  const totalCount = aliveEntries.length;

  const waitingUids = getWaitingPlayerUids(roomData);
  const waitingNames = waitingUids
    .map((uid) => (allPlayers[uid] as CorePlayer | undefined)?.name)
    .filter((n): n is string => !!n && n.length > 0);

  // Auto mode only: the host's client closes expired night/vote timers.
  // With a narrator the polls are closed from his console.
  const isAuto = !gameState.narratorUid;
  const isVoting = isAuto && gameState.phase === 'voting';
  const isNight = isAuto && gameState.phase === 'night';
  const voteRemaining = useCountdown(isVoting ? gameState.votingEndsAt : null);
  const nightRemaining = useCountdown(isNight ? gameState.nightEndsAt : null);
  const closingRef = useRef(false);
  useEffect(() => {
    const expired =
      (isVoting && voteRemaining === 0) || (isNight && nightRemaining === 0);
    if (!expired || closingRef.current) return;
    closingRef.current = true;
    const close = isVoting ? closeLupusVoting(roomId) : closeNightByTimeout(roomId);
    close
      .catch(() => {})
      .finally(() => {
        closingRef.current = false;
      });
  }, [isVoting, isNight, voteRemaining, nightRemaining, roomId]);

  const handleStartVoting = async () => {
    const ok = await confirmDialog({
      title: 'Avviare la votazione?',
      message: 'Il villaggio voterà chi eliminare entro il tempo limite.',
      confirmLabel: 'Avvia votazione',
    });
    if (ok) startLynchVoting(roomId);
  };

  const handleStartNight = async () => {
    const ok = await confirmDialog({
      title: 'Avviare la notte?',
      message: 'Il villaggio si addormenta: i ruoli agiranno entro il tempo limite.',
      confirmLabel: 'Avvia notte',
    });
    if (ok) startLupusNight(roomId);
  };



  return (
    <HostDashboardShell
      gameName="Lupus"
      status={
        <ProgressCounter prefix="Vivi" completed={aliveCount} total={totalCount} tone="primary" />
      }
      waitingNames={waitingNames}
      actions={
        <>
          {isAuto && gameState.phase === 'day' && (
            <Button onPress={handleStartVoting} variant="warningMuted" style={{ flex: 1 }}>
              Avvia votazione
            </Button>
          )}
          {isAuto && gameState.phase === 'dusk' && (
            <Button onPress={handleStartNight} variant="warningMuted" style={{ flex: 1 }}>
              Avvia notte
            </Button>
          )}
          <EndActionButton kind="game" onConfirm={() => endLupusGame(roomId)} style={{ flex: 1 }} />
        </>
      }
    />
  );
}
