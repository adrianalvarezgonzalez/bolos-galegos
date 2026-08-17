import { MAX_CONSECUTIVE_MISSES, MIN_PLAYERS, TIEBREAK_PINS } from './constants.js';
import { applyScore, calculateSinglePinScore, calculateMultiPinScore, isVictory } from './scoring.js';

export function createGame(players, options = {}) {
  if (!Array.isArray(players) || players.length < MIN_PLAYERS) {
    throw new Error(`A game requires at least ${MIN_PLAYERS} players`);
  }

  const { eliminationEnabled = false } = options;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'playing',
    winnerId: null,
    winnerIds: null,
    currentPlayerIndex: 0,
    roundStartIndex: 0,
    finishingRound: false,
    eliminationEnabled,
    tiebreak: null,
    players: players.map(p => ({
      playerId: p.id,
      name: p.name,
      emoji: p.emoji || '',
      score: 0,
      consecutiveMisses: 0,
      eliminated: false,
    })),
    throws: [],
  };
}

export function registerThrow(game, throwType, value) {
  if (game.tiebreak) {
    return registerTiebreakThrow(game, throwType, value);
  }

  validateGameActive(game);

  const player = game.players[game.currentPlayerIndex];
  if (player.eliminated) {
    throw new Error('Eliminated player cannot throw');
  }

  const points = calculatePoints(throwType, value);
  const scoreBefore = player.score;
  const missesBefore = player.consecutiveMisses;

  const newScore = points === 0 ? player.score : applyScore(player.score, points);
  const newMisses = points === 0 ? player.consecutiveMisses + 1 : 0;
  const eliminated = game.eliminationEnabled && newMisses >= MAX_CONSECUTIVE_MISSES;

  player.score = newScore;
  player.consecutiveMisses = newMisses;
  player.eliminated = eliminated;

  const throwRecord = {
    id: crypto.randomUUID(),
    playerIndex: game.currentPlayerIndex,
    playerId: player.playerId,
    timestamp: new Date().toISOString(),
    type: throwType,
    value,
    points,
    scoreBefore,
    scoreAfter: newScore,
    consecutiveMissesBefore: missesBefore,
    consecutiveMissesAfter: newMisses,
    eliminatedAfter: eliminated,
    finishingRound: game.finishingRound,
  };

  game.throws.push(throwRecord);

  const activePlayers = game.players.filter(p => !p.eliminated);
  if (activePlayers.length === 1) {
    finishGame(game, [activePlayers[0].playerId]);
    return { throwRecord, gameOver: true, winner: activePlayers[0], needsTiebreak: false };
  }

  // If roundStartIndex player was eliminated, advance it
  if (eliminated && game.roundStartIndex === game.currentPlayerIndex) {
    game.roundStartIndex = getNextActivePlayerIndex(game, game.currentPlayerIndex);
  }

  if (isVictory(newScore) && !game.finishingRound) {
    game.finishingRound = true;
  }

  const nextIndex = getNextActivePlayerIndex(game, game.currentPlayerIndex);
  const roundEnds = nextIndex === game.roundStartIndex;

  if (roundEnds && game.finishingRound) {
    const winners = game.players.filter(p => !p.eliminated && isVictory(p.score));
    if (winners.length === 1) {
      finishGame(game, [winners[0].playerId]);
      return { throwRecord, gameOver: true, winner: winners[0], needsTiebreak: false };
    }
    if (winners.length > 1) {
      startTiebreak(game, winners);
      return { throwRecord, gameOver: false, winner: null, needsTiebreak: true };
    }
    // Nobody at 50 anymore (e.g. all overshot) — start new round
    game.finishingRound = false;
    game.currentPlayerIndex = nextIndex;
    return { throwRecord, gameOver: false, winner: null, needsTiebreak: false };
  }

  if (roundEnds) {
    // Normal round end, start next round
    game.currentPlayerIndex = nextIndex;
    return { throwRecord, gameOver: false, winner: null, needsTiebreak: false };
  }

  game.currentPlayerIndex = nextIndex;
  return { throwRecord, gameOver: false, winner: null, needsTiebreak: false };
}

