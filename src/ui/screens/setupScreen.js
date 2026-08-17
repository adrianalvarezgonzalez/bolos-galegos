import { createElement, clearElement, $, showToast } from '../../utils/dom.js';
import { navigate } from '../../app/router.js';
import { getAllPlayers, createPlayer, isNameTaken } from '../../storage/playersRepository.js';
import { saveGame } from '../../storage/gamesRepository.js';
import { createGame } from '../../game/gameEngine.js';
import { setActiveGame } from '../../app/state.js';
import { t } from '../../i18n/index.js';
import { MIN_PLAYERS } from '../../game/constants.js';
import { showPlayerDialog } from '../dialogs/playerDialog.js';

let selectedPlayers = [];
let eliminationEnabled = false;

export async function renderSetupScreen() {
  const app = $('#app');
  clearElement(app);
  selectedPlayers = [];
  eliminationEnabled = false;

  const players = await getAllPlayers();

  const screen = createElement('div', { className: 'screen setup-screen' });
  screen.appendChild(createElement('div', { className: 'screen-header' }, [
    createElement('h1', { className: 'screen-title', textContent: t('newGame') }),
  ]));

  const selectedContainer = createElement('div', { className: 'setup-selected', id: 'selected-players' });
  const availableContainer = createElement('div', { className: 'card', id: 'available-players' });

  screen.appendChild(createElement('h2', {
    textContent: t('selectPlayers'),
    style: 'font-size:var(--font-size-base);font-weight:600',
  }));
  screen.appendChild(availableContainer);

  screen.appendChild(createElement('button', {
    className: 'btn btn-outline btn-block',
    textContent: t('addPlayer'),
    onClick: () => handleQuickAdd(players),
  }));

  screen.appendChild(selectedContainer);

  // Game options
  const optionsSection = createElement('div', { className: 'setup-options' }, [
    createElement('label', { className: 'setup-toggle' }, [
      createElement('input', {
        type: 'checkbox',
        id: 'elimination-toggle',
        onChange: (e) => { eliminationEnabled = e.target.checked; },
      }),
      createElement('span', { className: 'setup-toggle-label', textContent: t('eliminationOption') }),
    ]),
  ]);
  screen.appendChild(optionsSection);

  screen.appendChild(createElement('button', {
    className: 'btn btn-primary btn-large',
    textContent: t('startGame'),
    id: 'start-game-btn',
    onClick: handleStartGame,
  }));

  screen.appendChild(createElement('button', {
    className: 'btn btn-ghost btn-block',
    textContent: t('cancel'),
    onClick: () => navigate('/'),
  }));

  app.appendChild(screen);

  renderAvailablePlayers(players);
  renderSelectedPlayers();
}

function renderAvailablePlayers(players) {
  const container = $('#available-players');
  clearElement(container);

  if (players.length === 0) {
    container.appendChild(createElement('p', {
      textContent: t('noPlayers'),
      style: 'color:var(--color-text-muted);text-align:center',
    }));
    return;
  }

  players.forEach(player => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    const row = createElement('div', { className: 'player-list-item' }, [
      createElement('span', { textContent: `${player.emoji || '😀'} ${player.name}` }),
      createElement('button', {
        className: `btn ${isSelected ? 'btn-danger' : 'btn-primary'}`,
        textContent: isSelected ? '−' : '+',
        style: 'width:40px;height:40px;padding:0;font-size:1.5rem',
        onClick: () => {
          if (isSelected) {
            selectedPlayers = selectedPlayers.filter(p => p.id !== player.id);
          } else {
            selectedPlayers.push(player);
          }
          renderAvailablePlayers(players);
          renderSelectedPlayers();
        },
      }),
    ]);
    container.appendChild(row);
  });
}

function renderSelectedPlayers() {
  const container = $('#selected-players');
  clearElement(container);

  if (selectedPlayers.length === 0) return;

  container.appendChild(createElement('h3', {
    textContent: `Orden de juego (${selectedPlayers.length})`,
    style: 'font-size:var(--font-size-sm);font-weight:600;color:var(--color-text-secondary)',
  }));

  selectedPlayers.forEach((player, index) => {
    const row = createElement('div', { className: 'setup-player-row' }, [
      createElement('span', { className: 'setup-player-name', textContent: `${index + 1}. ${player.emoji || '😀'} ${player.name}` }),
      createElement('div', { className: 'setup-player-controls' }, [
        createElement('button', {
          textContent: '↑',
          ariaLabel: t('moveUp'),
          disabled: index === 0,
          onClick: () => movePlayer(index, -1),
        }),
        createElement('button', {
          textContent: '↓',
          ariaLabel: t('moveDown'),
          disabled: index === selectedPlayers.length - 1,
          onClick: () => movePlayer(index, 1),
        }),
        createElement('button', {
          textContent: '×',
          style: 'color:var(--color-danger)',
          onClick: () => {
            selectedPlayers.splice(index, 1);
            getAllPlayers().then(renderAvailablePlayers);
            renderSelectedPlayers();
          },
        }),
      ]),
    ]);
    container.appendChild(row);
  });
}

function movePlayer(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= selectedPlayers.length) return;
  [selectedPlayers[index], selectedPlayers[newIndex]] = [selectedPlayers[newIndex], selectedPlayers[index]];
  renderSelectedPlayers();
}

async function handleQuickAdd(players) {
  const result = await showPlayerDialog();
  if (!result) return;

  if (await isNameTaken(result.name)) {
    showToast(t('duplicateNameError'));
    return;
  }

  const newPlayer = await createPlayer(result.name, result.emoji);
  selectedPlayers.push(newPlayer);
  const allPlayers = await getAllPlayers();
  renderAvailablePlayers(allPlayers);
  renderSelectedPlayers();
}

async function handleStartGame() {
  if (selectedPlayers.length < MIN_PLAYERS) {
    showToast(t('minPlayersError'));
    return;
  }

  const game = createGame(selectedPlayers, { eliminationEnabled });
  await saveGame(game);
  setActiveGame(game);
  navigate('/game');
}
