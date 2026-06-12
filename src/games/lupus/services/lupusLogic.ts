import { ref, get } from 'firebase/database';
import { database } from '../../../../config/firebase';
import { CoreRoom } from '../../../core/types/room';
import { touchRoom } from '../../../core/services/roomService';
import { filterActivePlayerUids } from '../../../core/services/playerSelection';
import { EXTERNAL_NARRATOR, LupusGameState, LupusSettings } from '../types';
import {
  ABSTAIN,
  applyNightDefenses,
  assignLupusRoles,
  computeLynchOutcome,
  isNightComplete,
  lupusWinner,
  unanimousLupoTarget,
} from './lupusPure';

const GS = (roomId: string) => `rooms/${roomId}/gameState`;

async function readGameState(roomId: string): Promise<LupusGameState | null> {
  const snapshot = await get(ref(database, GS(roomId)));
  return snapshot.exists() ? (snapshot.val() as LupusGameState) : null;
}

/** Narrator mode (any kind): the app never resolves anything by itself. */
function hasNarrator(gs: LupusGameState): boolean {
  return !!gs.narratorUid;
}

export async function initLupusGame(roomId: string, settings: LupusSettings): Promise<void> {
  const initialState: LupusGameState = {
    phase: 'setup',
    numLupi: settings?.numLupi ?? 1,
    veggenteEnabled: settings?.veggenteEnabled ?? true,
    guardiaEnabled: settings?.guardiaEnabled ?? true,
    mediumEnabled: settings?.mediumEnabled ?? false,
    boccaEnabled: settings?.boccaEnabled ?? false,
    votingSeconds: settings?.votingSeconds ?? 90,
    nightSeconds: settings?.nightSeconds ?? 60,
    narratorEnabled: settings?.narratorEnabled ?? false,
    narratorUid: settings?.narratorEnabled ? settings?.narratorUid ?? null : null,
    customRolesList: settings?.narratorEnabled ? settings?.customRoles ?? null : null,
  };

  await touchRoom(roomId, {
    [`rooms/${roomId}/currentGameId`]: 'lupus',
    [GS(roomId)]: initialState,
  });
}

