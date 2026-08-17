import gl from './gl.js';
import es from './es.js';
import ca from './ca.js';
import eu from './eu.js';

const languages = { gl, es, ca, eu };
let current = 'gl';
let missIndex = 0;

export const AVAILABLE_LANGUAGES = [
  { code: 'gl', label: 'Galego', flag: 'gl', enabled: true },
  { code: 'es', label: 'Castellano', flag: 'es', enabled: true },
  { code: 'ca', label: 'Català', flag: 'ca', enabled: true },
  { code: 'eu', label: 'Euskara', flag: 'eu', enabled: true },
];

export function t(key) {
  return languages[current]?.[key] || languages['gl'][key] || key;
}

export function randomMissText() {
  const expressions = (languages[current] || languages['gl']).missExpressions;
  const text = expressions[missIndex % expressions.length];
  missIndex++;
  return text;
}

export function setLanguage(lang) {
  if (languages[lang]) {
    current = lang;
  }
}

export function getLanguage() {
  return current;
}