function registerTiebreakThrow(game, throwType, value) {
  const tb = game.tiebreak;
  const tbPlayer = tb.players[tb.currentPlayerIndex];

  const points = calculateTiebreakPoints(throwType, value);

  const throwRecord = {
    id: crypto.randomUUID(),
    playerIndex: tb.currentPlayerIndex,
    playerId: tbPlayer.playerId,
    timestamp: new Date().toISOString(),
    type: throwType,
    value,
    points,
    scoreBefore: tbPlayer.score,
    scoreAfter: tbPlayer.score + points,
    consecutiveMissesBefore: 0,
    consecutiveMissesAfter: 0,
    eliminatedAfter: false,
    tiebreakRound: tb.round,
  };

  tbPlayer.score += points;
  tb.throws.push(throwRecord);
  game.throws.push(throwRecord);

  const nextIndex = (tb.currentPlayerIndex + 1) % tb.players.length;

  if (nextIndex === 0) {
    const maxScore = Math.max(...tb.players.map(p => p.score));
    const leaders = tb.players.filter(p => p.score === maxScore);

    if (leaders.length === 1) {
      finishGame(game, [leaders[0].playerId]);
      return { throwRecord, gameOver: true, winner: findMainPlayer(game, leaders[0].playerId), needsTiebreak: false };
    }

    if (tb.round >= 1) {
      tb.players = leaders.map(p => ({ ...p, score: 0 }));
      tb.currentPlayerIndex = 0;
      tb.round++;
      tb.throws = [];
      return { throwRecord, gameOver: false, winner: null, needsTiebreak: true, suddenDeath: true };
    }

    tb.players = leaders.map(p => ({ ...p, score: 0 }));
    tb.currentPlayerIndex = 0;
    tb.round++;
    tb.throws = [];
    return { throwRecord, gameOver: false, winner: null, needsTiebreak: true, suddenDeath: true };
  }

  tb.currentPlayerIndex = nextIndex;
  return { throwRecord, gameOver: false, winner: null, needsTiebreak: true };
}

export function finishWithSharedVictory(game) {
  if (!game.tiebreak) {
    throw new Error('No tiebreak in progress');
  }
  const winnerIds = game.tiebreak.players.map(p => p.playerId);
  finishGame(game, winnerIds);
  return { gameOver: true, winnerIds };
}

export function undoLastThrow(game) {
  if (game.throws.length === 0) {
    throw new Error('No throws to undo');
  }

  const lastThrow = game.throws.pop();

  if (lastThrow.tiebreakRound !== undefined) {
    return undoTiebreakThrow(game, lastThrow);
  }

  const player = game.players[lastThrow.playerIndex];

  player.score = lastThrow.scoreBefore;
  player.consecutiveMisses = lastThrow.consecutiveMissesBefore;
  player.eliminated = false;

  game.currentPlayerIndex = lastThrow.playerIndex;
  game.status = 'playing';
  game.winnerId = null;
  game.winnerIds = null;
  game.finishedAt = null;
  game.tiebreak = null;

  if (lastThrow.finishingRound && !hasPriorTargetHit(game)) {
    game.finishingRound = false;
  }

  return lastThrow;
}

