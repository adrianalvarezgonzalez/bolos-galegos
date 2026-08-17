export function createPinSvg(number, size = 56) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 50 50');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-label', `Bolo ${number}`);

  const uid = `pin-${number}-${Math.random().toString(36).slice(2, 6)}`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="${uid}-face" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#e8c080"/>
        <stop offset="50%" style="stop-color:#d4a056"/>
        <stop offset="100%" style="stop-color:#b8843c"/>
      </linearGradient>
    </defs>
    <!-- Wood top shape (beveled cut) -->
    <ellipse cx="25" cy="25" rx="20" ry="22" fill="url(#${uid}-face)" stroke="#8b5e1e" stroke-width="1.5"/>
    <!-- Inner lighter face -->
    <ellipse cx="25" cy="24" rx="15" ry="17" fill="#f5deb3" stroke="#c89040" stroke-width="0.8"/>
    <!-- Number -->
    <text x="25" y="${number > 9 ? '32' : '33'}" text-anchor="middle" font-family="sans-serif" font-size="${number > 9 ? '20' : '24'}"
          font-weight="bold" fill="#1a1a1a">${number}</text>
  `;

  return svg;
}

export function createMultiPinSvg(count, size = 64) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 80 80');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-label', `${count} bolos`);

  const uid = `multi-${count}-${Math.random().toString(36).slice(2, 6)}`;

  const pins = [
    { x: 22, y: 30, angle: -15 },
    { x: 58, y: 30, angle: 15 },
    { x: 40, y: 42, angle: 5 },
  ];

  let pinsHtml = `
    <defs>
      <linearGradient id="${uid}-b" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#a0722a"/>
        <stop offset="30%" style="stop-color:#d4a056"/>
        <stop offset="70%" style="stop-color:#e8c080"/>
        <stop offset="100%" style="stop-color:#a0722a"/>
      </linearGradient>
    </defs>
  `;

  for (const pin of pins) {
    pinsHtml += `
      <g transform="translate(${pin.x}, ${pin.y}) rotate(${pin.angle})">
        <rect x="-5" y="-18" width="10" height="30" rx="4" fill="url(#${uid}-b)" stroke="#8b5e1e" stroke-width="0.5"/>
        <path d="M-5 -18 Q-5 -24 0 -26 Q5 -24 5 -18 Z" fill="#e8c080" stroke="#8b5e1e" stroke-width="0.4"/>
        <ellipse cx="0" cy="12" rx="5" ry="2" fill="#8b5e1e" opacity="0.3"/>
      </g>
    `;
  }

  pinsHtml += `
    <circle cx="40" cy="40" r="16" fill="white" stroke="#0073b1" stroke-width="2" opacity="0.92"/>
    <text x="40" y="${count > 9 ? '46' : '46'}" text-anchor="middle" font-family="sans-serif" font-size="${count > 9 ? '16' : '18'}"
          font-weight="bold" fill="#0073b1">${count}</text>
  `;

  svg.innerHTML = pinsHtml;
  return svg;
}

export function createMultiPinButton(number, onClick, size = 56) {
  const button = document.createElement('button');
  button.className = 'pin-button pin-button-multi';
  button.setAttribute('aria-label', `${number} bolos`);
  button.appendChild(createMultiPinSvg(number, size));
  button.addEventListener('click', () => onClick(number));
  return button;
}

export function createFormationSvg(width = 200) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 220 200');
  svg.setAttribute('width', width);
  svg.setAttribute('height', width * (200 / 220));
  svg.setAttribute('aria-label', 'Formación inicial de bolos');

  const uid = `formation-${Math.random().toString(36).slice(2, 6)}`;

  // Mölkky standard layout
  const positions = [
    { n: 1, x: 95, y: 40 }, { n: 2, x: 125, y: 40 },
    { n: 3, x: 80, y: 75 }, { n: 4, x: 110, y: 75 }, { n: 5, x: 140, y: 75 },
    { n: 6, x: 65, y: 110 }, { n: 7, x: 95, y: 110 }, { n: 8, x: 125, y: 110 }, { n: 9, x: 155, y: 110 },
    { n: 10, x: 80, y: 145 }, { n: 11, x: 110, y: 145 }, { n: 12, x: 140, y: 145 },
  ];

  let content = `
    <defs>
      <linearGradient id="${uid}-f" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#e8c080"/>
        <stop offset="50%" style="stop-color:#d4a056"/>
        <stop offset="100%" style="stop-color:#b8843c"/>
      </linearGradient>
    </defs>
  `;

  for (const { n, x, y } of positions) {
    content += `
      <g>
        <ellipse cx="${x}" cy="${y}" rx="14" ry="15" fill="url(#${uid}-f)" stroke="#8b5e1e" stroke-width="1"/>
        <ellipse cx="${x}" cy="${y - 1}" rx="10" ry="11" fill="#f5deb3" stroke="#c89040" stroke-width="0.5"/>
        <text x="${x}" y="${n > 9 ? y + 5 : y + 5}" text-anchor="middle" font-family="sans-serif" font-size="${n > 9 ? '11' : '13'}" font-weight="bold" fill="#1a1a1a">${n}</text>
      </g>
    `;
  }

  svg.innerHTML = content;
  return svg;
}

export function createPinButton(number, onClick, size = 56) {
  const button = document.createElement('button');
  button.className = 'pin-button';
  button.setAttribute('aria-label', `Bolo ${number}`);
  button.appendChild(createPinSvg(number, size));
  button.addEventListener('click', () => onClick(number));
  return button;
}
