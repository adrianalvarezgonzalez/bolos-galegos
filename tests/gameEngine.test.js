import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGame,
  registerThrow,
  undoLastThrow,
  getActivePlayers,
  getCurrentPlayer,
  finishWithSharedVictory,
  getTiebreakState,
  getRounds,
  replayFromThrow,
} from '../src/game/gameEngine.js';

function makePlayers(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
  }));
}

describe('createGame', () => {
  it('creates a game with correct initial state', () => {
    const game = createGame(makePlayers(3));
    expect(game.status).toBe('playing');
    expect(game.players).toHaveLength(3);
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.throws).toHaveLength(0);
    expect(game.winnerId).toBeNull();
    expect(game.tiebreak).toBeNull();
    expect(game.finishingRound).toBe(false);
    game.players.forEach(p => {
      expect(p.score).toBe(0);
      expect(p.consecutiveMisses).toBe(0);
      expect(p.eliminated).toBe(false);
    });
  });

  it('throws with less than 2 players', () => {
    expect(() => createGame([{ id: '1', name: 'Solo' }])).toThrow();
    expect(() => createGame([])).toThrow();
  });
});

describe('registerThrow - single pin', () => {
  let game;
  beforeEach(() => { game = createGame(makePlayers(2)); });

  it('scores the pin number for a single pin', () => {
    const result = registerThrow(game, 'single', 7);
    expect(result.throwRecord.points).toBe(7);
    expect(game.players[0].score).toBe(7);
  });

  it('advances to next player after throw', () => {
    registerThrow(game, 'single', 5);
    expect(game.currentPlayerIndex).toBe(1);
  });
});

describe('registerThrow - multiple pins', () => {
  let game;
  beforeEach(() => { game = createGame(makePlayers(2)); });

  it('scores the count of pins knocked', () => {
    const result = registerThrow(game, 'multiple', 4);
    expect(result.throwRecord.points).toBe(4);
    expect(game.players[0].score).toBe(4);
  });
});

describe('registerThrow - miss', () => {
  let game;
  beforeEach(() => { game = createGame(makePlayers(2)); });

  it('scores 0 and increments consecutive misses', () => {
    const result = registerThrow(game, 'miss', 0);
    expect(result.throwRecord.points).toBe(0);
    expect(game.players[0].score).toBe(0);
    expect(game.players[0].consecutiveMisses).toBe(1);
  });
});

describe('consecutive misses and elimination', () => {
  let game;
  beforeEach(() => { game = createGame(makePlayers(3), { eliminationEnabled: true }); });

  it('eliminates a player after 3 consecutive misses', () => {
    registerThrow(game, 'miss', 0); // P1 miss 1 -> P2
    registerThrow(game, 'single', 5); // P2 -> P3
    registerThrow(game, 'single', 3); // P3 -> P1

    registerThrow(game, 'miss', 0); // P1 miss 2 -> P2
    registerThrow(game, 'single', 2); // P2 -> P3
    registerThrow(game, 'single', 2); // P3 -> P1

    registerThrow(game, 'miss', 0); // P1 miss 3 -> eliminated

    expect(game.players[0].eliminated).toBe(true);
    expect(game.players[0].consecutiveMisses).toBe(3);
  });

  it('resets consecutive misses after a valid throw', () => {
    registerThrow(game, 'miss', 0); // P1 miss 1
    registerThrow(game, 'single', 1); // P2
    registerThrow(game, 'single', 1); // P3

    registerThrow(game, 'miss', 0); // P1 miss 2
    registerThrow(game, 'single', 1); // P2
    registerThrow(game, 'single', 1); // P3

    registerThrow(game, 'single', 5); // P1 scores! Reset misses
    expect(game.players[0].consecutiveMisses).toBe(0);
    expect(game.players[0].eliminated).toBe(false);
  });

  it('skips eliminated players in turn order', () => {
    // Eliminate P1
    registerThrow(game, 'miss', 0); // P1 miss 1 -> P2
    registerThrow(game, 'single', 1); // P2 -> P3
    registerThrow(game, 'single', 1); // P3 -> P1
    registerThrow(game, 'miss', 0); // P1 miss 2 -> P2
    registerThrow(game, 'single', 1); // P2 -> P3
    registerThrow(game, 'single', 1); // P3 -> P1
    registerThrow(game, 'miss', 0); // P1 miss 3, eliminated -> P2

    expect(game.currentPlayerIndex).toBe(1);
    registerThrow(game, 'single', 1); // P2 -> should skip P1 -> P3
    expect(game.currentPlayerIndex).toBe(2);
    registerThrow(game, 'single', 1); // P3 -> should skip P1 -> P2
    expect(game.currentPlayerIndex).toBe(1);
  });
});

