import { createElement, clearElement, $ } from '../../utils/dom.js';
import { navigate } from '../../app/router.js';
import { getFinishedGames, getGame, deleteAllGames } from '../../storage/gamesRepository.js';
import { formatDate, formatDuration } from '../../utils/format.js';
import { t } from '../../i18n/index.js';

export async function renderHistoryScreen() {
  const app = $('#app');
  clearElement(app);

  const games = await getFinishedGames();

  const screen = createElement('div', { className: 'screen history-screen' }, [
    createElement('div', { className: 'screen-header' }, [
      createElement('h1', { className: 'screen-title', textContent: t('history') }),
    ]),
    games.length === 0
      ? createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-state-icon', textContent: '📋' }),
        createElement('div', { className: 'empty-state-text', textContent: t('noGames') }),
        createElement('div', { className: 'empty-state-hint', textContent: 'Las partidas terminadas aparecerán aquí' }),
      ])
      : createElement('div', {},
        games.map(game => renderHistoryItem(game))
      ),
    games.length > 0
      ? createElement('button', {
        className: 'btn btn-ghost btn-block',
        textContent: '🗑️ Borrar historial',
        style: 'color:var(--color-danger);margin-top:var(--space-lg)',
        onClick: async () => {
          if (!confirm('¿Borrar todo el historial de partidas?')) return;
          await deleteAllGames();
          renderHistoryScreen();
        },
      })
      : null,
    createElement('button', {
      className: 'btn btn-ghost btn-block',
      textContent: t('backToHome'),
      onClick: () => navigate('/'),
    }),
  ]);

  app.appendChild(screen);
}

function renderHistoryItem(game) {
  const winner = game.players.find(p => p.playerId === game.winnerId);
  const playerNames = game.players.map(p => p.name).join(', ');
  const duration = formatDuration(game.startedAt, game.finishedAt);

  return createElement('div', {
    className: 'history-item',
    onClick: () => navigate(`/history/${game.id}`),
    role: 'button',
    tabindex: '0',
  }, [
    createElement('div', { className: 'history-item-date', textContent: formatDate(game.finishedAt) }),
    createElement('div', {
      className: 'history-item-winner',
      textContent: winner ? `🏆 ${winner.name}` : '',
    }),
    createElement('div', { className: 'history-item-players', textContent: playerNames }),
    createElement('div', {
      className: 'history-item-players',
      textContent: `${game.throws.length} ${t('throws')}${duration ? ` · ${duration}` : ''}`,
    }),
  ]);
}

export async function renderGameDetailScreen(gameId) {
  const app = $('#app');
  clearElement(app);

  const game = await getGame(gameId);
  if (!game) {
    navigate('/history');
    return;
  }

  const winner = game.players.find(p => p.playerId === game.winnerId);

  const screen = createElement('div', { className: 'screen detail-screen' }, [
    createElement('div', { className: 'screen-header' }, [
      createElement('h1', { className: 'screen-title', textContent: formatDate(game.finishedAt) }),
      winner ? createElement('p', {
        textContent: `🏆 ${winner.name}`,
        style: 'color:var(--color-primary);font-weight:700;font-size:var(--font-size-lg)',
      }) : null,
    ].filter(Boolean)),
    renderDetailPlayers(game),
    createElement('button', {
      className: 'btn btn-ghost btn-block',
      textContent: t('backToHome'),
      style: 'margin-top:var(--space-lg)',
      onClick: () => navigate('/history'),
    }),
  ]);

  app.appendChild(screen);
}

function renderDetailPlayers(game) {
  const container = createElement('div', { className: 'detail-players-list' });

  game.players.forEach(player => {
    const isWinner = player.playerId === game.winnerId;
    const throwCount = game.throws.filter(tr => tr.playerId === player.playerId).length;
    let className = 'detail-player-row';
    if (isWinner) className += ' detail-winner';
    if (player.eliminated) className += ' detail-eliminated';

    const row = createElement('div', { className }, [
      createElement('span', { textContent: player.name }),
      createElement('span', {
        textContent: `${player.score} pts · ${throwCount} ${t('throws')}`,
      }),
    ]);
    container.appendChild(row);
  });

  return container;
}
