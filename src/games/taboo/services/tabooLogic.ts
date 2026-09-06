import { roomCommand } from '../../../core/services/roomCommand';
import type { TabooSettings } from '../types';
import type { CardOutcome } from './tabooPure';

export async function initTabooGame(roomId: string, settings: TabooSettings): Promise<void> {
  await roomCommand(roomId, 'initTabooGame', [settings]);
}

export async function startTabooGame(roomId: string): Promise<void> {
  await roomCommand(roomId, 'startTabooGame', []);
}

export async function beginTabooTurn(roomId: string): Promise<void> {
  await roomCommand(roomId, 'beginTabooTurn', []);
}

export async function resolveTabooCard(roomId: string, outcome: CardOutcome): Promise<void> {
  await roomCommand(roomId, 'resolveTabooCard', [outcome]);
}

export async function undoTabooCard(roomId: string): Promise<void> {
  await roomCommand(roomId, 'undoTabooCard', []);
}

export async function endTabooTurn(roomId: string): Promise<void> {
  await roomCommand(roomId, 'endTabooTurn', []);
}

export async function endTabooGame(roomId: string): Promise<void> {
  await roomCommand(roomId, 'endTabooGame', []);
}
