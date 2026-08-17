import { createElement, clearElement, $, showToast } from '../../utils/dom.js';
import { navigate } from '../../app/router.js';
import { getActiveGame as getActiveGameFromState, setActiveGame, clearActiveGame } from '../../app/state.js';
import { getActiveGame as loadActiveGame, saveGame } from '../../storage/gamesRepository.js';
import { registerThrow, undoLastThrow, getCurrentPlayer, getTiebreakState, finishWithSharedVictory, getRounds, replayFromThrow } from '../../game/gameEngine.js';
import { pointsNeeded } from '../../game/scoring.js';
import { MAX_PIN_NUMBER, TIEBREAK_PINS } from '../../game/constants.js';
import { t, randomMissText } from '../../i18n/index.js';
import { createPinButton } from '../components/pinSvg.js';
import { playHit, playMiss } from '../../utils/sound.js';

let currentMissText = randomMissText();

export async function renderGameScreen() {
  let game = getActiveGameFromState();
  if (!game) {
    game = await loadActiveGame();
    if (!game) {
      navigate('/');
      return;
    }
    setActiveGame(game);
  }

  if (game.status === 'finished') {
    exitFullscreen();
    navigate('/victory');
    return;
  }

  requestFullscreen();

  if (game.tiebreak) {
    renderTiebreakView(game);
  } else {
    renderMainView(game);
  }
}

function requestFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  }
}

function exitFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function renderMainView(game) {
  const app = $('#app');
  clearElement(app);

  const player = getCurrentPlayer(game);
  const needed = pointsNeeded(player.score);

  const screen = createElement('div', { className: 'screen game-screen' });

  screen.appendChild(createElement('button', {
    className: 'game-close-btn',
    textContent: '✕',
    ariaLabel: 'Salir de la partida',
    onClick: () => handleExitGame(),
  }));

  const progressBar = createElement('div', { className: 'game-progress' });
  const progressFill = createElement('div', {
    className: 'game-progress-fill',
    style: `width:${Math.min((player.score / 50) * 100, 100)}%`,
  });
  progressBar.appendChild(progressFill);

  const currentRound = getRounds(game).length || 1;

  screen.appendChild(createElement('div', { className: 'game-current-player' }, [
    createElement('div', { className: 'game-round-label', textContent: `Ronda ${currentRound}` }),
    createElement('div', { className: 'game-turn-label', textContent: t('turn') }),
    createElement('h1', { className: 'game-player-name', textContent: `${player.emoji || ''} ${player.name}`.trim() }),
    createElement('div', { className: 'game-score', textContent: `${player.score} / 50` }),
    progressBar,
    createElement('div', { className: 'game-needs', textContent: `${t('needs')} ${needed}` }),
    game.finishingRound
      ? createElement('div', {
        className: 'game-finishing-badge',
        textContent: 'Completando ronda...',
      })
      : null,
  ].filter(Boolean)));

  screen.appendChild(renderPinSelector(game));
  screen.appendChild(renderRoundsTable(game));

  if (game.throws.length > 0) {
    screen.appendChild(renderGameStats(game, player));
  }

  if (game.throws.length > 0) {
    const bottomBar = createElement('div', { className: 'game-bottom-bar' });
    bottomBar.appendChild(createElement('button', {
      className: 'btn btn-ghost game-bottom-undo',
      textContent: `↩ ${t('undo')}`,
      onClick: () => handleUndo(game),
    }));
    screen.appendChild(bottomBar);
  }

  app.appendChild(screen);
  attachSwipeUndo(screen, game);
}

function renderPinSelector(game) {
  const container = createElement('div', { className: 'pin-selector' });

  const section = createElement('div', { className: 'pin-selector-section' });
  const grid = createElement('div', { className: 'pins-molkky-grid' });
  for (let i = 1; i <= MAX_PIN_NUMBER; i++) {
    grid.appendChild(createPinButton(i, (pin) => handleThrow(game, 'single', pin), 44));
  }
  section.appendChild(grid);
  container.appendChild(section);

  const missBtn = createElement('button', {
    className: 'btn btn-danger btn-block btn-miss',
    textContent: currentMissText,
    onClick: () => {
      handleMiss(game);
      currentMissText = randomMissText();
      missBtn.textContent = currentMissText;
    },
  });
  container.appendChild(missBtn);

  return container;
}

