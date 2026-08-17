import { createElement, clearElement, $ } from '../../utils/dom.js';
import { navigate } from '../../app/router.js';
import { getActiveGame, clearActiveGame, setActiveGame } from '../../app/state.js';
import { saveGame } from '../../storage/gamesRepository.js';
import { createGame, undoLastThrow } from '../../game/gameEngine.js';
import { t } from '../../i18n/index.js';
import { playVictory } from '../../utils/sound.js';
import { asset } from '../../utils/assets.js';

const STICKER_COUNT = 5;

function getRandomSticker() {
  const index = Math.floor(Math.random() * STICKER_COUNT) + 1;
  return asset(`stickers/${index}.svg`);
}

export function renderVictoryScreen() {
  const game = getActiveGame();
  if (!game || game.status !== 'finished') {
    navigate('/');
    return;
  }

  const app = $('#app');
  clearElement(app);

  const isShared = game.winnerIds && game.winnerIds.length > 1;
  const winners = isShared
    ? game.players.filter(p => game.winnerIds.includes(p.playerId))
    : [game.players.find(p => p.playerId === game.winnerId)];

  const screen = createElement('div', { className: 'screen victory-screen' }, [
    createElement('img', { className: 'victory-sticker', src: getRandomSticker(), alt: 'Victoria' }),
    isShared
      ? createElement('div', { className: 'victory-name', textContent: winners.map(w => w.name).join(' & ') })
      : createElement('div', { className: 'victory-name', textContent: winners[0].name }),
    createElement('div', { className: 'victory-label', textContent: isShared ? '¡Ganadores!' : t('winner') }),
    createElement('div', { className: 'victory-score', textContent: `${getPlayerTotalScore(game, winners[0])} ${t('points')}` }),
    renderFinalStandings(game),
    createElement('div', { className: 'victory-actions' }, [
      createElement('button', {
        className: 'btn btn-accent btn-large',
        textContent: '📤 Compartir resultado',
        onClick: () => handleShare(),
      }),
      createElement('button', {
        className: 'btn btn-primary btn-large',
        textContent: t('rematch'),
        onClick: () => handleRematch(game),
      }),
      createElement('button', {
        className: 'btn btn-outline btn-block',
        textContent: t('newGameShort'),
        onClick: () => {
          clearActiveGame();
          navigate('/setup');
        },
      }),
      createElement('button', {
        className: 'btn btn-ghost btn-block',
        textContent: `↩ ${t('undo')}`,
        onClick: () => handleUndoFromVictory(game),
      }),
      createElement('button', {
        className: 'btn btn-ghost btn-block',
        textContent: t('backToHome'),
        onClick: () => {
          clearActiveGame();
          navigate('/');
        },
      }),
    ]),
  ]);

  app.appendChild(screen);
  launchConfetti();
  playVictory();
}

function launchConfetti() {
  const colors = ['#0073b1', '#f0c040', '#2e7d32', '#d32f2f', '#e8c080', '#ffffff'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3500);
}

function getPlayerTotalScore(game, player) {
  const tbPoints = game.throws
    .filter(tr => tr.playerId === player.playerId && tr.tiebreakRound !== undefined)
    .reduce((sum, tr) => sum + tr.points, 0);
  return player.score + tbPoints;
}

function renderFinalStandings(game) {
  const container = createElement('div', {
    className: 'card',
    style: 'width:100%;margin-top:var(--space-lg)',
  });

  const winnerIds = game.winnerIds || (game.winnerId ? [game.winnerId] : []);

  const getTotalScore = (player) => getPlayerTotalScore(game, player);

  const sorted = [...game.players].sort((a, b) => {
    const aWinner = winnerIds.includes(a.playerId);
    const bWinner = winnerIds.includes(b.playerId);
    if (aWinner && !bWinner) return -1;
    if (!aWinner && bWinner) return 1;
    if (a.eliminated && !b.eliminated) return 1;
    if (!a.eliminated && b.eliminated) return -1;
    return getTotalScore(b) - getTotalScore(a);
  });

  sorted.forEach(player => {
    const isWinner = winnerIds.includes(player.playerId);
    let classes = 'standings-row';
    if (isWinner) classes += ' is-current';
    if (player.eliminated) classes += ' is-eliminated';

    const throwCount = game.throws.filter(tr => tr.playerId === player.playerId).length;
    const tiebreakPoints = game.throws
      .filter(tr => tr.playerId === player.playerId && tr.tiebreakRound !== undefined)
      .reduce((sum, tr) => sum + tr.points, 0);
    const totalScore = player.score + tiebreakPoints;

    const row = createElement('div', { className: classes }, [
      createElement('span', { className: 'standings-name', textContent: player.name }),
      createElement('span', { className: 'standings-score', textContent: `${totalScore}` }),
      createElement('span', {
        className: 'standings-needs',
        textContent: player.eliminated ? t('eliminated') : `${throwCount} ${t('throws')}`,
      }),
    ]);
    container.appendChild(row);
  });

  return container;
}

async function handleShare() {
  const { default: html2canvas } = await import('html2canvas');
  const screen = document.querySelector('.victory-screen');
  const actions = screen.querySelector('.victory-actions');
  actions.style.display = 'none';

  try {
    const canvas = await html2canvas(screen, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#ffffff',
      scale: 2,
    });

    actions.style.display = '';

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], 'bolos-galegos-resultado.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Bolos Galegos - Resultado',
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bolos-galegos-resultado.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  } catch {
    actions.style.display = '';
  }
}

async function handleUndoFromVictory(game) {
  undoLastThrow(game);
  await saveGame(game);
  setActiveGame(game);
  navigate('/game');
}

async function handleRematch(game) {
  const players = game.players.map(p => ({ id: p.playerId, name: p.name }));
  const newGame = createGame(players);
  await saveGame(newGame);
  clearActiveGame();
  setActiveGame(newGame);
  navigate('/game');
}