export async function startLupusGame(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<LupusGameState>;

  if (roomData.status !== 'lobby' && roomData.gameState?.phase !== 'setup') {
    throw new Error('La partita è già iniziata');
  }

  const gameState = roomData.gameState!;
  const isExternal = gameState.narratorUid === EXTERNAL_NARRATOR;
  const narratorUid =
    gameState.narratorEnabled &&
    gameState.narratorUid &&
    (isExternal || roomData.players?.[gameState.narratorUid])
      ? gameState.narratorUid
      : null;
  if (gameState.narratorEnabled && !narratorUid) {
    throw new Error('Scegli il narratore nelle impostazioni prima di avviare');
  }

  // An in-room narrator runs the game and does not receive a role.
  const playerUids = filterActivePlayerUids(roomData).filter(
    (uid) => uid !== narratorUid || isExternal
  );

  const numLupi = gameState.numLupi ?? 1;
  const specials =
    (gameState.veggenteEnabled ? 1 : 0) +
    (gameState.guardiaEnabled ? 1 : 0) +
    (gameState.mediumEnabled ? 1 : 0) +
    (gameState.boccaEnabled ? 1 : 0);

  if (playerUids.length < numLupi + 2) {
    throw new Error(
      `Servono almeno ${numLupi + 2} giocatori${narratorUid && !isExternal ? ' (oltre al narratore)' : ''} con ${numLupi} lup${numLupi === 1 ? 'o' : 'i'}`
    );
  }
  if (playerUids.length < numLupi + specials + 1) {
    throw new Error('Troppi ruoli speciali per i giocatori presenti: disattivane qualcuno');
  }

  const roles = assignLupusRoles(playerUids, {
    numLupi,
    veggenteEnabled: gameState.veggenteEnabled,
    guardiaEnabled: gameState.guardiaEnabled,
    mediumEnabled: gameState.mediumEnabled ?? false,
    boccaEnabled: gameState.boccaEnabled ?? false,
  });

  // Custom roles (narrator mode): dealt on top of random villagers. The app
  // treats them as villici — their powers are run by the narrator at the table.
  const customList = (gameState.customRolesList ?? []).filter(
    (r) => typeof r === 'string' && r.trim().length > 0
  );
  const customAssignments: Record<string, string> = {};
  if (narratorUid && customList.length > 0) {
    const villici = Object.entries(roles)
      .filter(([, role]) => role === 'villico')
      .map(([uid]) => uid);
    if (customList.length > villici.length) {
      throw new Error('Troppi ruoli personalizzati per i villici disponibili');
    }
    customList.forEach((roleName, i) => {
      customAssignments[villici[i]] = roleName.trim();
    });
  }

  const alive: Record<string, boolean> = {};
  playerUids.forEach((uid) => {
    alive[uid] = true;
  });

  // No narrator → the app runs the machine and the first night starts now.
  // Narrator (in-room or external) → standby: cards dealt, narrator leads.
  const startingPhase = narratorUid ? 'standby' : 'night';
  const nightEndsAt = narratorUid
    ? null
    : Date.now() + (gameState.nightSeconds ?? 60) * 1000;

  await touchRoom(roomId, {
    [`rooms/${roomId}/status`]: 'active',
    [`${GS(roomId)}/phase`]: startingPhase,
    // Narrator mode counts rounds from the first night poll he starts.
    [`${GS(roomId)}/round`]: narratorUid ? 0 : 1,
    [`${GS(roomId)}/roles`]: roles,
    [`${GS(roomId)}/customRoles`]:
      Object.keys(customAssignments).length > 0 ? customAssignments : null,
    [`${GS(roomId)}/alive`]: alive,
    [`${GS(roomId)}/narratorUid`]: narratorUid,
    [`${GS(roomId)}/night`]: null,
    [`${GS(roomId)}/nightEndsAt`]: nightEndsAt,
    [`${GS(roomId)}/lastNight`]: null,
    [`${GS(roomId)}/votes`]: null,
    [`${GS(roomId)}/votingEndsAt`]: null,
    [`${GS(roomId)}/runoffCandidates`]: null,
    [`${GS(roomId)}/lastLynch`]: null,
    [`${GS(roomId)}/lastNightReport`]: null,
    [`${GS(roomId)}/lastVoteReport`]: null,
    [`${GS(roomId)}/winner`]: null,
  });
}

// ── Night actions (submissions work the same with or without narrator) ──

export async function submitLupoVote(
  roomId: string,
  lupoUid: string,
  targetUid: string
): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'night') return;
  if (gameState.roles?.[lupoUid] !== 'lupo' || gameState.alive?.[lupoUid] !== true) return;
  if (gameState.roles?.[targetUid] === 'lupo' || gameState.alive?.[targetUid] !== true) return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/night/lupoVotes/${lupoUid}`]: targetUid,
  });
  await maybeResolveNightEarly(roomId);
}

export async function submitProtect(roomId: string, targetUid: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'night') return;
  if (gameState.alive?.[targetUid] !== true) return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/night/protectTarget`]: targetUid,
    [`${GS(roomId)}/night/protectDone`]: true,
  });
  await maybeResolveNightEarly(roomId);
}

export async function submitSeer(roomId: string, targetUid: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'night') return;
  if (gameState.alive?.[targetUid] !== true) return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/night/seerTarget`]: targetUid,
    [`${GS(roomId)}/night/seerDone`]: true,
  });
  await maybeResolveNightEarly(roomId);
}

export async function submitBoccaVisit(roomId: string, targetUid: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'night') return;
  if (gameState.alive?.[targetUid] !== true) return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/night/boccaTarget`]: targetUid,
    [`${GS(roomId)}/night/boccaDone`]: true,
  });
  await maybeResolveNightEarly(roomId);
}

