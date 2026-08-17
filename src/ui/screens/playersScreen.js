import { createElement, clearElement, $, showToast } from '../../utils/dom.js';
import { navigate } from '../../app/router.js';
import { getAllPlayers, createPlayer, savePlayer, deletePlayer, isNameTaken } from '../../storage/playersRepository.js';
import { t } from '../../i18n/index.js';
import { showPlayerDialog } from '../dialogs/playerDialog.js';

export async function renderPlayersScreen() {
  const app = $('#app');
  clearElement(app);

  const players = await getAllPlayers();

  const screen = createElement('div', { className: 'screen players-screen' }, [
    createElement('div', { className: 'screen-header' }, [
      createElement('h1', { className: 'screen-title', textContent: t('players') }),
    ]),
    createElement('button', {
      className: 'btn btn-primary btn-block',
      textContent: t('addPlayer'),
      onClick: () => handleAddPlayer(),
    }),
    players.length === 0
      ? createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-state-icon', textContent: '👥' }),
        createElement('div', { className: 'empty-state-text', textContent: t('noPlayers') }),
        createElement('div', { className: 'empty-state-hint', textContent: 'Añade jugadores para empezar una partida' }),
      ])
      : createElement('div', { className: 'players-list' },
        players.map(player => renderPlayerItem(player))
      ),
    createElement('button', {
      className: 'btn btn-ghost btn-block',
      textContent: t('backToHome'),
      onClick: () => navigate('/'),
    }),
  ]);

  app.appendChild(screen);
}

function renderPlayerItem(player) {
  return createElement('div', { className: 'player-list-item' }, [
    createElement('span', { textContent: `${player.emoji || '😀'} ${player.name}` }),
    createElement('div', { style: 'display:flex;gap:var(--space-xs)' }, [
      createElement('button', {
        className: 'btn btn-ghost',
        textContent: t('edit'),
        onClick: () => handleEditPlayer(player),
      }),
      createElement('button', {
        className: 'btn btn-ghost',
        textContent: t('delete'),
        style: 'color:var(--color-danger)',
        onClick: () => handleDeletePlayer(player),
      }),
    ]),
  ]);
}

async function handleAddPlayer() {
  const result = await showPlayerDialog();
  if (!result) return;

  if (await isNameTaken(result.name)) {
    showToast(t('duplicateNameError'));
    return;
  }

  await createPlayer(result.name, result.emoji);
  renderPlayersScreen();
}

async function handleEditPlayer(player) {
  const result = await showPlayerDialog(player.name, player.emoji);
  if (!result) return;

  if (result.name !== player.name && await isNameTaken(result.name, player.id)) {
    showToast(t('duplicateNameError'));
    return;
  }

  await savePlayer({ ...player, name: result.name.trim(), emoji: result.emoji });
  renderPlayersScreen();
}

async function handleDeletePlayer(player) {
  if (!confirm(t('confirmDelete'))) return;
  await deletePlayer(player.id);
  renderPlayersScreen();
}
