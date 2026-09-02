// Simulateur headless : joue automatiquement pour valider l'équilibrage et la robustesse.
import { Game } from './js/game.js';
import { GPUS, ENERGY, PROJECTS, MODELS, INFRA, OPTIMS, PROGRAMS } from './js/data.js';
import { fmt } from './js/util.js';
import { makeBot } from './test-bot.mjs';

const stub = {
  toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(ev){
    // auto-choisit l'option 0 immédiatement
    ev.choices[0].apply(game);
  }, showEnding(){ this.ended=true; }, modalOpen:false,
};
const game = new Game(stub);

let t = 0;                 // secondes simulées
const DT = 0.25;
let lastReport = 0;
const phaseTimes = {};

import { FUNDING } from './js/game.js';

const bot = makeBot(game);

const MAX_T = 4 * 3600; // 4h simulées max
let badNum = false;
while (t < MAX_T && !stub.ended) {
  game.tick(DT);
  if (Math.floor(t) % 2 === 0) bot();
  // suivi des transitions de phase
  if (!phaseTimes[game.phase]) phaseTimes[game.phase] = t;
  // contrôle NaN/Infinity
  const s = game.state;
  for (const k of ['lifetimeTokens','money','research','matter','intelligence','energyCap']) {
    if (!isFinite(s[k])) { console.log(`!! ${k} = ${s[k]} à t=${t.toFixed(0)}s`); badNum = true; }
  }
  if (badNum) break;
  // Emballement des chantiers : pendingCount parcourt la liste, donc une file
  // qui gonfle ralentit tout le moteur au carré. Mieux vaut échouer bruyamment
  // que tourner huit heures sans écrire une ligne.
  if (s.builds.length > 2000) {
    console.log(`!! ${s.builds.length} chantiers en file à t=${t.toFixed(0)}s — commande en boucle`);
    badNum = true; break;
  }
  if (game.phase >= 2 && t - lastReport >= 10) {
    lastReport = t;
    const s2 = game.state;
    console.log(`  t=${t.toFixed(0)}s ph${game.phase} cmpRaw=${fmt(game.computeRaw())} cmpEff=${fmt(game.computeEffective())} intel=${fmt(s2.intelligence)} matterRate=${fmt(s2.rates.matter)} earth=${(s2.earthConsumed*100).toFixed(2)}% univ=${(s2.universeConsumed*100).toFixed(3)}% alloc h=${s2.alloc.harvest.toFixed(2)} i=${s2.alloc.improve.toFixed(2)}`);
  }
  if (t - lastReport >= (game.phase >= 2 ? 120 : 600)) {
    lastReport = t;
    console.log(`t=${(t/60).toFixed(0)}min ph${game.phase} | tokens=${fmt(s.lifetimeTokens)} $=${fmt(s.money)} cmp=${fmt(game.computeRaw())} mdl=${MODELS[s.modelTier].name} earth=${(s.earthConsumed*100).toFixed(1)}% univ=${(s.universeConsumed*100).toFixed(3)}%`);
  }
  t += DT;
}

console.log('\n=== RÉSUMÉ ===');
console.log('Temps écoulé:', (t/60).toFixed(1), 'min  | terminé:', !!stub.ended);
console.log('Transitions de phase (min):', Object.fromEntries(Object.entries(phaseTimes).map(([k,v])=>[k,(v/60).toFixed(1)])));
const s = game.state;
console.log('Modèle final:', MODELS[s.modelTier].name);
console.log('Tokens:', fmt(s.lifetimeTokens), '| Terre:', (s.earthConsumed*100).toFixed(1)+'%', '| Univers:', (s.universeConsumed*100).toFixed(3)+'%');
console.log('Intelligence:', fmt(s.intelligence), '| Sondes:', fmt(s.probes));
console.log('NaN/Inf détecté:', badNum);
// code de sortie exploitable par le CI : échec si la partie ne se termine pas ou si NaN
process.exit(stub.ended && !badNum ? 0 : 1);