function findAliveByRole(gameState: LupusGameState, role: string): string | null {
  const entry = Object.entries(gameState.roles ?? {}).find(
    ([uid, r]) => r === role && gameState.alive?.[uid] !== false
  );
  return entry ? entry[0] : null;
}

function nightProgressOf(gameState: LupusGameState) {
  const roles = gameState.roles ?? {};
  const alive = gameState.alive ?? {};
  const night = gameState.night ?? {};
  const aliveLupiUids = Object.entries(roles)
    .filter(([uid, role]) => role === 'lupo' && alive[uid] !== false)
    .map(([uid]) => uid);
  const agreedTarget = unanimousLupoTarget(night.lupoVotes ?? {}, aliveLupiUids);

  return {
    aliveLupiUids,
    agreedTarget,
    progress: {
      lupiReady: agreedTarget !== null,
      needsProtect: gameState.guardiaEnabled && !!findAliveByRole(gameState, 'guardia'),
      protectDone: !!night.protectDone,
      needsSeer: gameState.veggenteEnabled && !!findAliveByRole(gameState, 'veggente'),
      seerDone: !!night.seerDone,
      needsBocca: (gameState.boccaEnabled ?? false) && !!findAliveByRole(gameState, 'bocca'),
      boccaDone: !!night.boccaDone,
    },
  };
}

/**
 * Close the night early once every action is in (lupi unanimous included).
 * Auto mode resolves the deaths; a narrator poll just closes into its
 * report — the narrator still decides everything.
 */
async function maybeResolveNightEarly(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'night') return;

  const { progress } = nightProgressOf(gameState);
  if (!isNightComplete(progress)) return;

  if (hasNarrator(gameState)) {
    await narratorCloseNightPoll(roomId);
    return;
  }
  await resolveNightNow(roomId, gameState);
}

/**
 * Auto mode: closes the night at timer expiry — whoever hasn't acted
 * abstains (a non-unanimous wolf pack abstains too). Idempotent.
 */
export async function closeNightByTimeout(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'night') return;
  if (hasNarrator(gameState)) return;
  if (!gameState.nightEndsAt || Date.now() < gameState.nightEndsAt) return;
  await resolveNightNow(roomId, gameState);
}

async function resolveNightNow(roomId: string, gameState: LupusGameState): Promise<void> {
  const roles = gameState.roles ?? {};
  const alive = gameState.alive ?? {};
  const night = gameState.night ?? {};
  const { agreedTarget } = nightProgressOf(gameState);
  const boccaUid = findAliveByRole(gameState, 'bocca');

  const deaths = applyNightDefenses(
    agreedTarget,
    night.protectTarget ?? null,
    (gameState.boccaEnabled ?? false) && night.boccaDone ? boccaUid : null,
    night.boccaTarget ?? null
  );

  const updates: Record<string, unknown> = {
    [`${GS(roomId)}/night`]: null,
    [`${GS(roomId)}/nightEndsAt`]: null,
    [`${GS(roomId)}/lastNight`]: {
      victims: deaths.length > 0 ? deaths : null,
      round: gameState.round ?? 1,
    },
  };

  const newAlive = { ...alive };
  for (const uid of deaths) {
    newAlive[uid] = false;
    updates[`${GS(roomId)}/alive/${uid}`] = false;
  }

  const winner = lupusWinner(roles, newAlive);
  if (winner) {
    updates[`${GS(roomId)}/phase`] = 'results';
    updates[`${GS(roomId)}/winner`] = winner;
  } else {
    updates[`${GS(roomId)}/phase`] = 'day';
  }

  await touchRoom(roomId, updates);
}

// ── Day vote (auto mode) ──

