// Applique un correctif incrémental aux fichiers de langue.
//   node tools/patch-locale.mjs <fichier.json>
// Le JSON est de la forme { "chaîne française": { "en": "…", "es": "…", … } }.
// Le script, pour CHAQUE langue :
//   · ajoute les nouvelles traductions ;
//   · élague les clés devenues orphelines (chaînes retirées du jeu) ;
//   · réécrit le fichier trié dans l'ordre de l'inventaire, pour que les
//     différences restent lisibles d'une version à l'autre.
// Il refuse d'écrire si une langue reste incomplète : mieux vaut un échec
// bruyant qu'un fichier à moitié traduit livré en production.
import { readFileSync, writeFileSync } from 'fs';
import { allStrings } from './strings.mjs';
import { LANGS } from '../js/i18n.js';

const [file] = process.argv.slice(2);
if (!file) { console.error('usage: patch-locale.mjs <fichier.json>'); process.exit(1); }

const patch = JSON.parse(readFileSync(file, 'utf8'));
const keys = allStrings();
const known = new Set(keys);
const targets = LANGS.map(l => l.code).filter(c => c !== 'fr');
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
let failed = false;

for (const code of targets) {
  const mod = await import(`../js/locales/${code}.js`);
  const dict = { ...(mod.default || {}) };
  let added = 0, pruned = 0;
  for (const [fr, byLang] of Object.entries(patch)) {
    if (byLang[code] == null) continue;
    if (dict[fr] == null) added++;
    dict[fr] = byLang[code];
  }
  for (const k of Object.keys(dict)) if (!known.has(k)) { delete dict[k]; pruned++; }

  const missing = keys.filter(k => dict[k] == null);
  if (missing.length) {
    console.error(`✗ ${code} : ${missing.length} chaîne(s) encore non traduite(s) — ex. ${JSON.stringify(missing[0].slice(0, 50))}`);
    failed = true;
    continue;
  }
  const body = keys.map(k => `  '${esc(k)}':\n    '${esc(String(dict[k]))}',`).join('\n');
  writeFileSync(`js/locales/${code}.js`,
`// =====================================================================
//  TokenWar — ${code.toUpperCase()}
//  Généré par tools/build-locale.mjs puis tools/patch-locale.mjs. La clé est
//  la chaîne française source ; une clé absente retombe sur le français.
// =====================================================================
export default {
${body}
};
`);
  console.log(`✓ ${code} — ${keys.length} chaînes (+${added} ajoutée(s), −${pruned} élaguée(s))`);
}
process.exit(failed ? 1 : 0);
