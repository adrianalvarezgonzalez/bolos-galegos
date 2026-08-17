import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/screens.css';

import { registerRoute, initRouter, navigate } from './app/router.js';
import { renderHomeScreen } from './ui/screens/homeScreen.js';
import { renderPlayersScreen } from './ui/screens/playersScreen.js';
import { renderSetupScreen } from './ui/screens/setupScreen.js';
import { renderGameScreen } from './ui/screens/gameScreen.js';
import { renderVictoryScreen } from './ui/screens/victoryScreen.js';
import { renderHistoryScreen, renderGameDetailScreen } from './ui/screens/historyScreen.js';
import { renderRulesScreen } from './ui/screens/rulesScreen.js';
import { getDb } from './storage/database.js';

async function init() {
  await getDb();

  registerRoute('/', renderHomeScreen);
  registerRoute('/players', renderPlayersScreen);
  registerRoute('/setup', renderSetupScreen);
  registerRoute('/game', renderGameScreen);
  registerRoute('/victory', renderVictoryScreen);
  registerRoute('/history', renderHistoryScreen);
  registerRoute('/history/:id', renderGameDetailScreen);
  registerRoute('/rules', renderRulesScreen);

  initRouter();
  initTheme();
}

function initTheme() {
  const saved = localStorage.getItem('bolos-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (saved === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

init();