export async function startLynchVoting(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'day') return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/phase`]: 'voting',
    [`${GS(roomId)}/votes`]: null,
    [`${GS(roomId)}/runoffCandidates`]: null,
    [`${GS(roomId)}/votingEndsAt`]: Date.now() + (gameState.votingSeconds ?? 90) * 1000,
  });
}

/** Vote a player or pass ABSTAIN to abstain. Changeable until the close. */
export async function castLupusVote(
  roomId: string,
  voterUid: string,
  targetUid: string
): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'voting') return;
  // Strict `!== true` also rejects the narrator (absent from the map).
  if (gameState.alive?.[voterUid] !== true) return;
  if (targetUid !== ABSTAIN) {
    if (gameState.alive?.[targetUid] !== true) return;
    const runoff = gameState.runoffCandidates;
    if (runoff && runoff.length > 0 && !runoff.includes(targetUid)) return;
  }

  await touchRoom(roomId, {
    [`${GS(roomId)}/votes/${voterUid}`]: targetUid,
  });

  // All alive players voted (or abstained) → close immediately. Narrator
  // polls close only by hand or timer: the narrator decides the outcome.
  const updated = await readGameState(roomId);
  if (!updated || updated.phase !== 'voting') return;
  if (hasNarrator(updated)) return;
  const aliveCount = Object.entries(updated.alive ?? {}).filter(([, a]) => a !== false).length;
  const votesCount = Object.keys(updated.votes ?? {}).length;
  if (votesCount >= aliveCount) {
    await closeLupusVoting(roomId);
  }
}

/**
 * Auto mode: closes the lynch vote (everyone voted, or the timer expired).
 * Late voters abstain; a first-round tie starts a runoff between the tied
 * candidates; a runoff tie spares everyone. Idempotent.
 */
export async function closeLupusVoting(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'voting') return;
  if (hasNarrator(gameState)) return;

  const roles = gameState.roles ?? {};
  const alive = { ...(gameState.alive ?? {}) };
  const isRunoff = !!(gameState.runoffCandidates && gameState.runoffCandidates.length > 0);
  const outcome = computeLynchOutcome(gameState.votes ?? {}, isRunoff);

  if (outcome.kind === 'runoff') {
    await touchRoom(roomId, {
      [`${GS(roomId)}/votes`]: null,
      [`${GS(roomId)}/runoffCandidates`]: outcome.candidates,
      [`${GS(roomId)}/votingEndsAt`]: Date.now() + (gameState.votingSeconds ?? 90) * 1000,
    });
    return;
  }

  const lynched = outcome.kind === 'eliminate' ? outcome.uid : null;
  const updates: Record<string, unknown> = {
    [`${GS(roomId)}/votes`]: null,
    [`${GS(roomId)}/votingEndsAt`]: null,
    [`${GS(roomId)}/runoffCandidates`]: null,
    [`${GS(roomId)}/lastLynch`]: {
      uid: lynched,
      role: lynched ? roles[lynched] ?? null : null,
      round: gameState.round ?? 1,
    },
  };

  if (lynched) {
    alive[lynched] = false;
    updates[`${GS(roomId)}/alive/${lynched}`] = false;
  }

  const winner = lupusWinner(roles, alive);
  if (winner) {
    updates[`${GS(roomId)}/phase`] = 'results';
    updates[`${GS(roomId)}/winner`] = winner;
  } else {
    // Dusk recap: announce the verdict; the HOST starts the night by hand.
    updates[`${GS(roomId)}/phase`] = 'dusk';
  }

  await touchRoom(roomId, updates);
}

/** Auto mode: the host manually starts the next night after the dusk recap. */
export async function startLupusNight(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'dusk') return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/phase`]: 'night',
    [`${GS(roomId)}/round`]: (gameState.round ?? 1) + 1,
    [`${GS(roomId)}/night`]: null,
    [`${GS(roomId)}/nightEndsAt`]: Date.now() + (gameState.nightSeconds ?? 60) * 1000,
    [`${GS(roomId)}/lastNight`]: null,
  });
}

