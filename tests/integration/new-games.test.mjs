import test from "node:test";
import assert from "node:assert/strict";
const project = "demo-gameshub";
async function newUser() {
  if (process.env.ROOM_TRANSPORT === 'spark') return (await import('../helpers/sparkClient.mjs')).newSparkUser();
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const u = await response.json();
  assert.ok(u.idToken);
  return { uid: u.localId, token: u.idToken };
}
async function call(user, id, method, payload, expected) {
  if (process.env.ROOM_TRANSPORT === 'spark') return user.transport.command(id,{method,args:payload===undefined?[]:[payload],...(expected?{expected}:{})});
  const response = await fetch(
    `http://127.0.0.1:5001/${project}/europe-west1/gameCommand`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({
        data: {
          roomId: id,
          method,
          args: payload === undefined ? [] : [payload],
          ...(expected ? { expected } : {}),
        },
      }),
    },
  );
  const body = await response.json();
  if (body.error) throw Error(body.error.message);
  assert.ok(response.ok);
  return body.result;
}
async function view(user, id) {
  if (process.env.ROOM_TRANSPORT === 'spark') return user.transport.read(id);
  if (process.env.ROOM_TRANSPORT === 'callable') return (await call(user, id, 'getRoom')).room;
  const response = await fetch(
    `http://127.0.0.1:9000/roomsV2/${id}/views/${user.uid}.json?ns=${project}-default-rtdb&auth=${user.token}`,
  );
  assert.ok(response.ok);
  return response.json();
}
function generation(room) {
  const s = room.gameState;
  return {
    matchId: room.matchId,
    phase: s.phase,
    roundId: s.roundId,
    phaseVersion: s.phaseVersion,
    ...(s.actionVersion !== undefined
      ? { actionVersion: s.actionVersion }
      : {}),
  };
}
async function act(user, id, game, action, payload) {
  return call(
    user,
    id,
    `${game}.${action}`,
    payload,
    generation(await view(user, id)),
  );
}
async function setup(game, settings) {
  const users = await Promise.all(Array.from({ length: 4 }, newUser));
  const host = users[0];
  const { roomId: id } = await call(host, null, "createRoom", "Host");
  for (let i = 1; i < users.length; i++)
    await call(users[i], id, "join", `Player ${i}`);
  await assert.rejects(call(users[1], id, game + ".init", settings), /host/);
  await call(host, id, game + ".init", settings);
  await act(host, id, game, "start");
  const late = await newUser();
  await call(late, id, "join", "Late");
  const v = await view(late, id);
  assert.equal(v.players[late.uid].waiting, true);
  assert.equal(v.gameState.participantUids.includes(late.uid), false);
  for (const u of [...users, late]) {
    const r = await view(u, id);
    assert.equal(r.gameData, undefined);
    assert.equal(r.gameState.private, undefined);
  }
  return { users, host, id, late };
}
async function finish({ host, id }, game) {
  await act(host, id, game, "end");
  const lobby = await view(host, id);
  assert.equal(lobby.status, "lobby");
  await act(host, id, game, "start");
  const restarted = await view(host, id);
  assert.equal(restarted.gameState.participantUids.length, 5);
  assert.equal(restarted.matchId, 2);
  await call(host, id, "deleteRoom");
}

test("Che domanda complete game, numeric private answers, elimination and restart", async () => {
  const game = "che-domanda";
  const ctx = await setup(game, { numImpostors: 1 });
  const { users, host, id, late } = ctx;
  const views = await Promise.all(users.map((u) => view(u, id)));
  const impostor =
    users[views.findIndex((v) => views.filter(other => other.gameState.ownQuestion === v.gameState.ownQuestion).length === 1)];
  assert.ok(impostor);
  assert.equal((await view(late, id)).gameState.ownQuestion, undefined);
  assert.equal(views[0].gameState.answersByUid, undefined);
  await assert.rejects(
    act(late, id, game, "submitAnswer", { value: 1 }),
    /partecip/,
  );
  await Promise.all(
    users.map((u, i) => act(u, id, game, "submitAnswer", { value: views[i].gameState.domain.min })),
  );
  let state = (await view(host, id)).gameState;
  assert.equal(state.phase, "discussion");
  assert.equal(Object.keys(state.answersByUid).length, 4);
  await act(host, id, game, "startVoting");
  for (const u of users)
    await act(u, id, game, "castVote", {
      targetUid:
        u.uid === impostor.uid
          ? users.find((v) => v.uid !== impostor.uid).uid
          : impostor.uid,
    });
  state = (await view(host, id)).gameState;
  assert.equal(state.phase, "elimination");
  assert.equal(state.winner, "civili");
  await act(host, id, game, "continueRound");
  assert.equal((await view(host, id)).gameState.phase, "results");
  await finish(ctx, game);
});