describe('consecutive misses without elimination', () => {
  it('does not eliminate when eliminationEnabled is false', () => {
    const game = createGame(makePlayers(2));
    registerThrow(game, 'miss', 0); // P1 miss 1
    registerThrow(game, 'single', 1); // P2
    registerThrow(game, 'miss', 0); // P1 miss 2
    registerThrow(game, 'single', 1); // P2
    registerThrow(game, 'miss', 0); // P1 miss 3

    expect(game.players[0].eliminated).toBe(false);
    expect(game.players[0].consecutiveMisses).toBe(3);
    expect(game.status).toBe('playing');
  });
});

describe('exceeding 50 points', () => {
  let game;
  beforeEach(() => { game = createGame(makePlayers(2)); });

  it('resets score to 25 when exceeding 50', () => {
    game.players[0].score = 48;
    registerThrow(game, 'single', 3);
    expect(game.players[0].score).toBe(25);
  });

  it('resets to 25 from 49 + 2', () => {
    game.players[0].score = 49;
    registerThrow(game, 'multiple', 2);
    expect(game.players[0].score).toBe(25);
  });
});

describe('victory - complete round', () => {
  it('completes the round before declaring winner', () => {
    const game = createGame(makePlayers(3));
    game.players[0].score = 43;
    game.players[1].score = 30;
    game.players[2].score = 30;

    // P1 reaches 50
    const result = registerThrow(game, 'single', 7);
    expect(result.gameOver).toBe(false);
    expect(game.finishingRound).toBe(true);
    expect(game.status).toBe('playing');

    // P2 still plays
    expect(game.currentPlayerIndex).toBe(1);
    registerThrow(game, 'single', 5);

    // P3 still plays
    expect(game.currentPlayerIndex).toBe(2);
    const finalResult = registerThrow(game, 'single', 5);

    // Now round is complete, P1 is sole winner
    expect(finalResult.gameOver).toBe(true);
    expect(finalResult.winner.playerId).toBe('player-1');
    expect(game.status).toBe('finished');
  });

  it('triggers tiebreak when multiple players reach 50 in same round', () => {
    const game = createGame(makePlayers(3));
    game.players[0].score = 43;
    game.players[1].score = 45;
    game.players[2].score = 30;

    // P1 reaches 50
    registerThrow(game, 'single', 7);
    expect(game.finishingRound).toBe(true);

    // P2 also reaches 50
    registerThrow(game, 'multiple', 5);
    expect(game.players[1].score).toBe(50);

    // P3 does not reach 50
    const result = registerThrow(game, 'single', 5);
    expect(result.needsTiebreak).toBe(true);
    expect(game.tiebreak).not.toBeNull();
    expect(game.tiebreak.players).toHaveLength(2);
    expect(game.tiebreak.players[0].playerId).toBe('player-1');
    expect(game.tiebreak.players[1].playerId).toBe('player-2');
  });

  it('declares winner when only one reaches 50 after full round', () => {
    const game = createGame(makePlayers(2));
    game.players[0].score = 43;
    game.players[1].score = 48;

    // P1 reaches 50
    registerThrow(game, 'single', 7);
    expect(game.finishingRound).toBe(true);

    // P2 overshoots (48 + 3 = 51 -> 25)
    const result = registerThrow(game, 'single', 3);
    expect(result.gameOver).toBe(true);
    expect(result.winner.playerId).toBe('player-1');
  });

  it('ends immediately when last player in round reaches 50', () => {
    const game = createGame(makePlayers(3));
    game.players[0].score = 30;
    game.players[1].score = 30;
    game.players[2].score = 43;

    // P1 throws
    registerThrow(game, 'single', 5);
    // P2 throws
    registerThrow(game, 'single', 5);
    // P3 (last in round) reaches 50
    const result = registerThrow(game, 'single', 7);

    expect(result.gameOver).toBe(true);
    expect(result.winner.playerId).toBe('player-3');
    expect(game.status).toBe('finished');
  });

  it('does NOT start a new round after someone reaches 50', () => {
    const game = createGame(makePlayers(3));
    game.players[0].score = 43;
    game.players[1].score = 30;
    game.players[2].score = 30;

    // P1 reaches 50
    registerThrow(game, 'single', 7);
    expect(game.finishingRound).toBe(true);

    // P2 throws — does not reach 50
    registerThrow(game, 'single', 5);

    // P3 throws — round ends, game ends (P1 sole winner)
    const result = registerThrow(game, 'single', 5);
    expect(result.gameOver).toBe(true);
    expect(game.status).toBe('finished');

    // Verify: only 3 throws total, no new round started
    expect(game.throws).toHaveLength(3);
  });
});

