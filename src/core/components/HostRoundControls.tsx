import React from 'react';
import type { CoreRoom } from '../types/room';
import { HostDashboardShell } from '../ui';
import { roomCommand } from '../services/roomCommand';
import { EndActionsRow } from './EndActionsRow';

export function HostRoundControls({roomData, gameName, children}: {roomData:CoreRoom<any>; gameName:string; children?: React.ReactNode}) {
  const phase=roomData.gameState?.phase;
  const send=(action:string)=>roomCommand(roomData.id,`${roomData.currentGameId}.${action}`);
  return <HostDashboardShell gameName={gameName}
    waitingNames={Object.values(roomData.players??{}).filter(p=>p.waiting).map(p=>p.name??'Giocatore')}
    actions={<EndActionsRow
      round={!['idle','results','roundResults'].includes(phase) ? {
        onConfirm: () => send('cancelRound'),
        message: 'La fase in corso verrà annullata e verrà mostrato il suo esito.',
      } : undefined}
      game={{onConfirm: () => send('end')}}
    />}
  >{children}</HostDashboardShell>;
}