test("Wavelength shares one number, hides it from guesser and completes a rotation", async () => {
  const game = "wavelength";
  const ctx = await setup(game, { cycles: 1 });
  const { users, host, id, late } = ctx;
  for (let turn = 0; turn < 1; turn++) {
    const state = (await view(host, id)).gameState;
    const guesser = users.find((u) => u.uid === state.guesserUid);
    const respondents = users.filter((u) => u.uid !== guesser.uid);
    const target = (await view(respondents[0], id)).gameState.target;
    for (const u of respondents)
      assert.equal((await view(u, id)).gameState.target, target);
    assert.equal((await view(guesser, id)).gameState.target, undefined);
    assert.equal((await view(late, id)).gameState.target, undefined);
    await act(guesser, id, game, "beginGuess");
    const token = generation(await view(guesser, id));
    const requests = await Promise.allSettled([
      call(guesser, id, game + ".submitGuess", { value: target }, token),
      call(guesser, id, game + ".submitGuess", { value: target }, token),
    ]);
    assert.equal(requests.filter((r) => r.status === "fulfilled").length, 1);
    const result = (await view(host, id)).gameState;
    assert.equal(result.phase, "results");
    assert.equal(result.distance, 0);
    assert.equal(result.guess, target);
    assert.equal(result.scores, undefined);

  }
  assert.equal((await view(host, id)).gameState.phase, "results");
  await finish(ctx, game);
});

test("Just One removes duplicate clues and completes cooperative rounds privately", async () => {
  const game = "just-one";
  const ctx = await setup(game, { rounds: 5 });
  const { users, host, id, late } = ctx;
  for (let round = 0; round < 1; round++) {
    const state = (await view(host, id)).gameState;
    const guesser = users.find((u) => u.uid === state.guesserUid);
    const authors = users.filter((u) => u.uid !== guesser.uid);
    const target = (await view(authors[0], id)).gameState.target;
    assert.ok(target);
    assert.equal((await view(guesser, id)).gameState.target, undefined);
    assert.equal((await view(late, id)).gameState.target, undefined);
    await Promise.all(
      authors.map((u, i) =>
        act(u, id, game, "submitClue", { text: i < 2 ? "Indizioidentico" : "Indiziounico" }),
      ),
    );
    assert.equal((await view(guesser, id)).gameState.reviewClues, undefined);
    await Promise.all(authors.map((u) => act(u, id, game, "confirmReview")));
    const guessView = await view(guesser, id);
    assert.deepEqual(guessView.gameState.validClues, ["Indiziounico"]);
    assert.equal(guessView.gameState.private, undefined);
    await act(guesser, id, game, "submitGuess", { text: target });
    const result = (await view(host, id)).gameState;
    assert.equal(result.roundResult.correct, true);
    assert.equal(result.roundResult.word, target);
    assert.equal(result.score, undefined);

  }
  assert.equal((await view(host, id)).gameState.phase, "results");
  await finish(ctx, game);
});

test("Herd Mentality keeps answers private then groups, merges and reveals majority", async () => {
  const game = "herd-mentality";
  const ctx = await setup(game, { rounds: 5 });
  const { users, host, id } = ctx;
  for (let round = 0; round < 5; round++) {
    await act(users[0], id, game, "submitAnswer", { text: "Pizza" });
    assert.equal((await view(users[1], id)).gameState.answersByUid, undefined);
    await Promise.all(
      users
        .slice(1)
        .map((u, i) =>
          act(u, id, game, "submitAnswer", {
            text: ["pizza", "Pasta", "Cane"][i],
          }),
        ),
    );
    let state = (await view(host, id)).gameState;
    assert.equal(state.groups.length, 3);
    const ids = state.groups.map((g) => g.id);
    await act(host, id, game, "mergeGroups", { groupIds: ids.slice(1) });
    const token = generation(await view(host, id));
    await call(host, id, game + ".undoMerge", {}, token);
    await assert.rejects(
      call(host, id, game + ".undoMerge", {}, token),
      /aggiornat/,
    );
    await act(host, id, game, "confirmResults");
    state = (await view(host, id)).gameState;
    assert.deepEqual(new Set(state.roundResult.winners), new Set([users[0].uid, users[1].uid]));
    assert.equal(state.roundResult.cancelled, false);
    assert.equal(state.scores, undefined);
    await act(host, id, game, "nextRound");
  }
  assert.equal((await view(host, id)).gameState.phase, "results");
  await finish(ctx, game);
});

