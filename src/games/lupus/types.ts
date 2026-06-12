/** 'standby' is the narrator-mode resting state: players hold their role
 *  card while the narrator runs the table (polls are optional tools).
 *  'dusk' is the auto-mode recap after the lynch vote: the verdict is
 *  announced and the host starts the next night manually. */
export type LupusPhase = 'setup' | 'standby' | 'night' | 'day' | 'dusk' | 'voting' | 'results';

/** narratorUid sentinel: the narrator is a person without the app — the
 *  game only deals the role cards. */
export const EXTERNAL_NARRATOR = 'external';

export type LupusRole = 'lupo' | 'villico' | 'veggente' | 'guardia' | 'medium' | 'bocca';

export type LupusWinner = 'lupi' | 'villaggio' | null;

export interface LupusSettings {
  numLupi: number;
  veggenteEnabled: boolean;
  guardiaEnabled: boolean;
  mediumEnabled: boolean;
  boccaEnabled: boolean;
  votingSeconds: number;
  /** Length of the night phase in seconds — missing actions abstain. */
  nightSeconds: number;
  /** Narrator mode: a chosen person runs the game; the app only informs. */
  narratorEnabled: boolean;
  /** Uid of the narrator, or EXTERNAL_NARRATOR (cards-only mode). */
  narratorUid?: string | null;
  /** Extra free-form roles, dealt to random villagers (narrator mode only). */
  customRoles?: string[] | null;
}

export interface LupusNightState {
  /** Each alive lupo's pick. */
  lupoVotes?: { [lupoUid: string]: string };
  /** Guardia's protected player. */
  protectTarget?: string | null;
  protectDone?: boolean;
  /** Veggente's inspected player (their role is read client-side). */
  seerTarget?: string | null;
  seerDone?: boolean;
  /** Bocca di Rosa's companion for the night. */
  boccaTarget?: string | null;
  boccaDone?: boolean;
}

export interface LupusGameState {
  phase: LupusPhase;

  // Settings
  numLupi: number;
  veggenteEnabled: boolean;
  guardiaEnabled: boolean;
  mediumEnabled: boolean;
  boccaEnabled: boolean;
  votingSeconds: number;
  nightSeconds?: number;
  narratorEnabled?: boolean;
  narratorUid?: string | null;
  /** Raw custom-role names from settings; dealt at startGame. */
  customRolesList?: string[] | null;

  // Session — roles and liveness live in gameState (the per-player RTDB
  // schema whitelists impostore-specific fields only).
  round?: number;
  roles?: { [uid: string]: LupusRole };
  /** Custom role names dealt on top of 'villico' (narrator mode). */
  customRoles?: { [uid: string]: string } | null;
  alive?: { [uid: string]: boolean };

  night?: LupusNightState | null;
  /** Epoch ms when the running night expires (missing actions abstain). */
  nightEndsAt?: number | null;
  /** Dawn announcement: who died last night (names only, no details). */
  lastNight?: { victims?: string[] | null; round: number } | null;

  votingEndsAt?: number | null;
  votes?: { [voterUid: string]: string } | null;
  /** Tie in the first round → runoff restricted to these candidates. */
  runoffCandidates?: string[] | null;
  /** Result of the last lynch vote (uid null = tie, nobody eliminated). */
  lastLynch?: { uid: string | null; role: LupusRole | null; round: number } | null;

  // Narrator-mode reports: the app applies NOTHING, it only informs.
  lastNightReport?: LupusNightState | null;
  lastVoteReport?: { votes?: { [voterUid: string]: string } | null; round: number } | null;

  winner?: LupusWinner;
}