function renderTiebreakView(game) {
  const app = $('#app');
  clearElement(app);

  const tb = game.tiebreak;
  const player = tb.players[tb.currentPlayerIndex];
  const roundLabel = tb.round === 1 ? 'Desempate' : `Muerte súbita (ronda ${tb.round})`;

  const screen = createElement('div', { className: 'screen game-screen' });

  screen.appendChild(createElement('button', {
    className: 'game-close-btn',
    textContent: '✕',
    ariaLabel: 'Salir de la partida',
    onClick: () => handleExitGame(),
  }));

  screen.appendChild(createElement('div', { className: 'game-current-player' }, [
    createElement('div', { className: 'game-turn-label game-tiebreak-label', textContent: roundLabel }),
    createElement('h1', { className: 'game-player-name', textContent: `${player.emoji || ''} ${player.name}`.trim() }),
    player.score > 0 ? createElement('div', { className: 'game-score', textContent: `${player.score} pts` }) : null,
    createElement('div', { className: 'game-needs', textContent: `Bolos: ${TIEBREAK_PINS.join(', ')}` }),
  ].filter(Boolean)));

  screen.appendChild(renderTiebreakPinSelector(game));
  screen.appendChild(renderTiebreakRoundsTable(game));
  screen.appendChild(renderFinalStandings(game));

  const bottomBar = createElement('div', { className: 'game-bottom-bar' });

  const bottomActions = createElement('div', { className: 'game-bottom-actions' });
  if (game.throws.length > 0) {
    bottomActions.appendChild(createElement('button', {
      className: 'btn btn-ghost game-bottom-undo',
      textContent: `↩ ${t('undo')}`,
      onClick: () => handleUndo(game),
    }));
  }
  bottomActions.appendChild(createElement('button', {
    className: 'btn btn-ghost',
    textContent: 'Victoria compartida',
    style: 'color:var(--color-accent)',
    onClick: () => handleSharedVictory(game),
  }));
  bottomBar.appendChild(bottomActions);

  screen.appendChild(bottomBar);

  app.appendChild(screen);
  attachSwipeUndo(screen, game);
}

function renderTiebreakPinSelector(game) {
  const container = createElement('div', { className: 'pin-selector' });

  const section = createElement('div', { className: 'pin-selector-section' });
  const grid = createElement('div', { className: 'pins-molkky-grid pins-tiebreak-grid' });
  const tiebreakScores = [2, 3, 4, 5, 6, 8, 10, 12];
  tiebreakScores.forEach(val => {
    const isSingle = TIEBREAK_PINS.includes(val);
    const type = isSingle ? 'single' : 'multiple';
    grid.appendChild(createPinButton(val, () => handleThrow(game, type, val), 44));
  });
  section.appendChild(grid);
  container.appendChild(section);

  const missBtn = createElement('button', {
    className: 'btn btn-danger btn-block btn-miss',
    textContent: currentMissText,
    onClick: () => {
      handleMiss(game);
      currentMissText = randomMissText();
      missBtn.textContent = currentMissText;
    },
  });
  container.appendChild(missBtn);

  return container;
}

