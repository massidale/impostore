import { roomCommand } from '../../../core/services/roomCommand';

export async function initImpostoreGame(roomId: string, numImpostors: number, numClowns: number, hintEnabled: boolean, hintOnlyFirst: boolean, votingSeconds: number = 60): Promise<void> {
  await roomCommand(roomId, 'initImpostoreGame', [numImpostors, numClowns, hintEnabled, hintOnlyFirst, votingSeconds]);
}

export async function resetImpostoreUsedWords(roomId: string): Promise<void> {
  await roomCommand(roomId, 'resetImpostoreUsedWords', []);
}

export async function startImpostoreGame(roomId: string): Promise<void> {
  await roomCommand(roomId, 'startImpostoreGame', []);
}

export async function endImpostoreGame(roomId: string): Promise<void> {
  await roomCommand(roomId, 'endImpostoreGame', []);
}

export async function markPlayerAsRevealed(roomId: string, playerUid: string): Promise<void> {
  await roomCommand(roomId, 'markPlayerAsRevealed', [playerUid]);
}

export async function startVoting(roomId: string): Promise<void> {
  await roomCommand(roomId, 'startVoting', []);
}

export async function castVote(roomId: string, voterUid: string, votedUid: string): Promise<void> {
  await roomCommand(roomId, 'castVote', [voterUid, votedUid]);
}

export async function closeVotingByTimeout(roomId: string): Promise<void> {
  await roomCommand(roomId, 'closeVotingByTimeout', []);
}

export async function submitImpostorGuess(roomId: string, guess: string): Promise<void> {
  await roomCommand(roomId, 'submitImpostorGuess', [guess]);
}

export async function updateImpostoreSettings(roomId: string, settings: {
        numImpostors?: number;
        numClowns?: number;
        hintEnabled?: boolean;
        hintOnlyFirst?: boolean;
        votingSeconds?: number;
    }): Promise<void> {
  await roomCommand(roomId, 'updateImpostoreSettings', [settings]);
}
