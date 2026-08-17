import { createElement, clearElement, $ } from '../../utils/dom.js';
import { navigate } from '../../app/router.js';
import { getActiveGame } from '../../storage/gamesRepository.js';
import { dbClearAll } from '../../storage/database.js';
import { t, AVAILABLE_LANGUAGES, getLanguage, setLanguage } from '../../i18n/index.js';
import { asset } from '../../utils/assets.js';
import { isSoundEnabled, setSoundEnabled } from '../../utils/sound.js';
import { clearActiveGame } from '../../app/state.js';

export async function renderHomeScreen() {
  const app = $('#app');
  clearElement(app);

  const activeGame = await getActiveGame();

  const screen = createElement('div', { className: 'screen home-screen' });

  // Logo
  const logoArea = createElement('div', { className: 'home-logo-area' });
  logoArea.appendChild(createElement('img', {
    src: asset('logo.png'),
    alt: t('appName'),
    className: 'home-logo-img',
  }));
  screen.appendChild(logoArea);

  // Primary action
  const primaryActions = createElement('div', { className: 'home-primary' });
  if (activeGame) {
    primaryActions.appendChild(createElement('button', {
      className: 'btn btn-accent btn-large home-btn-continue',
      textContent: t('continueGame'),
      onClick: () => navigate('/game'),
    }));
  }
  primaryActions.appendChild(createElement('button', {
    className: 'btn btn-primary btn-large home-btn-new',
    textContent: t('newGame'),
    onClick: () => navigate('/setup'),
  }));
  screen.appendChild(primaryActions);

  // Secondary navigation
  const nav = createElement('nav', { className: 'home-nav' });
  nav.appendChild(createNavItem('👥', t('players'), () => navigate('/players')));
  nav.appendChild(createNavItem('📋', t('history'), () => navigate('/history')));
  nav.appendChild(createNavItem('📖', t('rules'), () => navigate('/rules')));
  screen.appendChild(nav);

  // Language selector
  screen.appendChild(renderLanguageSelector());

  // Sound toggle
  const soundOn = isSoundEnabled();
  const soundBtn = createElement('button', {
    className: 'btn btn-ghost home-sound-toggle',
    textContent: soundOn ? '🔊 Sonido ON' : '🔇 Sonido OFF',
    onClick: () => {
      const next = !isSoundEnabled();
      setSoundEnabled(next);
      soundBtn.textContent = next ? '🔊 Sonido ON' : '🔇 Sonido OFF';
    },
  });
  screen.appendChild(soundBtn);

  // Reset all data
  screen.appendChild(createElement('button', {
    className: 'btn btn-ghost home-reset-btn',
    textContent: '🗑️ Borrar todos los datos',
    style: 'color:var(--color-danger);margin-top:var(--space-md);font-size:var(--font-size-sm)',
    onClick: async () => {
      if (!confirm('¿Borrar todos los datos? Se eliminarán jugadores, partidas e historial.')) return;
      await dbClearAll();
      clearActiveGame();
      localStorage.clear();
      renderHomeScreen();
    },
  }));

  app.appendChild(screen);
}

function createNavItem(icon, label, onClick) {
  return createElement('button', {
    className: 'home-nav-item',
    onClick,
  }, [
    createElement('span', { className: 'home-nav-icon', textContent: icon }),
    createElement('span', { className: 'home-nav-label', textContent: label }),
  ]);
}

function renderLanguageSelector() {
  const currentLang = getLanguage();
  const currentInfo = AVAILABLE_LANGUAGES.find(l => l.code === currentLang);

  const container = createElement('div', { className: 'lang-selector' });

  const trigger = createElement('button', {
    className: 'lang-trigger',
    onClick: () => {
      const dropdown = container.querySelector('.lang-dropdown');
      dropdown.classList.toggle('lang-dropdown-open');
    },
  }, [
    createElement('img', { src: asset(`flags/${currentInfo.flag}.svg`), className: 'lang-flag-img', alt: currentInfo.label }),
    createElement('span', { className: 'lang-label', textContent: currentInfo.label }),
    createElement('span', { className: 'lang-arrow', textContent: '▾' }),
  ]);
  container.appendChild(trigger);

  const dropdown = createElement('div', { className: 'lang-dropdown' });
  AVAILABLE_LANGUAGES.forEach(lang => {
    if (lang.code === currentLang) return;
    const option = createElement('button', {
      className: `lang-dropdown-item${!lang.enabled ? ' lang-option-disabled' : ''}`,
      disabled: !lang.enabled,
      onClick: () => {
        if (!lang.enabled) return;
        setLanguage(lang.code);
        renderHomeScreen();
      },
    }, [
      createElement('img', { src: asset(`flags/${lang.flag}.svg`), className: 'lang-flag-img', alt: lang.label }),
      createElement('span', { className: 'lang-label', textContent: lang.label }),
      !lang.enabled ? createElement('span', { className: 'lang-soon', textContent: 'Proximamente' }) : null,
    ].filter(Boolean));
    dropdown.appendChild(option);
  });
  container.appendChild(dropdown);

  return container;
}
