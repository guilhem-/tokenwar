// Test de couverture des traductions.
// Garantit que chaque langue traduit TOUTES les chaînes du jeu, que les
// substitutions {0}, {1}… sont préservées, et qu'aucune traduction n'est vide
// ou laissée identique au français par oubli.
import { readdirSync } from 'fs';
import { allStrings } from './tools/strings.mjs';
import { LANGS, DEFAULT_LANG, MONTHS } from './js/i18n.js';

const strings = allStrings();
let errors = [];
// await impératif : une étape asynchrone qui échoue doit être ENREGISTRÉE,
// pas affichée « OK » pendant que le rejet part dans le vide.
const step = async (label, fn) => { try { await fn(); console.log('OK  ' + label); }
  catch (e) { errors.push(label + ' :: ' + e.message); console.log('ERR ' + label + ' :: ' + e.message); } };

const placeholders = s => (s.match(/\{\d+\}/g) || []).sort().join(',');

await step('inventaire non vide', () => {
  if (strings.length < 800) throw new Error('inventaire suspect : ' + strings.length);
});

await step('le français est la langue source (aucun fichier requis)', () => {
  if (!LANGS.some(l => l.code === 'fr')) throw new Error('français absent de la liste');
  if (DEFAULT_LANG !== 'en') throw new Error('la langue par défaut devrait être l anglais');
});

await step('mois définis pour chaque langue', () => {
  for (const l of LANGS) {
    const m = MONTHS[l.code];
    if (!m || m.length !== 12) throw new Error('mois manquants pour ' + l.code);
  }
});

const files = readdirSync('./js/locales').filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
const targets = LANGS.map(l => l.code).filter(c => c !== 'fr');

await step('un fichier de langue par langue déclarée', () => {
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
// Filet de sécurité : aucune écriture étrangère ne doit polluer une langue
// (un copier-coller malheureux avait glissé du cyrillique dans le japonais).
await step('aucune contamination d écriture entre langues', async () => {
  const CJK = '\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af';
  const rules = { en:CJK, es:CJK, pt:CJK, de:CJK, zh:'\uac00-\ud7af', ja:'\uac00-\ud7af', ko:'' };
  for (const [code, extra] of Object.entries(rules)) {
    const re = new RegExp('[\u0400-\u04ff' + extra + ']');
    const d = (await import(`./js/locales/${code}.js`)).default;
    const bad = Object.entries(d).filter(([, v]) => re.test(v));
    if (bad.length) throw new Error(`${code} : ${bad.length} traduction(s) dans une écriture étrangère — ex. ${JSON.stringify(bad[0][1].slice(0, 40))}`);
  }
});

if (errors.length) { console.log(`\n=== ${errors.length} ERREUR(S) ===`); errors.forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('=== i18n OK — couverture complète ===');

// ---- comportement du moteur (détection, repli, formatage) ----
const { t, setLang, browserLang, supported, scale, decimalSep } = await import('./js/i18n.js');
const { fmt } = await import('./js/util.js');

await step('détection : la langue du navigateur est réduite à sa base', () => {
  // navigator est en lecture seule sous Node : on le redéfinit proprement
  const nav = langs => Object.defineProperty(globalThis, 'navigator',
    { value: { languages: langs }, configurable: true, writable: true });
  nav(['pt-BR', 'en-US']);
  if (browserLang() !== 'pt') throw new Error('pt-BR devrait donner pt');
  nav(['zh-Hant-TW']);
  if (browserLang() !== 'zh') throw new Error('zh-Hant-TW devrait donner zh');
  nav(['sv-SE']);                                     // langue non prise en charge
  if (browserLang() !== null) throw new Error('une langue inconnue ne doit correspondre à aucune');
  if (supported('sv')) throw new Error('sv ne devrait pas être déclarée');
});

await step('traduction et substitutions', async () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  await setLang('de', false);
  if (t('Aide') !== 'Hilfe') throw new Error('traduction allemande absente');
  if (t('Incident : {0}', 'X') !== 'Zwischenfall: X') throw new Error('substitution non appliquée');
  if (t('Une chaîne jamais traduite') !== 'Une chaîne jamais traduite')
    throw new Error('le repli doit rendre le français, pas une clé');
});

await step('formatage : échelles longue, courte et par 10⁴', async () => {
  await setLang('fr', false);
  if (fmt(1.2e9) !== '1,20 Md') throw new Error('échelle longue française : ' + fmt(1.2e9));
  await setLang('en', false);
  if (fmt(1.2e9) !== '1.20B') throw new Error('échelle courte anglaise : ' + fmt(1.2e9));
  await setLang('zh', false);
  if (scale().base !== 4) throw new Error('le chinois doit grouper par 10⁴');
  if (fmt(1.2e9) !== '12.00亿') throw new Error('groupement chinois : ' + fmt(1.2e9));
  await setLang('de', false);
  if (decimalSep() !== ',') throw new Error('séparateur décimal allemand');
  if (fmt(1.2e9) !== '1,20 Mrd') throw new Error('échelle allemande : ' + fmt(1.2e9));
  await setLang('fr', false);
});

if (errors.length) { console.log(`\n=== ${errors.length} ERREUR(S) ===`); errors.forEach(e => console.log(' - ' + e)); process.exit(1); }
