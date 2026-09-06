/** Shared ballot mechanics. Each game decides what to do with ties and eliminations. */
export function tallyVotes(votes: Record<string, string>) {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    Object.defineProperty(counts, target, {
      value: (Object.hasOwn(counts, target) ? counts[target] : 0) + 1,
      enumerable: true, configurable: true, writable: true,
    });
  }
  const max = Math.max(0, ...Object.values(counts));
  return { counts, leaders: Object.keys(counts).filter(id => counts[id] === max) };
}

export function validateVote({voter, target, eligible, candidates, endsAt, now}: {
  voter: string; target: string; eligible: string[]; candidates: string[];
  endsAt: number; now: number;
}): void {
  if (!(now < endsAt)) throw new Error('Votazione scaduta');
  if (!eligible.includes(voter)) throw new Error('Non puoi votare');
  if (target === voter || !eligible.includes(target) || !candidates.includes(target))
    throw new Error('Vota un altro candidato');
}

export function hasEveryoneVoted(votes: Record<string, string>, eligible: string[]): boolean {
  return eligible.length > 0 && eligible.every(uid => Object.hasOwn(votes, uid));
}
