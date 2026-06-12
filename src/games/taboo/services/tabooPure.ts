/**
 * Pure helpers for the Taboo game. Kept JSON- and Firebase-free so tests can
 * import them directly under Node's strip-types loader. `random` is injected
 * everywhere so tests can be deterministic.
 */

import type { Scores, TeamId } from '../types';

export type CardOutcome = 'correct' | 'taboo' | 'skip';

export interface TeamAssignment {
  teams: Record<string, TeamId>;
  turnOrder: { blue: string[]; red: string[] };
}

export interface NextTurnResult {
  kind: 'turn';
  team: TeamId;
  describerUid: string;
  turnNumber: number;
}

export interface GameOverResult {
  kind: 'results';
}

/** Fisher–Yates shuffle on a copy. */
export function shuffleArray<T>(arr: T[], random: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffles the players and deals them alternately into the two teams,
 * so rosters never differ by more than one player.
 */
export function splitTeams(
  uids: string[],
  random: () => number = Math.random
): TeamAssignment {
  const shuffled = shuffleArray(uids, random);
  const teams: Record<string, TeamId> = {};
  const turnOrder = { blue: [] as string[], red: [] as string[] };

  shuffled.forEach((uid, i) => {
    const team: TeamId = i % 2 === 0 ? 'blue' : 'red';
    teams[uid] = team;
    turnOrder[team].push(uid);
  });

  return { teams, turnOrder };
}

/**
 * Builds the team assignment from the host's manual choices (if any).
 * Players missing from the manual map — e.g. joined after the host
 * assigned teams — are dealt to the smaller roster; stale entries for
 * players who left are ignored. With no manual map it falls back to
 * the balanced random split.
 */
export function buildTeams(
  uids: string[],
  manual: Partial<Record<string, TeamId>> | null | undefined,
  random: () => number = Math.random
): TeamAssignment {
  if (!manual || Object.keys(manual).length === 0) {
    return splitTeams(uids, random);
  }

  const teams: Record<string, TeamId> = {};
  const turnOrder = { blue: [] as string[], red: [] as string[] };
  const unassigned: string[] = [];

  for (const uid of uids) {
    const t = manual[uid];
    if (t === 'blue' || t === 'red') {
      teams[uid] = t;
      turnOrder[t].push(uid);
    } else {
      unassigned.push(uid);
    }
  }

  for (const uid of shuffleArray(unassigned, random)) {
    const t: TeamId = turnOrder.blue.length <= turnOrder.red.length ? 'blue' : 'red';
    teams[uid] = t;
    turnOrder[t].push(uid);
  }

  return { teams, turnOrder };
}

/** Blue plays even turns, red plays odd turns. */
export function teamForTurn(turnNumber: number): TeamId {
  return turnNumber % 2 === 0 ? 'blue' : 'red';
}

/** Round-robin describer within a team roster (wraps). */
export function describerForTurn(order: string[], teamTurnIndex: number): string {
  return order[teamTurnIndex % order.length];
}

/**
 * Computes the turn that follows the just-completed `turnNumber`,
 * or signals the end of the game once both teams played `turnsPerTeam` turns.
 */
export function nextTurn(params: {
  turnNumber: number;
  turnsPerTeam: number;
  turnOrder: { blue: string[]; red: string[] };
}): NextTurnResult | GameOverResult {
  const next = params.turnNumber + 1;
  if (next >= params.turnsPerTeam * 2) {
    return { kind: 'results' };
  }
  const team = teamForTurn(next);
  const teamTurnIndex = Math.floor(next / 2);
  return {
    kind: 'turn',
    team,
    describerUid: describerForTurn(params.turnOrder[team], teamTurnIndex),
    turnNumber: next,
  };
}

/** Correct guess +1, taboo violation −1, skip 0. Returns a new object. */
export function applyOutcome(scores: Scores, team: TeamId, outcome: CardOutcome): Scores {
  const delta = outcome === 'correct' ? 1 : outcome === 'taboo' ? -1 : 0;
  return { ...scores, [team]: scores[team] + delta };
}

export function winnerFromScores(scores: Scores): TeamId | 'tie' {
  if (scores.blue > scores.red) return 'blue';
  if (scores.red > scores.blue) return 'red';
  return 'tie';
}
