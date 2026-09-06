export type TeamId = 'blue' | 'red';
export interface TeamAssignment { teams: Record<string, TeamId>; turnOrder: {blue: string[]; red: string[]}; }
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

  // The rosters drive the describer rotation, so shuffle them: the host picks
  // who is on which team, never who describes first.
  return {
    teams,
    turnOrder: {
      blue: shuffleArray(turnOrder.blue, random),
      red: shuffleArray(turnOrder.red, random),
    },
  };
}

