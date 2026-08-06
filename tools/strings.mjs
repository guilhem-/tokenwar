// Inventaire des chaînes traduisibles — SOURCE UNIQUE DE VÉRITÉ.
//
// Rien n'est listé à la main : tout est extrait du code lui-même.
//   · les DONNÉES de jeu (noms, descriptions, événements, titres de presse…) ;
//   · les appels t('…') / td('…') dans js/*.js ;
//   · les attributs data-i18n / data-i18n-title / data-i18n-aria du HTML.
// Ainsi l'inventaire ne peut pas dériver du code : ajouter une chaîne au jeu
// la rend automatiquement obligatoire dans chaque fichier de langue.
import { readFileSync, readdirSync } from 'fs';
import { MODELS, GPUS, INFRA, ENERGY, PROJECTS, OPTIMS, EMPLOYEES, ACHIEVEMENTS,
         CRISES, HEADLINES, EVENTS, PROBE_SPECS, AUTOMATIONS, ADDENDUM, SPACE_DC, HELP } from '../js/data.js';
import { FUNDING } from '../js/game.js';

const push = (out, v) => { if (typeof v === 'string' && v.trim()) out.add(v); };

// ---- 1. chaînes portées par les données de jeu ----------------------
export function dataStrings() {
  const out = new Set();
  const take = (arr, fields) => arr.forEach(o => fields.forEach(f => push(out, o[f])));
  take(MODELS, ['name', 'meta', 'era', 'flavor']);
  take(GPUS, ['name', 'desc']);
  take(INFRA, ['name', 'unit', 'desc']);
  take(ENERGY, ['name', 'desc']);
  take(PROJECTS, ['name', 'cat', 'desc']);
  take(OPTIMS, ['name', 'desc', 'gain']);
  take(EMPLOYEES, ['name', 'desc']);
  take(ACHIEVEMENTS, ['name', 'desc']);
  take(CRISES, ['title', 'body', 'fix', 'fixDesc']);
  take(PROBE_SPECS, ['name', 'desc']);
  take(AUTOMATIONS, ['name', 'desc']);
  take(FUNDING, ['name', 'desc']);
  take([ADDENDUM, SPACE_DC], ['name', 'desc']);
  HEADLINES.forEach(h => push(out, h.t));
  HELP.forEach(h => { push(out, h.b); push(out, h.p); });
  EVENTS.forEach(e => {
    push(out, e.title); push(out, e.body);
    e.choices.forEach(c => { push(out, c.label); push(out, c.desc); });
  });
  return [...out];
}

// ---- 2. chaînes de l'interface, extraites du code -------------------
const unescape = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');

export function uiStrings(root = '.') {
  const out = new Set();
  // appels t('…') et t("…") — le premier argument est toujours un littéral
  // i18n.js est le moteur : ses exemples de documentation ne sont pas des chaînes du jeu
  for (const f of readdirSync(`${root}/js`).filter(n => n.endsWith('.js') && n !== 'i18n.js')) {
    const src = readFileSync(`${root}/js/${f}`, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) push(out, unescape(m[1]));
    for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) push(out, unescape(m[1]));
  }
  // attributs du HTML
  const html = readFileSync(`${root}/index.html`, 'utf8');
  for (const attr of ['data-i18n', 'data-i18n-title', 'data-i18n-aria']) {
    for (const m of html.matchAll(new RegExp(`${attr}="([^"]*)"`, 'g')))
      push(out, m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  }
  return [...out];
}

export function allStrings(root = '.') {
  return [...new Set([...dataStrings(), ...uiStrings(root)])];
}