describe('tiebreak', () => {
  function setupTiebreak() {
    const game = createGame(makePlayers(3));
    game.players[0].score = 43;
    game.players[1].score = 43;
    game.players[2].score = 30;

    // P1 reaches 50
    registerThrow(game, 'single', 7);
    // P2 also reaches 50
    registerThrow(game, 'single', 7);
    // P3 doesn't
    registerThrow(game, 'single', 5);

    return game;
  }

  it('starts tiebreak with correct players', () => {
    const game = setupTiebreak();
    const tb = getTiebreakState(game);
    expect(tb).not.toBeNull();
    expect(tb.players).toHaveLength(2);
    expect(tb.round).toBe(1);
    expect(tb.currentPlayerIndex).toBe(0);
  });

  it('getCurrentPlayer returns tiebreak player during tiebreak', () => {
    const game = setupTiebreak();
    const current = getCurrentPlayer(game);
    expect(current.playerId).toBe('player-1');
  });

  it('resolves tiebreak when one player scores higher', () => {
    const game = setupTiebreak();

    // TB P1 knocks single pin 12
    registerThrow(game, 'single', 12);

    // TB P2 knocks single pin 6
    const result = registerThrow(game, 'single', 6);

    expect(result.gameOver).toBe(true);
    expect(result.winner.playerId).toBe('player-1');
    expect(game.status).toBe('finished');
    expect(game.tiebreak).toBeNull();
  });

  it('goes to sudden death when tiebreak is tied', () => {
    const game = setupTiebreak();

    // Both score 6
    registerThrow(game, 'single', 6);
    const result = registerThrow(game, 'single', 6);

    expect(result.gameOver).toBe(false);
    expect(result.suddenDeath).toBe(true);
    expect(game.tiebreak.round).toBe(2);
    expect(game.tiebreak.players[0].score).toBe(0);
  });

  it('resolves in sudden death', () => {
    const game = setupTiebreak();

    // Round 1 tied
    registerThrow(game, 'single', 6);
    registerThrow(game, 'single', 6);

    // Sudden death: P1 scores, P2 misses
    registerThrow(game, 'single', 8);
    const result = registerThrow(game, 'miss', 0);

    expect(result.gameOver).toBe(true);
    expect(result.winner.playerId).toBe('player-1');
  });

  it('only allows valid tiebreak pins (6, 4, 12, 10, 8)', () => {
    const game = setupTiebreak();
    expect(() => registerThrow(game, 'single', 1)).toThrow(RangeError);
    expect(() => registerThrow(game, 'single', 5)).toThrow(RangeError);
    expect(() => registerThrow(game, 'single', 7)).toThrow(RangeError);
  });

  it('allows multiple pins up to 5 in tiebreak', () => {
    const game = setupTiebreak();
    registerThrow(game, 'multiple', 5);
    expect(game.tiebreak.players[0].score).toBe(5);
  });

  it('rejects multiple pins > 5 in tiebreak', () => {
    const game = setupTiebreak();
    expect(() => registerThrow(game, 'multiple', 6)).toThrow(RangeError);
  });

  it('allows shared victory during tiebreak', () => {
    const game = setupTiebreak();
    const result = finishWithSharedVictory(game);
    expect(result.gameOver).toBe(true);
    expect(result.winnerIds).toHaveLength(2);
    expect(game.status).toBe('finished');
    expect(game.winnerIds).toEqual(['player-1', 'player-2']);
  });
});

describe('victory by last player standing', () => {
  it('declares winner when only one player remains', () => {
    const game = createGame(makePlayers(2), { eliminationEnabled: true });

    // Eliminate P1 via 3 misses
    registerThrow(game, 'miss', 0); // P1 miss 1 -> P2
    registerThrow(game, 'single', 1); // P2 -> P1
    registerThrow(game, 'miss', 0); // P1 miss 2 -> P2
    registerThrow(game, 'single', 1); // P2 -> P1
    const result = registerThrow(game, 'miss', 0); // P1 miss 3, eliminated

    expect(result.gameOver).toBe(true);
    expect(result.winner.playerId).toBe('player-2');
    expect(game.status).toBe('finished');
  });

  it('prevents throws after game is finished', () => {
    const game = createGame(makePlayers(2));
    game.players[0].score = 43;
    registerThrow(game, 'single', 7);
    // P2 now plays to complete round
    registerThrow(game, 'single', 1);
    // Game is now finished
    expect(() => registerThrow(game, 'single', 1)).toThrow('Game is not active');
  });
});

