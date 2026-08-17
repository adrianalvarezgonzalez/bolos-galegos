import { createElement, $ } from '../../utils/dom.js';
import { t } from '../../i18n/index.js';

const EMOJI_OPTIONS = [
  '😀', '😎', '🤓', '🦊', '🐺', '🦁', '🐸', '🐵',
  '🔥', '⚡', '🌟', '🎯', '💪', '🏆', '🎲', '🍀',
];

export function showPlayerDialog(currentName = '', currentEmoji = '') {
  return new Promise((resolve) => {
    const overlay = createElement('div', { className: 'dialog-overlay' });

    const input = createElement('input', {
      type: 'text',
      placeholder: t('playerName'),
      value: currentName,
      maxLength: '10',
    });

    let selectedEmoji = currentEmoji || EMOJI_OPTIONS[0];

    const emojiGrid = createElement('div', { className: 'emoji-grid' });
    EMOJI_OPTIONS.forEach(emoji => {
      const btn = createElement('button', {
        className: `emoji-btn${emoji === selectedEmoji ? ' emoji-btn-active' : ''}`,
        textContent: emoji,
        onClick: () => {
          selectedEmoji = emoji;
          emojiGrid.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('emoji-btn-active'));
          btn.classList.add('emoji-btn-active');
        },
      });
      emojiGrid.appendChild(btn);
    });

    const dialog = createElement('div', { className: 'dialog' }, [
      createElement('h2', {
        className: 'dialog-title',
        textContent: currentName ? t('edit') : t('addPlayer'),
      }),
      input,
      emojiGrid,
      createElement('div', { className: 'dialog-actions' }, [
        createElement('button', {
          className: 'btn btn-outline',
          textContent: t('cancel'),
          onClick: () => {
            overlay.remove();
            resolve(null);
          },
        }),
        createElement('button', {
          className: 'btn btn-primary',
          textContent: currentName ? t('save') : t('create'),
          onClick: () => {
            const value = input.value.trim();
            overlay.remove();
            resolve(value ? { name: value, emoji: selectedEmoji } : null);
          },
        }),
      ]),
    ]);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    input.focus();
    input.select();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim();
        overlay.remove();
        resolve(value ? { name: value, emoji: selectedEmoji } : null);
      } else if (e.key === 'Escape') {
        overlay.remove();
        resolve(null);
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    });
  });
}
