/**
 * Pure decision logic for Lupus. Firebase- and JSON-free so Node tests can
 * import it directly; `random` is injected for deterministic tests.
 */

import type { LupusRole, LupusWinner } from '../types';

/** Sentinel vote value for an explicit abstention. */
export const ABSTAIN = 'abstain';

export interface RoleConfig {
  numLupi: number;
  veggenteEnabled: boolean;
  guardiaEnabled: boolean;
  mediumEnabled: boolean;
  boccaEnabled: boolean;
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function assignLupusRoles(
  uids: string[],
  config: RoleConfig,
  random: () => number = Math.random
): Record<string, LupusRole> {
  const shuffled = shuffle(uids, random);
  const roles: Record<string, LupusRole> = {};
  let cursor = 0;

  for (let i = 0; i < config.numLupi && cursor < shuffled.length; i++) {
    roles[shuffled[cursor++]] = 'lupo';
  }
  if (config.veggenteEnabled && cursor < shuffled.length) {
    roles[shuffled[cursor++]] = 'veggente';
  }
  if (config.guardiaEnabled && cursor < shuffled.length) {
    roles[shuffled[cursor++]] = 'guardia';
  }
  if (config.mediumEnabled && cursor < shuffled.length) {
    roles[shuffled[cursor++]] = 'medium';
  }
  if (config.boccaEnabled && cursor < shuffled.length) {
    roles[shuffled[cursor++]] = 'bocca';
  }
  while (cursor < shuffled.length) {
    roles[shuffled[cursor++]] = 'villico';
  }
  return roles;
}

/**
 * The wolves only strike when EVERY alive lupo picked the SAME target.
 * Returns the agreed target, or null (disagreement / missing picks = the
 * pack abstains).
 */
export function unanimousLupoTarget(
  lupoVotes: Record<string, string>,
  aliveLupiUids: string[]
): string | null {
  if (aliveLupiUids.length === 0) return null;
  let target: string | null = null;
  for (const uid of aliveLupiUids) {
    const pick = lupoVotes[uid];
    if (!pick) return null;
    if (target === null) target = pick;
    else if (pick !== target) return null;
  }
  return target;
}

/**
 * Applies the night defenses to the wolves' victim:
 * - the guardia's protection cancels the kill;
 * - Bocca di Rosa is not home: if the wolves pick HER nobody dies; if they
 *   pick the player she's visiting, both die.
 * Returns the list of deaths (possibly empty).
 */
export function applyNightDefenses(
  victim: string | null,
  protectTarget: string | null,
  boccaUid: string | null,
  boccaTarget: string | null
): string[] {
  if (!victim) return [];
  if (protectTarget && victim === protectTarget) return [];
  if (boccaUid && victim === boccaUid) return []; // not home tonight
  if (boccaUid && boccaTarget && victim === boccaTarget) return [victim, boccaUid];
  return [victim];
}

export type LynchOutcome =
  | { kind: 'eliminate'; uid: string }
  | { kind: 'runoff'; candidates: string[] }
  | { kind: 'nolynch' };

/**
 * Day vote: abstentions don't count; the most voted is eliminated. A tie
 * starts a runoff between the tied candidates; a tie IN the runoff (or no
 * effective votes) spares everyone.
 */
export function computeLynchOutcome(
  votes: Record<string, string>,
  isRunoff: boolean
): LynchOutcome {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    if (target === ABSTAIN) continue;
    counts[target] = (counts[target] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return { kind: 'nolynch' };

  const max = Math.max(...entries.map(([, c]) => c));
  const top = entries
    .filter(([, c]) => c === max)
    .map(([uid]) => uid)
    .sort();
  if (top.length === 1) return { kind: 'eliminate', uid: top[0] };
  return isRunoff ? { kind: 'nolynch' } : { kind: 'runoff', candidates: top };
}

export function lupusWinner(
  roles: Record<string, LupusRole>,
  alive: Record<string, boolean>
): LupusWinner {
  let aliveLupi = 0;
  let aliveOthers = 0;
  for (const [uid, role] of Object.entries(roles)) {
    if (alive[uid] === false) continue;
    if (role === 'lupo') aliveLupi++;
    else aliveOthers++;
  }
  if (aliveLupi === 0) return 'villaggio';
  if (aliveLupi >= aliveOthers) return 'lupi';
  return null;
}

export interface NightProgress {
  /** True when every alive lupo picked the same target. */
  lupiReady: boolean;
  needsProtect: boolean;
  protectDone: boolean;
  needsSeer: boolean;
  seerDone: boolean;
  needsBocca: boolean;
  boccaDone: boolean;
}

/** True once every awaited night action is in (early-close condition). */
export function isNightComplete(p: NightProgress): boolean {
  if (!p.lupiReady) return false;
  if (p.needsProtect && !p.protectDone) return false;
  if (p.needsSeer && !p.seerDone) return false;
  if (p.needsBocca && !p.boccaDone) return false;
  return true;
}
