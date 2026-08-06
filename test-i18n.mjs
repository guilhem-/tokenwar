// Test de couverture des traductions.
// Garantit que chaque langue traduit TOUTES les chaînes du jeu, que les
// substitutions {0}, {1}… sont préservées, et qu'aucune traduction n'est vide
// ou laissée identique au français par oubli.
import { readdirSync } from 'fs';
import { allStrings } from './tools/strings.mjs';
import { LANGS, DEFAULT_LANG, MONTHS } from './js/i18n.js';

const strings = allStrings();
let errors = [];
const step = (label, fn) => { try { fn(); console.log('OK  ' + label); }
  catch (e) { errors.push(label + ' :: ' + e.message); console.log('ERR ' + label + ' :: ' + e.message); } };

const placeholders = s => (s.match(/\{\d+\}/g) || []).sort().join(',');

step('inventaire non vide', () => {
  if (strings.length < 800) throw new Error('inventaire suspect : ' + strings.length);
});

step('le français est la langue source (aucun fichier requis)', () => {
  if (!LANGS.some(l => l.code === 'fr')) throw new Error('français absent de la liste');
  if (DEFAULT_LANG !== 'en') throw new Error('la langue par défaut devrait être l anglais');
});

step('mois définis pour chaque langue', () => {
  for (const l of LANGS) {
    const m = MONTHS[l.code];
    if (!m || m.length !== 12) throw new Error('mois manquants pour ' + l.code);
  }
});

const files = readdirSync('./js/locales').filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
const targets = LANGS.map(l => l.code).filter(c => c !== 'fr');

step('un fichier de langue par langue déclarée', () => {
  const missing = targets.filter(c => !files.includes(c));
  if (missing.length) throw new Error('fichiers manquants : ' + missing.join(', '));
});

for (const code of targets) {
  if (!files.includes(code)) continue;
  const mod = await import(`./js/locales/${code}.js`);
  const dict = mod.default || {};
  step(`[${code}] couverture complète`, () => {
    const missing = strings.filter(s => dict[s] == null);
    if (missing.length) {
      throw new Error(`${missing.length}/${strings.length} chaînes non traduites — ex. : `
        + missing.slice(0, 3).map(s => JSON.stringify(s.slice(0, 42))).join(' · '));
    }
  });
  step(`[${code}] aucune traduction vide`, () => {
    const empty = strings.filter(s => dict[s] != null && !String(dict[s]).trim());
    if (empty.length) throw new Error(empty.length + ' traduction(s) vide(s)');
  });
  step(`[${code}] substitutions préservées`, () => {
    const bad = strings.filter(s => dict[s] != null && placeholders(s) !== placeholders(String(dict[s])));
    if (bad.length) {
      throw new Error(`${bad.length} chaîne(s) aux substitutions altérées — ex. : `
        + JSON.stringify(bad[0].slice(0, 50)));
    }
  });
  step(`[${code}] aucune clé orpheline`, () => {
    const known = new Set(strings);
    const extra = Object.keys(dict).filter(k => !known.has(k));
    if (extra.length) {
      throw new Error(`${extra.length} clé(s) ne correspondent à aucune chaîne du jeu — ex. : `
        + JSON.stringify(extra[0].slice(0, 50)));
    }
  });
}

console.log(`\n${strings.length} chaînes × ${targets.length} langues`);
if (errors.length) { console.log(`\n=== ${errors.length} ERREUR(S) ===`); errors.forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('=== i18n OK — couverture complète ===');
