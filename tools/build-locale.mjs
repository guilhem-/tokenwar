// Génère js/locales/<lang>.js à partir d'un fichier de traductions.
//   node tools/build-locale.mjs <lang> <fichier>
// Le fichier contient UNE traduction par ligne, dans l'ordre exact de
// allStrings(). Le script vérifie le nombre de lignes et la préservation des
// substitutions {0}, {1}… : un décalage d'une seule ligne est donc détecté.
import { readFileSync, writeFileSync } from 'fs';
import { allStrings } from './strings.mjs';

const [lang, file] = process.argv.slice(2);
if (!lang || !file) { console.error('usage: build-locale.mjs <lang> <fichier>'); process.exit(1); }

const keys = allStrings();
const lines = readFileSync(file, 'utf8').replace(/\n$/, '').split('\n');
if (lines.length !== keys.length) {
  console.error(`✗ ${lang} : ${lines.length} traductions pour ${keys.length} chaînes attendues`);
  process.exit(1);
}
const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(',');
const bad = [];
keys.forEach((k, i) => { if (ph(k) !== ph(lines[i])) bad.push(`${i + 1}: ${JSON.stringify(k.slice(0, 48))}`); });
if (bad.length) {
  console.error(`✗ ${lang} : substitutions altérées (décalage ?) sur ${bad.length} ligne(s)`);
  bad.slice(0, 5).forEach(b => console.error('   ' + b));
  process.exit(1);
}
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const body = keys.map((k, i) => `  '${esc(k)}':\n    '${esc(lines[i])}',`).join('\n');
writeFileSync(`js/locales/${lang}.js`,
`// =====================================================================
//  TokenWar — ${lang.toUpperCase()}
//  Généré par tools/build-locale.mjs. La clé est la chaîne française source ;
//  une clé absente retombe sur le français, jamais sur une clé technique.
// =====================================================================
export default {
${body}
};
`);
console.log(`✓ js/locales/${lang}.js — ${keys.length} chaînes`);
