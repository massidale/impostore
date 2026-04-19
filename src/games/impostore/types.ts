import { CorePlayer } from '../../core/types/room';

export type ImpostoreGamePhase = 'setup' | 'playing' | 'voting' | 'impostor_guess' | 'results';

export type Winner = 'civilians' | 'impostor' | 'clown' | null;

export type PlayerRole = 'civilian' | 'impostor' | 'clown' | null;

export interface ImpostorePlayerState extends CorePlayer {
  role: PlayerRole;
  isFirst?: boolean;
  revealed?: boolean;
}

export interface ImpostoreGameState {
  phase: ImpostoreGamePhase;
  word: string;
  hint?: string;
  
  // Settings
  numImpostors: number;
  numClowns: number;
  hintEnabled: boolean;
  hintOnlyFirst: boolean;
  
  firstPlayerId?: string;
  
  // Voting data
  votes?: {
    [voterUid: string]: string; // voterUid -> votedUid
  };
  runoffCandidates?: string[];
  eliminatedPlayer?: string;
  eliminatedRole?: PlayerRole;
  winner?: Winner;
  impostorGuess?: string;
}