describe('undoLastThrow', () => {
  let game;
  beforeEach(() => { game = createGame(makePlayers(2), { eliminationEnabled: true }); });

  it('restores score after undo', () => {
    registerThrow(game, 'single', 7);
    expect(game.players[0].score).toBe(7);
    undoLastThrow(game);
    expect(game.players[0].score).toBe(0);
    expect(game.currentPlayerIndex).toBe(0);
  });

  it('restores consecutive misses after undo', () => {
    registerThrow(game, 'miss', 0);
    expect(game.players[0].consecutiveMisses).toBe(1);
    undoLastThrow(game);
    expect(game.players[0].consecutiveMisses).toBe(0);
  });

  it('restores eliminated status after undo', () => {
    // Eliminate P1
    registerThrow(game, 'miss', 0); // P1 miss 1 -> P2
    registerThrow(game, 'single', 1); // P2 -> P1
    registerThrow(game, 'miss', 0); // P1 miss 2 -> P2
    registerThrow(game, 'single', 1); // P2 -> P1
    registerThrow(game, 'miss', 0); // P1 miss 3, eliminated

    expect(game.players[0].eliminated).toBe(true);
    undoLastThrow(game);
    expect(game.players[0].eliminated).toBe(false);
    expect(game.players[0].consecutiveMisses).toBe(2);
    expect(game.currentPlayerIndex).toBe(0);
  });

  it('restores game status after undoing a round-completing throw', () => {
    game.players[0].score = 43;
    game.players[1].score = 30;
    registerThrow(game, 'single', 7); // P1 reaches 50, round continues
    registerThrow(game, 'single', 5); // P2 plays, round complete -> game finished

    expect(game.status).toBe('finished');
    undoLastThrow(game);
    expect(game.status).toBe('playing');
    expect(game.winnerId).toBeNull();
    expect(game.currentPlayerIndex).toBe(1);
  });

  it('restores score after undoing an overshoot', () => {
    game.players[0].score = 48;
    registerThrow(game, 'single', 3);
    expect(game.players[0].score).toBe(25);
    undoLastThrow(game);
    expect(game.players[0].score).toBe(48);
  });

  it('throws when no throws to undo', () => {
    expect(() => undoLastThrow(game)).toThrow('No throws to undo');
  });

  it('undoes tiebreak throw', () => {
    const game3 = createGame(makePlayers(3));
    game3.players[0].score = 43;
    game3.players[1].score = 43;
    game3.players[2].score = 30;

    registerThrow(game3, 'single', 7); // P1 -> 50
    registerThrow(game3, 'single', 7); // P2 -> 50
    registerThrow(game3, 'single', 5); // P3 -> tiebreak starts

    expect(game3.tiebreak).not.toBe(null);
    expect(game3.tiebreak.players.length).toBe(2);

    // First tiebreak throw
    registerThrow(game3, 'single', 12);
    expect(game3.tiebreak.players[0].score).toBe(12);
    expect(game3.tiebreak.currentPlayerIndex).toBe(1);

    // Undo first tiebreak throw - stays in tiebreak at initial state
    undoLastThrow(game3);
    expect(game3.tiebreak).toBe(null);
    expect(game3.finishingRound).toBe(true);
  });
});

describe('turn rotation', () => {
  it('rotates through all players in order', () => {
    const game = createGame(makePlayers(4));
    expect(game.currentPlayerIndex).toBe(0);
    registerThrow(game, 'single', 1);
    expect(game.currentPlayerIndex).toBe(1);
    registerThrow(game, 'single', 1);
    expect(game.currentPlayerIndex).toBe(2);
    registerThrow(game, 'single', 1);
    expect(game.currentPlayerIndex).toBe(3);
    registerThrow(game, 'single', 1);
    expect(game.currentPlayerIndex).toBe(0);
  });
});

