/**
 * Pure decision logic for the Impostore voting round, factored out of
 * `impostoreLogic.ts` so it can be exhaustively tested without touching
 * Firebase. Mirrors the existing semantics:
 *
 *   1. Tally the votes.
 *   2. If a single uid has the most votes → eliminate.
 *   3. If multiple tied AND this isn't already a runoff → start a runoff
 *      between the tied candidates.
 *   4. If multiple tied AND we're in a runoff → the first player's vote
 *      counts double. If that resolves the tie, eliminate the winner.
 *      Otherwise pick at random from the still-tied set.
 */

export type VoteOutcome =
  | { kind: 'eliminate'; uid: string }
  | { kind: 'runoff'; candidates: string[] };

export interface ComputeVoteOutcomeInput {
  /** voterUid → votedUid */
  votes: Record<string, string>;
  /** Non-empty when this evaluation is itself a runoff round. */
  runoffCandidates: string[] | null;
  /** UID of the first player; their vote breaks runoff ties (counts double). */
  firstPlayerId: string | null;
  random?: () => number;
}

export function computeVoteOutcome(input: ComputeVoteOutcomeInput): VoteOutcome {
  const { votes, runoffCandidates, firstPlayerId, random = Math.random } = input;

  const isRunoff = !!(runoffCandidates && runoffCandidates.length > 0);

  const counts: Record<string, number> = {};
  for (const votedUid of Object.values(votes)) {
    counts[votedUid] = (counts[votedUid] || 0) + 1;
  }

  if (Object.keys(counts).length === 0) {
    throw new Error('No votes to evaluate');
  }

  const maxVotes = Math.max(...Object.values(counts));
  let topVoted = Object.entries(counts)
    .filter(([, c]) => c === maxVotes)
    .map(([uid]) => uid);

  if (topVoted.length === 1) {
    return { kind: 'eliminate', uid: topVoted[0] };
  }

  if (!isRunoff) {
    return { kind: 'runoff', candidates: topVoted };
  }

  // Runoff tiebreaker: first player's vote counts double.
  const firstPlayerVote = firstPlayerId ? votes[firstPlayerId] : undefined;
  if (firstPlayerVote && counts[firstPlayerVote] !== undefined) {
    counts[firstPlayerVote] += 1;
    const newMax = Math.max(...Object.values(counts));
    topVoted = Object.entries(counts)
      .filter(([, c]) => c === newMax)
      .map(([uid]) => uid);
    if (topVoted.length === 1) {
      return { kind: 'eliminate', uid: topVoted[0] };
    }
  }

  // Still tied → random pick among tied candidates.
  const chosen = topVoted[Math.floor(random() * topVoted.length)];
  return { kind: 'eliminate', uid: chosen };
}