test("Top Ten validates captain ordering, private numbers and full cooperative game", async () => {
  const game = "top-ten";
  const ctx = await setup(game, { rounds: 3 });
  const { users, host, id, late } = ctx;
  for (let round = 0; round < 3; round++) {
    let state = (await view(host, id)).gameState;
    const captain = users.find((u) => u.uid === state.captainUid);
    const numbers = await Promise.all(
      users.map(async (u) => [u.uid, (await view(u, id)).gameState.ownNumber]),
    );
    assert.equal(new Set(numbers.map((n) => n[1])).size, 4);
    assert.equal((await view(late, id)).gameState.ownNumber, undefined);
    assert.equal(state.numbersByUid, undefined);
    await act(captain, id, game, "beginOrdering");
    await assert.rejects(
      act(
        users.find((u) => u.uid !== captain.uid),
        id,
        game,
        "submitOrder",
        { uids: users.map((u) => u.uid) },
      ),
      /capitano/,
    );
    await act(captain, id, game, "submitOrder", {
      uids: numbers.sort((a, b) => a[1] - b[1]).map((n) => n[0]),
    });
    state = (await view(host, id)).gameState;
    assert.equal(state.correctOrder, true);
    assert.equal(state.score, undefined);
    assert.equal(Object.keys(state.numbersByUid).length, 4);
    await act(host, id, game, "nextRound");
  }
  assert.equal((await view(host, id)).gameState.phase, "results");
  await finish(ctx, game);
});

test("Time’s Up reuses the same ten cards across all three rounds atomically", async () => {
  const game = "times-up";
  const ctx = await setup(game, {
    turnSeconds: 90,
    deckSize: 10,
    teamMode: "auto",
    contentSource: "default",
  });
  let firstRoundCards;
  const { users, host, id, late } = ctx;
  for (let round = 1; round <= 3; round++) {
    let state = (await view(host, id)).gameState;
    assert.equal(state.roundNumber, round);
    const describer = users.find((u) => u.uid === state.describerUid);
    await act(describer, id, game, "beginTurn");
    const seen = [];
    for (let i = 0; i < 10; i++) {
      const current = await view(describer, id);
      seen.push(current.gameState.currentCard.id);
      assert.equal((await view(late, id)).gameState.currentCard, undefined);
      assert.equal(
        (
          await view(
            users.find((u) => u.uid !== describer.uid),
            id,
          )
        ).gameState.currentCard,
        undefined,
      );
      const payload = {
        outcome: "correct",
        actionVersion: current.gameState.actionVersion,
      };
      const token = generation(current);
      await call(describer, id, game + ".resolveCard", payload, token);
      await assert.rejects(
        call(describer, id, game + ".resolveCard", payload, token),
        /aggiornat/,
      );
    }
    assert.equal(new Set(seen).size, 10);
    if (round === 1) firstRoundCards = seen.sort();
    else assert.deepEqual(seen.sort(), firstRoundCards);
    state = (await view(host, id)).gameState;
    assert.equal(state.remaining, 0);
    assert.equal(state.scores, undefined);
    if (round < 3) {
      assert.equal(state.phase, "roundResults");
      await act(host, id, game, "nextRound");
    } else assert.equal(state.phase, "results");
  }
  await finish(ctx, game);
});

