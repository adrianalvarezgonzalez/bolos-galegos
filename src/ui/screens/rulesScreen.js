import { createElement, clearElement, $ } from '../../utils/dom.js';
import { navigate } from '../../app/router.js';
import { t } from '../../i18n/index.js';

export function renderRulesScreen() {
  const app = $('#app');
  clearElement(app);

  const screen = createElement('div', { className: 'screen rules-screen' });

  screen.appendChild(createElement('div', { className: 'screen-header' }, [
    createElement('h1', { className: 'screen-title', textContent: t('rules') }),
  ]));

  screen.appendChild(createSection(t('rulesObjectiveTitle'), t('rulesObjectiveText')));
  screen.appendChild(createSection(t('rulesSetupTitle'), null, createSetupDiagram()));
  screen.appendChild(createSection(t('rulesSingleTitle'), t('rulesSingleText')));
  screen.appendChild(createSection(t('rulesMultipleTitle'), t('rulesMultipleText')));
  screen.appendChild(createSection(t('rulesMissTitle'), t('rulesMissText')));
  screen.appendChild(createSection(t('rulesEliminationTitle'), t('rulesEliminationText')));
  screen.appendChild(createSection(t('rulesOvershootTitle'), t('rulesOvershootText')));
  screen.appendChild(createSection(t('rulesVictoryTitle'), t('rulesVictoryText')));
  screen.appendChild(createSection(t('rulesTiebreakTitle'), t('rulesTiebreakText'), createTiebreakDiagram()));

  screen.appendChild(createElement('button', {
    className: 'btn btn-ghost btn-block',
    textContent: t('backToHome'),
    style: 'margin-top:var(--space-lg)',
    onClick: () => navigate('/'),
  }));

  app.appendChild(screen);
}

function createSection(title, text, extraElement) {
  const section = createElement('div', { className: 'rules-section' }, [
    createElement('h2', { className: 'rules-section-title', textContent: title }),
    text ? createElement('p', { className: 'rules-section-text', textContent: text }) : null,
    extraElement || null,
  ].filter(Boolean));
  return section;
}

function createPinSvgMarkup(n, x, y) {
  const r = 14;
  return `
    <g>
      <ellipse cx="${x}" cy="${y + 18}" rx="${r}" ry="5" fill="var(--color-pin-wood-dark)" opacity="0.25"/>
      <rect x="${x - r + 2}" y="${y + 2}" width="${(r - 2) * 2}" height="16" rx="4" fill="var(--color-pin-wood)" stroke="var(--color-pin-wood-dark)" stroke-width="0.5"/>
      <ellipse cx="${x}" cy="${y + 2}" rx="${r - 2}" ry="${r - 4}" fill="var(--color-pin-wood-light, #f5deb3)"/>
      <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r - 2}" fill="var(--color-pin-wood)" stroke="var(--color-pin-wood-dark)" stroke-width="0.8"/>
      <ellipse cx="${x}" cy="${y - 1}" rx="${r - 3}" ry="${r - 5}" fill="white" opacity="0.9"/>
      <text x="${x}" y="${y + 3}" text-anchor="middle" font-family="sans-serif" font-size="${n > 9 ? '9' : '11'}" font-weight="bold" fill="var(--color-text)">${n}</text>
    </g>
  `;
}

function createSetupDiagram() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 300 340');
  svg.setAttribute('class', 'rules-diagram');
  svg.setAttribute('aria-label', 'Disposición inicial de los bolos');

  // Rows from top (farthest) to bottom (closest to throw line)
  // Row 4 (back): 7, 9, 8
  // Row 3: 5, 11, 12, 6
  // Row 2: 3, 10, 4
  // Row 1 (front): 1, 2
  const positions = [
    { n: 7, x: 110, y: 50 }, { n: 9, x: 150, y: 50 }, { n: 8, x: 190, y: 50 },
    { n: 5, x: 90, y: 100 }, { n: 11, x: 130, y: 100 }, { n: 12, x: 170, y: 100 }, { n: 6, x: 210, y: 100 },
    { n: 3, x: 110, y: 150 }, { n: 10, x: 150, y: 150 }, { n: 4, x: 190, y: 150 },
    { n: 1, x: 130, y: 200 }, { n: 2, x: 170, y: 200 },
  ];

  let svgContent = '';
  positions.forEach(({ n, x, y }) => {
    svgContent += createPinSvgMarkup(n, x, y);
  });

  // Distance indicator
  svgContent += `
    <text x="150" y="265" text-anchor="middle" font-family="sans-serif" font-size="10" fill="var(--color-text-muted)">↑ 3-4 metros ↓</text>
  `;

  // Throw line at bottom
  svgContent += `
    <line x1="50" y1="300" x2="250" y2="300" stroke="var(--color-border)" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="150" y="320" text-anchor="middle" font-family="sans-serif" font-size="9" fill="var(--color-text-muted)">${t('rulesThrowLine')}</text>
  `;

  svg.innerHTML = svgContent;
  return svg;
}

function createTiebreakDiagram() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 340');
  svg.setAttribute('class', 'rules-diagram rules-diagram-tiebreak');
  svg.setAttribute('aria-label', 'Disposición de bolos en desempate');

  // Pins from top (farthest) to bottom (closest): 8, 10, 12, 4, 6
  const pins = [8, 10, 12, 4, 6];
  let svgContent = '';

  pins.forEach((n, i) => {
    svgContent += createPinSvgMarkup(n, 60, 40 + i * 45);
  });

  // Distance indicator
  svgContent += `
    <text x="60" y="275" text-anchor="middle" font-family="sans-serif" font-size="9" fill="var(--color-text-muted)">↑ 3,5 m ↓</text>
  `;

  // Throw line at bottom
  svgContent += `
    <line x1="20" y1="305" x2="100" y2="305" stroke="var(--color-border)" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="60" y="325" text-anchor="middle" font-family="sans-serif" font-size="8" fill="var(--color-text-muted)">${t('rulesThrowLine')}</text>
  `;

  svg.innerHTML = svgContent;
  return svg;
}