describe('getRounds', () => {
  it('groups throws into rounds correctly', () => {
    const game = createGame(makePlayers(3));

    // Round 1
    registerThrow(game, 'single', 5);  // P1
    registerThrow(game, 'single', 3);  // P2
    registerThrow(game, 'single', 7);  // P3

    // Round 2
    registerThrow(game, 'single', 2);  // P1
    registerThrow(game, 'miss', 0);    // P2

    const rounds = getRounds(game);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].number).toBe(1);
    expect(rounds[0].throws).toHaveLength(3);
    expect(rounds[1].number).toBe(2);
    expect(rounds[1].throws).toHaveLength(2);
  });

  it('provides per-player scores for each round', () => {
    const game = createGame(makePlayers(2));
    registerThrow(game, 'single', 5);  // P1
    registerThrow(game, 'single', 3);  // P2
    registerThrow(game, 'single', 7);  // P1
    registerThrow(game, 'miss', 0);    // P2

    const rounds = getRounds(game);
    expect(rounds[0].scores[0].points).toBe(5);
    expect(rounds[0].scores[1].points).toBe(3);
    expect(rounds[1].scores[0].points).toBe(7);
    expect(rounds[1].scores[1].points).toBe(0);
  });

  it('returns null for players who have not thrown in a round', () => {
    const game = createGame(makePlayers(3));
    registerThrow(game, 'single', 5);  // P1 only

    const rounds = getRounds(game);
    expect(rounds[0].scores[0].points).toBe(5);
    expect(rounds[0].scores[1]).toBeNull();
    expect(rounds[0].scores[2]).toBeNull();
  });
});

describe('replayFromThrow', () => {
  it('replays a modified throw and recalculates subsequent state', () => {
    const game = createGame(makePlayers(2));
    registerThrow(game, 'single', 5);  // P1: 5
    registerThrow(game, 'single', 3);  // P2: 3
    registerThrow(game, 'single', 2);  // P1: 7
    registerThrow(game, 'single', 4);  // P2: 7

    // Edit first throw from 5 to 10
    replayFromThrow(game, 0, 'single', 10);

    expect(game.players[0].score).toBe(12); // 10 + 2
    expect(game.players[1].score).toBe(7);  // 3 + 4 (unchanged)
  });

  it('handles overshoot caused by edit', () => {
    const game = createGame(makePlayers(2));
    registerThrow(game, 'single', 5);   // P1: 5
    registerThrow(game, 'single', 3);   // P2: 3
    game.players[0].score = 45;

    // Reset and replay properly
    const game2 = createGame(makePlayers(2));
    registerThrow(game2, 'single', 12); // P1: 12
    registerThrow(game2, 'single', 3);  // P2: 3
    registerThrow(game2, 'single', 12); // P1: 24
    registerThrow(game2, 'single', 3);  // P2: 6
    registerThrow(game2, 'single', 12); // P1: 36
    registerThrow(game2, 'single', 3);  // P2: 9
    registerThrow(game2, 'single', 12); // P1: 48
    registerThrow(game2, 'single', 3);  // P2: 12

    // Edit last P1 throw from 12 to single 5 -> 48 would become 36+5=41
    // Actually let's recalculate: after edit at index 6 from 12 to 5:
    // P1 sequence: 12, 12, 12, 5 = 41. P2: 3, 3, 3, 3 = 12
    replayFromThrow(game2, 6, 'single', 5);
    expect(game2.players[0].score).toBe(41);
    expect(game2.players[1].score).toBe(12);
  });

  it('stops replay when game finishes due to edit', () => {
    const game = createGame(makePlayers(2));
    // Build up P1 to 43 naturally
    registerThrow(game, 'single', 12); // P1: 12
    registerThrow(game, 'single', 1);  // P2: 1
    registerThrow(game, 'single', 12); // P1: 24
    registerThrow(game, 'single', 1);  // P2: 2
    registerThrow(game, 'single', 12); // P1: 36
    registerThrow(game, 'single', 1);  // P2: 3
    registerThrow(game, 'single', 7);  // P1: 43
    registerThrow(game, 'single', 1);  // P2: 4
    registerThrow(game, 'single', 3);  // P1: 46
    registerThrow(game, 'single', 1);  // P2: 5
    registerThrow(game, 'single', 2);  // P1: 48
    registerThrow(game, 'single', 1);  // P2: 6

    // Edit throw at index 8 (P1's 5th throw: was 3 making 46) to 7 making 50
    // After replay: P1 scores are 12+12+12+7+7 = 50
    replayFromThrow(game, 8, 'single', 7);

    expect(game.players[0].score).toBe(50);
    expect(game.status).toBe('finished');
  });
});