function renderRoundsTable(game) {
  const rounds = getRounds(game);
  const currentPlayerIdx = game.tiebreak ? -1 : game.currentPlayerIndex;

  // Determine the current round (where the next throw goes)
  // If the current player already has a score in the last round, next throw is a new round
  const lastRound = rounds[rounds.length - 1];
  const needsNewRound = rounds.length === 0 || (lastRound && lastRound.scores[currentPlayerIdx]);
  const currentRoundIdx = needsNewRound ? rounds.length : rounds.length - 1;

  const wrapper = createElement('div', { className: 'scoreboard' });

  const namesCol = createElement('div', { className: 'scoreboard-col-names' });
  const scrollArea = createElement('div', { className: 'scoreboard-scroll' });
  const totalsCol = createElement('div', { className: 'scoreboard-col-totals' });

  namesCol.appendChild(createElement('div', { className: 'scoreboard-header-cell scoreboard-name-header' }));

  const headerRow = createElement('div', { className: 'scoreboard-matrix-row scoreboard-header-row' });
  const totalRounds = needsNewRound ? rounds.length + 1 : rounds.length;
  for (let r = 0; r < totalRounds; r++) {
    headerRow.appendChild(createElement('div', { className: 'scoreboard-header-cell', textContent: `R${r + 1}` }));
  }
  scrollArea.appendChild(headerRow);

  totalsCol.appendChild(createElement('div', { className: 'scoreboard-header-cell scoreboard-total-header', textContent: 'Pts' }));

  game.players.forEach((player, playerIdx) => {
    const isCurrent = playerIdx === currentPlayerIdx;
    const isEliminated = player.eliminated;

    let nameClass = 'scoreboard-name';
    if (isCurrent) nameClass += ' is-current';
    if (isEliminated) nameClass += ' is-eliminated';
    namesCol.appendChild(createElement('div', { className: nameClass, textContent: player.name }));

    const matrixRow = createElement('div', { className: 'scoreboard-matrix-row' });
    for (let r = 0; r < totalRounds; r++) {
      const round = rounds[r];
      const scoreEntry = round ? round.scores[playerIdx] : null;
      if (scoreEntry) {
        const cellClass = scoreEntry.points === 0 ? 'scoreboard-cell scoreboard-cell-miss' : 'scoreboard-cell';
        matrixRow.appendChild(createElement('button', {
          className: cellClass,
          textContent: String(scoreEntry.points),
          onClick: () => handleEditThrow(game, scoreEntry.throwId),
          ariaLabel: `R${r + 1}: ${scoreEntry.points}`,
        }));
      } else {
        const isNextThrow = isCurrent && r === currentRoundIdx;
        const emptyClass = isNextThrow
          ? 'scoreboard-cell scoreboard-cell-empty scoreboard-cell-next'
          : 'scoreboard-cell scoreboard-cell-empty';
        matrixRow.appendChild(createElement('div', { className: emptyClass, textContent: '·' }));
      }
    }
    scrollArea.appendChild(matrixRow);

    // Total
    let totalClass = 'scoreboard-total';
    if (isCurrent) totalClass += ' is-current';
    totalsCol.appendChild(createElement('div', { className: totalClass, textContent: String(player.score) }));
  });

  wrapper.appendChild(namesCol);
  wrapper.appendChild(scrollArea);
  wrapper.appendChild(totalsCol);

  // Scroll to end (latest round visible)
  requestAnimationFrame(() => {
    scrollArea.scrollLeft = scrollArea.scrollWidth;
  });

  return wrapper;
}

function handleEditThrow(game, throwId) {
  const throwIndex = game.throws.findIndex(t => t.id === throwId);
  if (throwIndex === -1) return;

  const throwRecord = game.throws[throwIndex];
  showEditPinSelector(game, throwIndex, throwRecord);
}

function showEditPinSelector(game, throwIndex, throwRecord) {
  const app = $('#app');
  clearElement(app);

  const playerIdx = throwRecord.playerIndex;
  const playerName = game.players[playerIdx].name;

  const screen = createElement('div', { className: 'screen game-screen' });

  screen.appendChild(createElement('div', { className: 'screen-header' }, [
    createElement('h2', { className: 'screen-title', textContent: `Editar tirada` }),
    createElement('p', {
      style: 'color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-top:var(--space-xs)',
      textContent: `${playerName} · Actual: ${throwRecord.points} pts`,
    }),
  ]));

  const pinsContainer = createElement('div', { className: 'pins-molkky-grid' });
  for (let i = 1; i <= MAX_PIN_NUMBER; i++) {
    const btn = createPinButton(i, (pin) => handleConfirmEdit(game, throwIndex, 'single', pin), 44);
    if (throwRecord.points === i) {
      btn.classList.add('pin-button-active');
    }
    pinsContainer.appendChild(btn);
  }
  screen.appendChild(pinsContainer);

  screen.appendChild(createElement('button', {
    className: 'btn btn-danger btn-block',
    textContent: `${t('miss')} · 0`,
    style: 'margin-top:var(--space-md)',
    onClick: () => handleConfirmEdit(game, throwIndex, 'miss', 0),
  }));

  screen.appendChild(createElement('button', {
    className: 'btn btn-ghost btn-block',
    textContent: t('cancel'),
    style: 'margin-top:var(--space-sm)',
    onClick: () => renderMainView(game),
  }));

  app.appendChild(screen);
}

async function handleConfirmEdit(game, throwIndex, newType, newValue) {
  replayFromThrow(game, throwIndex, newType, newValue);
  await saveGame(game);

  if (game.status === 'finished') {
    navigate('/victory');
    return;
  }

  if (game.tiebreak) {
    renderTiebreakView(game);
  } else {
    renderMainView(game);
  }
}


function attachSwipeUndo(element, game) {
  let startX = 0;
  let startY = 0;

  element.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (dx > 80 && Math.abs(dy) < 60 && game.throws.length > 0) {
      handleUndo(game);
    }
  }, { passive: true });
}

function haptic(pattern = 15) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

async function handleMiss(game) {
  handleThrow(game, 'miss', 0);
}