function undoTiebreakThrow(game, lastThrow) {
  if (!game.tiebreak) {
    rebuildTiebreak(game);
  }

  game.status = 'playing';
  game.winnerId = null;
  game.winnerIds = null;
  game.finishedAt = null;

  const tb = game.tiebreak;
  const tbThrowIndex = tb.throws.findIndex(t => t.id === lastThrow.id);
  if (tbThrowIndex !== -1) {
    tb.throws.splice(tbThrowIndex, 1);
  }

  const tbPlayer = tb.players.find(p => p.playerId === lastThrow.playerId);
  if (tbPlayer) {
    tbPlayer.score = lastThrow.scoreBefore;
  }
  tb.currentPlayerIndex = lastThrow.playerIndex;

  // If no tiebreak throws remain, exit tiebreak back to finishing round state
  const remainingTbThrows = game.throws.filter(t => t.tiebreakRound !== undefined);
  if (remainingTbThrows.length === 0) {
    game.tiebreak = null;
    game.finishingRound = true;
    const lastNormalThrow = game.throws[game.throws.length - 1];
    if (lastNormalThrow) {
      game.currentPlayerIndex = getNextActivePlayerIndex(game, lastNormalThrow.playerIndex);
    }
  }

  return lastThrow;
}

function rebuildTiebreak(game) {
  const tbThrows = game.throws.filter(t => t.tiebreakRound !== undefined);
  const maxRound = tbThrows.length > 0 ? Math.max(...tbThrows.map(t => t.tiebreakRound)) : 1;
  const currentRoundThrows = tbThrows.filter(t => t.tiebreakRound === maxRound);

  // Determine participants: from current round throws, or from all tiebreak players
  let participantIds;
  if (currentRoundThrows.length > 0) {
    participantIds = [...new Set(currentRoundThrows.map(t => t.playerId))];
  } else {
    participantIds = game.players.filter(p => isVictory(p.score)).map(p => p.playerId);
  }

  // For sudden death rounds, players may have been narrowed — check prior round
  if (maxRound > 1) {
    const priorRoundThrows = tbThrows.filter(t => t.tiebreakRound === maxRound - 1);
    if (priorRoundThrows.length > 0) {
      const priorScores = {};
      priorRoundThrows.forEach(t => { priorScores[t.playerId] = (priorScores[t.playerId] || 0) + t.points; });
      const maxScore = Math.max(...Object.values(priorScores));
      const tiedIds = Object.keys(priorScores).filter(pid => priorScores[pid] === maxScore);
      participantIds = tiedIds;
    }
  }

  const players = participantIds.map(pid => {
    const p = game.players.find(pl => pl.playerId === pid);
    return { playerId: pid, name: p.name, emoji: p.emoji || '', score: 0 };
  });

  // Rebuild scores from current round
  currentRoundThrows.forEach(t => {
    const tbPlayer = players.find(p => p.playerId === t.playerId);
    if (tbPlayer) tbPlayer.score += t.points;
  });

  game.tiebreak = {
    round: maxRound,
    currentPlayerIndex: currentRoundThrows.length % players.length,
    players,
    throws: [...currentRoundThrows],
  };
}

export function getActivePlayers(game) {
  return game.players.filter(p => !p.eliminated);
}

export function getCurrentPlayer(game) {
  if (game.tiebreak) {
    return game.tiebreak.players[game.tiebreak.currentPlayerIndex];
  }
  return game.players[game.currentPlayerIndex];
}

export function getTiebreakState(game) {
  return game.tiebreak;
}

export function getRounds(game) {
  const activePlayers = game.players.filter(p => !p.eliminated ||
    game.throws.some(t => t.playerId === p.playerId));
  const playerIds = game.players.map(p => p.playerId);
  const normalThrows = game.throws.filter(t => t.tiebreakRound === undefined);

  const rounds = [];
  let currentRound = [];
  let playersThrown = new Set();

  for (const t of normalThrows) {
    if (playersThrown.has(t.playerId)) {
      rounds.push(currentRound);
      currentRound = [];
      playersThrown = new Set();
    }
    playersThrown.add(t.playerId);
    currentRound.push(t);
  }
  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  return rounds.map((roundThrows, roundIndex) => ({
    number: roundIndex + 1,
    throws: roundThrows,
    scores: playerIds.map(pid => {
      const t = roundThrows.find(tr => tr.playerId === pid);
      return t ? { playerId: pid, points: t.points, throwId: t.id, type: t.type, value: t.value } : null;
    }),
  }));
}