// ── Narrator tools (the app never applies outcomes here — it informs) ──

export async function narratorStartNightPoll(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'standby') return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/phase`]: 'night',
    [`${GS(roomId)}/night`]: null,
    [`${GS(roomId)}/nightEndsAt`]: Date.now() + (gameState.nightSeconds ?? 60) * 1000,
    [`${GS(roomId)}/round`]: (gameState.round ?? 0) + 1,
    [`${GS(roomId)}/lastNightReport`]: null,
  });
}

/** Ends the night poll: the actions become a report; nobody dies by app. */
export async function narratorCloseNightPoll(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'night') return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/phase`]: 'standby',
    [`${GS(roomId)}/lastNightReport`]: gameState.night ?? null,
    [`${GS(roomId)}/night`]: null,
    [`${GS(roomId)}/nightEndsAt`]: null,
  });
}

export async function narratorStartVotePoll(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'standby') return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/phase`]: 'voting',
    [`${GS(roomId)}/votes`]: null,
    [`${GS(roomId)}/runoffCandidates`]: null,
    [`${GS(roomId)}/votingEndsAt`]: Date.now() + (gameState.votingSeconds ?? 90) * 1000,
    [`${GS(roomId)}/lastVoteReport`]: null,
  });
}

/** Ends the vote poll: the ballots become a report; the narrator decides. */
export async function narratorCloseVotePoll(roomId: string): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase !== 'voting') return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/phase`]: 'standby',
    [`${GS(roomId)}/lastVoteReport`]: {
      votes: gameState.votes ?? null,
      round: gameState.round ?? 1,
    },
    [`${GS(roomId)}/votes`]: null,
    [`${GS(roomId)}/votingEndsAt`]: null,
  });
}

/**
 * Narrator bookkeeping: flip a player's alive state. No win checks — the
 * narrator runs the game and declares the ending himself.
 */
export async function narratorSetAlive(
  roomId: string,
  targetUid: string,
  aliveValue: boolean
): Promise<void> {
  const gameState = await readGameState(roomId);
  if (!gameState || gameState.phase === 'setup' || gameState.phase === 'results') return;
  if (!gameState.roles?.[targetUid]) return;

  await touchRoom(roomId, {
    [`${GS(roomId)}/alive/${targetUid}`]: aliveValue,
  });
}

export async function endLupusGame(roomId: string): Promise<void> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) throw new Error('Stanza non trovata');
  const roomData = snapshot.val() as CoreRoom<LupusGameState>;
  const playerUids = Object.keys(roomData.players || {});

  const updates: { [key: string]: unknown } = {
    [`rooms/${roomId}/status`]: 'lobby',
    [`${GS(roomId)}/phase`]: 'setup',
    [`${GS(roomId)}/round`]: null,
    [`${GS(roomId)}/roles`]: null,
    [`${GS(roomId)}/customRoles`]: null,
    [`${GS(roomId)}/alive`]: null,
    [`${GS(roomId)}/night`]: null,
    [`${GS(roomId)}/nightEndsAt`]: null,
    [`${GS(roomId)}/lastNight`]: null,
    [`${GS(roomId)}/votes`]: null,
    [`${GS(roomId)}/votingEndsAt`]: null,
    [`${GS(roomId)}/runoffCandidates`]: null,
    [`${GS(roomId)}/lastLynch`]: null,
    [`${GS(roomId)}/lastNightReport`]: null,
    [`${GS(roomId)}/lastVoteReport`]: null,
    [`${GS(roomId)}/winner`]: null,
  };

  playerUids.forEach((uid) => {
    // Promote waiting spectators to full players for the next round.
    updates[`rooms/${roomId}/players/${uid}/waiting`] = null;
  });

  await touchRoom(roomId, updates);
}