async function handleThrow(game, type, value) {
  const result = registerThrow(game, type, value);
  await saveGame(game);
  haptic(type === 'miss' ? [10, 30, 10] : 15);
  if (type === 'miss') playMiss(); else playHit();

  if (result.throwRecord.eliminatedAfter) {
    const elimPlayer = game.players[result.throwRecord.playerIndex];
    showToast(`${elimPlayer.name}: ${t('playerEliminated')}`, 2500);
  }

  if (result.gameOver) {
    exitFullscreen();
    navigate('/victory');
    return;
  }

  if (result.needsTiebreak && !result.suddenDeath) {
    showToast('¡Empate! Comienza el desempate', 2500);
  }

  if (result.suddenDeath) {
    showToast('¡Sigue el empate! Muerte súbita', 2000);
  }

  if (game.tiebreak) {
    renderTiebreakView(game);
  } else {
    renderMainView(game);
  }
}

async function handleUndo(game) {
  undoLastThrow(game);
  await saveGame(game);

  if (game.tiebreak) {
    renderTiebreakView(game);
  } else {
    renderMainView(game);
  }
}

function handleExitGame() {
  if (!confirm('¿Salir de la partida? Podrás continuarla desde el inicio.')) return;
  exitFullscreen();
  navigate('/');
}

async function handleSharedVictory(game) {
  finishWithSharedVictory(game);
  await saveGame(game);
  navigate('/victory');
}