test("Just One teams advance concurrently with isolated clues and team-only word totals", async () => {
  const game = "just-one";
  const ctx = await setup(game, { rounds: 5, mode: "teams" });
  const { users, host, id, late } = ctx;
  const initial = (await view(host, id)).gameState;
  assert.equal(initial.phase, "teams");
  assert.equal(initial.teams.length, 2);
  assert.ok(initial.teams.every(team => team.participantUids.length === 2));
  const teamIds = initial.teams.map(team => team.id);
  const teamWords = teamIds.map(() => new Set());

  async function teamAct(actor, teamId, action, payload = {}) {
    const room = await view(actor, id);
    const team = room.gameState.teams.find(team => team.id === teamId);
    return call(actor, id, `${game}.${action}`, {
      ...payload,
      teamId,
      teamRoundId: team.roundId,
      teamPhaseVersion: team.phaseVersion,
    }, generation(room));
  }

  for (let round = 0; round < 5; round++) {
    const room = await view(host, id);
    const teams = await Promise.all(teamIds.map(async (teamId, index) => {
      const summary = room.gameState.teams.find(team => team.id === teamId);
      const guesser = users.find(user => user.uid === summary.guesserUid);
      const author = users.find(user => summary.participantUids.includes(user.uid) && user.uid !== guesser.uid);
      const authorView = await view(author, id);
      const target = authorView.gameState.myTeam.target;
      assert.ok(target);
      teamWords[index].add(target);
      assert.equal((await view(guesser, id)).gameState.myTeam.target, undefined);
      const outsider = users.find(user => !summary.participantUids.includes(user.uid));
      await assert.rejects(teamAct(outsider, teamId, "submitClue", { text: "Intruso" }), /tua squadra/);
      return { teamId, index, guesser, author, target, clue: index ? "Indizioarancio" : "Indizioblu" };
    }));

    // Both teams submit independently without waiting for the other team's oral turn.
    await Promise.all(teams.map(team => teamAct(team.author, team.teamId, "submitClue", { text: team.clue })));
    for (const team of teams) {
      const authorView = (await view(team.author, id)).gameState;
      assert.equal(authorView.myTeam.phase, "review");
      assert.deepEqual(authorView.myTeam.reviewClues.map(clue => clue.text), [team.clue]);
      assert.equal((await view(team.guesser, id)).gameState.myTeam.reviewClues, undefined);
      for (const summary of authorView.teams) {
        assert.equal(summary.target, undefined);
        assert.equal(summary.reviewClues, undefined);
        assert.equal(summary.validClues, undefined);
        assert.equal(summary.private, undefined);
      }
    }
    assert.equal((await view(late, id)).gameState.myTeam, undefined);
    await Promise.all(teams.map(team => teamAct(team.author, team.teamId, "confirmReview")));
    for (const team of teams) {
      const state = (await view(team.guesser, id)).gameState.myTeam;
      assert.equal(state.phase, "guessing");
      assert.equal(state.target, undefined);
      assert.deepEqual(state.validClues, [team.clue]);
    }
    await Promise.all(teams.map(team => teamAct(team.guesser, team.teamId,
      team.index === 1 && round === 4 ? "pass" : "submitGuess", { text: team.target })));
    const results = (await view(host, id)).gameState;
    for (const team of teams) {
      const expected = round + 1 - (team.index === 1 && round === 4 ? 1 : 0);
      assert.equal(results.teams.find(summary => summary.id === team.teamId).wordsGuessed, expected);
      const own = (await view(team.guesser, id)).gameState.myTeam;
      assert.equal(own.roundResult.correct, !(team.index === 1 && round === 4));
      assert.equal(own.roundResult.word, team.target);
    }
    await Promise.all(teams.map(team => teamAct(team.guesser, team.teamId, "nextRound")));
  }
  const result = (await view(host, id)).gameState;
  assert.equal(result.phase, "results");
  assert.deepEqual(result.winnerTeamIds, [teamIds[0]]);
  assert.equal([...teamWords[0]].some(word => teamWords[1].has(word)), false);
  await finish(ctx, game);
});

test("Just One teams require at least four participants", async () => {
  const users = await Promise.all(Array.from({ length: 3 }, newUser));
  const host = users[0];
  const { roomId: id } = await call(host, null, "createRoom", "Host");
  for (let i = 1; i < users.length; i++) await call(users[i], id, "join", `Player ${i}`);
  await call(host, id, "just-one.init", { rounds: 5, mode: "teams" });
  await assert.rejects(act(host, id, "just-one", "start"), /4.*10/);
  assert.equal((await view(host, id)).status, "lobby");
  await call(host, id, "deleteRoom");
});

for (const game of ["wavelength", "just-one"]) {
  test(`${game} replays atomically, rotates guessers and admits waiting players`, async () => {
    const ctx = await setup(game, {});
    const {host, id, users, late} = ctx;
    const first = (await view(host,id)).gameState.guesserUid;
    let previous = first;
    const order = Object.keys((await view(host,id)).players);
    for(let i=0;i<order.length+1;i++) {
      await act(host,id,game,"cancelRound");
      const ended = await view(host,id);
      const next = ended.settings.guesserUid;
      assert.notEqual(next, previous);
      const token = generation(ended);
      await assert.rejects(call(users[1],id,game+".replay",{},token), /host/);
      await call(host,id,game+".replay",{},token);
      await assert.rejects(call(host,id,game+".replay",{},token), /aggiornat/);
      const active = await view(host,id);
      assert.equal(active.gameState.guesserUid,next);
      assert.equal(active.players[late.uid].waiting,undefined);
      assert.equal(active.gameState.participantUids.length,5);
      previous = next;
      if(i === order.length-1) assert.equal(next,first);
    }
    await call(host,id,"deleteRoom");
  });
}