export function replayFromThrow(game, throwIndex, newType, newValue) {
  const throwsToReplay = game.throws.slice(throwIndex);
  const throwsBefore = game.throws.slice(0, throwIndex);

  // Reset game state to before the target throw
  resetGameToThrows(game, throwsBefore);

  // Replay the modified throw
  const modifiedThrow = throwsToReplay[0];
  registerThrow(game, newType, newValue);

  // Replay remaining throws
  for (let i = 1; i < throwsToReplay.length; i++) {
    const t = throwsToReplay[i];
    if (t.tiebreakRound !== undefined) break;
    if (game.status !== 'playing') break;

    const player = game.players[game.currentPlayerIndex];
    if (player.eliminated) break;

    try {
      registerThrow(game, t.type, t.value);
    } catch {
      break;
    }
  }
}

function resetGameToThrows(game, throws) {
  game.throws = [];
  game.status = 'playing';
  game.winnerId = null;
  game.winnerIds = null;
  game.finishedAt = null;
  game.currentPlayerIndex = 0;
  game.finishingRound = false;
  game.roundStartIndex = 0;
  game.tiebreak = null;

  game.players.forEach(p => {
    p.score = 0;
    p.consecutiveMisses = 0;
    p.eliminated = false;
  });

  for (const t of throws) {
    if (t.tiebreakRound !== undefined) continue;
    if (game.status !== 'playing') break;
    const player = game.players[game.currentPlayerIndex];
    if (player.eliminated) break;
    try {
      registerThrow(game, t.type, t.value);
    } catch {
      break;
    }
  }
}

function calculatePoints(throwType, value) {
  switch (throwType) {
    case 'miss':
      return 0;
    case 'single':
      return calculateSinglePinScore(value);
    case 'multiple':
      return calculateMultiPinScore(value);
    default:
      throw new Error(`Unknown throw type: ${throwType}`);
  }
}

function calculateTiebreakPoints(throwType, value) {
  if (throwType === 'miss') return 0;
  if (throwType === 'single') {
    if (!TIEBREAK_PINS.includes(value)) {
      throw new RangeError(`Tiebreak pin must be one of: ${TIEBREAK_PINS.join(', ')}`);
    }
    return value;
  }
  if (throwType === 'multiple') {
    if (!Number.isInteger(value) || value < 2 || value > TIEBREAK_PINS.length) {
      throw new RangeError(`Tiebreak multiple pins must be between 2 and ${TIEBREAK_PINS.length}`);
    }
    return value;
  }
  throw new Error(`Unknown throw type: ${throwType}`);
}

function startTiebreak(game, winners) {
  game.tiebreak = {
    round: 1,
    currentPlayerIndex: 0,
    players: winners.map(p => ({
      playerId: p.playerId,
      name: p.name,
      score: 0,
    })),
    throws: [],
  };
}

function finishGame(game, winnerIds) {
  game.status = 'finished';
  game.finishedAt = new Date().toISOString();
  game.tiebreak = null;
  if (winnerIds.length === 1) {
    game.winnerId = winnerIds[0];
    game.winnerIds = null;
  } else {
    game.winnerId = null;
    game.winnerIds = winnerIds;
  }
}

function findMainPlayer(game, playerId) {
  return game.players.find(p => p.playerId === playerId);
}

function getNextActivePlayerIndex(game, currentIndex) {
  const totalPlayers = game.players.length;
  let next = (currentIndex + 1) % totalPlayers;
  let checked = 0;

  while (game.players[next].eliminated && checked < totalPlayers) {
    next = (next + 1) % totalPlayers;
    checked++;
  }

  return next;
}

function isRoundComplete(game, nextIndex) {
  return nextIndex === game.roundStartIndex;
}

function hasPriorTargetHit(game) {
  return game.throws.some(t => t.finishingRound);
}

function validateGameActive(game) {
  if (game.status !== 'playing') {
    throw new Error('Game is not active');
  }
}