function renderGameStats(game, currentPlayer) {
  const playerThrows = game.throws.filter(t => t.playerId === currentPlayer.playerId);
  const allThrows = game.throws;

  // Player stats
  const playerHits = playerThrows.filter(t => t.points > 0);
  const playerAvg = playerThrows.length > 0
    ? (playerHits.reduce((sum, t) => sum + t.points, 0) / playerThrows.length).toFixed(1)
    : '0';
  const playerBest = playerThrows.length > 0
    ? Math.max(...playerThrows.map(t => t.points))
    : 0;

  // Streak
  let streak = '';
  if (playerThrows.length > 0) {
    const lastHit = playerThrows[playerThrows.length - 1].points > 0;
    let count = 0;
    for (let i = playerThrows.length - 1; i >= 0; i--) {
      const hit = playerThrows[i].points > 0;
      if (hit === lastHit) count++;
      else break;
    }
    streak = lastHit ? `${count} 🎯` : `${count} ✗`;
  }

  // Game best: player(s) who hit the max score the most times
  const maxPoints = allThrows.length > 0 ? Math.max(...allThrows.map(t => t.points)) : 0;
  let gameBestLabel = '';
  if (maxPoints > 0) {
    const maxThrows = allThrows.filter(t => t.points === maxPoints);
    const countByPlayer = {};
    maxThrows.forEach(t => {
      const name = game.players[t.playerIndex].name;
      countByPlayer[name] = (countByPlayer[name] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(countByPlayer));
    const topPlayers = Object.keys(countByPlayer).filter(name => countByPlayer[name] === maxCount);
    gameBestLabel = `${maxPoints} × ${maxCount} · ${topPlayers.join(', ')}`;
  }

  const container = createElement('div', { className: 'game-stats' });

  const playerStats = createElement('div', { className: 'game-stats-row' }, [
    createStatItem('Media', playerAvg),
    createStatItem('Mejor', String(playerBest)),
    streak ? createStatItem('Racha', streak) : null,
  ].filter(Boolean));
  container.appendChild(playerStats);

  if (gameBestLabel) {
    const gameStats = createElement('div', { className: 'game-stats-row game-stats-global' }, [
      createStatItem('MVP', gameBestLabel),
    ]);
    container.appendChild(gameStats);
  }

  return container;
}

function createStatItem(label, value) {
  return createElement('div', { className: 'game-stat-item' }, [
    createElement('span', { className: 'game-stat-value', textContent: value }),
    createElement('span', { className: 'game-stat-label', textContent: label }),
  ]);
}

function renderTiebreakRoundsTable(game) {
  const tb = game.tiebreak;
  const tbThrows = game.throws.filter(t => t.tiebreakRound !== undefined);

  // All players who ever participated in tiebreak
  const allTbPlayerIds = [...new Set(tbThrows.map(t => t.playerId))];
  tb.players.forEach(p => {
    if (!allTbPlayerIds.includes(p.playerId)) allTbPlayerIds.push(p.playerId);
  });

  const allTbPlayers = allTbPlayerIds.map(pid => {
    const tbP = tb.players.find(p => p.playerId === pid);
    const gameP = game.players.find(p => p.playerId === pid);
    return {
      playerId: pid,
      name: gameP ? gameP.name : (tbP ? tbP.name : ''),
      isActive: !!tbP,
      score: tbP ? tbP.score : 0,
    };
  });

  // Group throws by round
  const rounds = {};
  tbThrows.forEach(t => {
    if (!rounds[t.tiebreakRound]) rounds[t.tiebreakRound] = [];
    rounds[t.tiebreakRound].push(t);
  });
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  // Always show at least the current round column
  const showRounds = [...roundNumbers];
  if (!showRounds.includes(tb.round)) {
    showRounds.push(tb.round);
  }

  const wrapper = createElement('div', { className: 'scoreboard tiebreak-scoreboard' });
  const namesCol = createElement('div', { className: 'scoreboard-col-names' });
  const scrollArea = createElement('div', { className: 'scoreboard-scroll' });
  const totalsCol = createElement('div', { className: 'scoreboard-col-totals' });

  namesCol.appendChild(createElement('div', { className: 'scoreboard-header-cell scoreboard-name-header' }));

  const headerRow = createElement('div', { className: 'scoreboard-matrix-row scoreboard-header-row' });
  showRounds.forEach(r => {
    headerRow.appendChild(createElement('div', { className: 'scoreboard-header-cell', textContent: `R${r}` }));
  });
  scrollArea.appendChild(headerRow);

  totalsCol.appendChild(createElement('div', { className: 'scoreboard-header-cell scoreboard-total-header', textContent: 'Pts' }));

  allTbPlayers.forEach(tbPlayer => {
    const isCurrent = tbPlayer.isActive && tb.players[tb.currentPlayerIndex]?.playerId === tbPlayer.playerId;

    let nameClass = 'scoreboard-name';
    if (isCurrent) nameClass += ' is-current';
    if (!tbPlayer.isActive) nameClass += ' is-eliminated';
    namesCol.appendChild(createElement('div', { className: nameClass, textContent: tbPlayer.name }));

    const matrixRow = createElement('div', { className: 'scoreboard-matrix-row' });
    showRounds.forEach(rNum => {
      const isCurrentRound = rNum === tb.round;
      const roundThrow = rounds[rNum]?.find(t => t.playerId === tbPlayer.playerId);

      if (roundThrow) {
        const cellClass = roundThrow.points === 0 ? 'scoreboard-cell scoreboard-cell-miss' : 'scoreboard-cell';
        matrixRow.appendChild(createElement('button', {
          className: cellClass,
          textContent: String(roundThrow.points),
          onClick: () => handleEditThrow(game, roundThrow.id),
        }));
      } else if (!tbPlayer.isActive) {
        matrixRow.appendChild(createElement('div', { className: 'scoreboard-cell scoreboard-cell-empty', textContent: '—' }));
      } else if (isCurrentRound) {
        const isNext = isCurrent;
        const emptyClass = isNext ? 'scoreboard-cell scoreboard-cell-empty scoreboard-cell-next' : 'scoreboard-cell scoreboard-cell-empty';
        matrixRow.appendChild(createElement('div', { className: emptyClass, textContent: '·' }));
      } else {
        matrixRow.appendChild(createElement('div', { className: 'scoreboard-cell scoreboard-cell-empty', textContent: '—' }));
      }
    });

    scrollArea.appendChild(matrixRow);

    const allRoundsTotal = tbThrows
      .filter(t => t.playerId === tbPlayer.playerId)
      .reduce((sum, t) => sum + t.points, 0);

    let totalClass = 'scoreboard-total';
    if (isCurrent) totalClass += ' is-current';
    if (!tbPlayer.isActive) totalClass += ' is-eliminated';
    totalsCol.appendChild(createElement('div', { className: totalClass, textContent: String(allRoundsTotal) }));
  });

  wrapper.appendChild(namesCol);
  wrapper.appendChild(scrollArea);
  wrapper.appendChild(totalsCol);

  requestAnimationFrame(() => {
    scrollArea.scrollLeft = scrollArea.scrollWidth;
  });

  return wrapper;
}

function renderFinalStandings(game) {
  const sorted = [...game.players]
    .filter(p => !p.eliminated)
    .sort((a, b) => b.score - a.score);

  const container = createElement('div', { className: 'game-final-standings' });
  container.appendChild(createElement('div', { className: 'game-final-standings-title', textContent: 'Clasificación' }));

  sorted.forEach((player, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    const row = createElement('div', { className: 'game-final-row' }, [
      createElement('span', { className: 'game-final-pos', textContent: medal || `${index + 1}` }),
      createElement('span', { className: 'game-final-name', textContent: player.name }),
      createElement('span', { className: 'game-final-score', textContent: `${player.score}` }),
    ]);
    container.appendChild(row);
  });

  return container;
}
