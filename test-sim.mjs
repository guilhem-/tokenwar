// Simulateur headless : joue automatiquement pour valider l'équilibrage et la robustesse.
import { Game } from './js/game.js';
import { GPUS, ENERGY, PROJECTS, MODELS, INFRA } from './js/data.js';
import { fmt } from './js/util.js';

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

function bot() {
  const g = game, s = g.state;
  // amorçage : cliquer tant qu'on n'a quasiment pas de compute
  if (g.computeRaw() < 3) { for (let i = 0; i < 25; i++) g.manualGenerate(); }

  // 0) incidents : le bot met ~12 s à repérer la boîte d'alerte, puis remédie
  if (s.crisis && s.playSeconds - s.crisis.startedAt > 12) g.resolveCrisis(true);

  // 1) lever tous les fonds disponibles
  for (const f of FUNDING) if (!s.fundingDone[f.id] && s.lifetimeTokens >= f.need) g.claimFunding(f.id);

  // 1b) RESSOURCES HUMAINES : embaucher selon les besoins (R&D pour le prochain modèle,
  //     marketeurs pour absorber la production via la demande, RH pour la capacité)
  const prod0 = Math.max(g.computeEffective() * s.alloc.serve * g.model.throughput, 1);
  const repF0 = 0.4 + s.reputation / 80;
  const desiredL = Math.min(60, Math.max(3, Math.ceil(1 + Math.log(prod0 / (6e4 * s.mods.demandMult * repF0)) / Math.log(1.9))));
  const wantRnd = g.canTrainNext() ? (g.nextModel().minRnd || 0) : g.empCount('rnd');
  const baseMkt = g.marketingCap() - g.empCount('marketer'); // = BASE_MARKETING
  const wantMkt = Math.max(0, desiredL - baseMkt);
  // les RH occupent eux-mêmes un poste : on vise une capacité NETTE de RH suffisante
  // (cap − RH = 3 + 4·RH, donc la boucle converge toujours)
  const wantHead = wantRnd + wantMkt + 4;
  let hrGuard = 0;
  while (g.headcountCap() - g.empCount('hr') < wantHead && hrGuard++ < 200) g.hire('hr');
  while (g.empCount('rnd') < wantRnd && g.canHire('rnd')) g.hire('rnd');
  while (g.empCount('marketer') < wantMkt && g.canHire('marketer')) g.hire('marketer');

  // 2) PRIORITÉ : entraîner tous les modèles abordables (garde le capital pour ça)
  let trained = true;
  while (trained) trained = g.trainNext();

  // 3) projets abordables
  for (const p of PROJECTS) { if (!s.projectsDone[p.id] && p.req(g)) g.buyProject(p.id); }

  // 4) tarification optimale — helper partagé avec le jeu (une seule source de vérité)
  s.priceSlider = g.optimalPriceSlider();

  // 5) marketing : monter jusqu'au plafond (limité par les marketeurs)
  while (g.canBuyMarketing() && s.money >= g.marketingCost() * 8) g.buyMarketing();

  // 6) infra : on garde une RÉSERVE pour le prochain modèle, puis on investit le reste
  const reserve = g.canTrainNext() ? (g.nextModel().cost.money || 0) * 1.1 : 0;
  const buyEnergyHeadroom = () => {
    let guard = 0;
    while (guard++ < 200 && s.energyCap < g.energyUse() * 1.5) {
      let best = null, bestRatio = Infinity;
      for (const e of ENERGY) {
        if (e.phase && g.phase < e.phase) continue;
        if (!g.dateUnlocked(e)) continue;
        const c = g.energyCost(e);
        if (c <= s.money - reserve) { const r = c / e.mw; if (r < bestRatio) { bestRatio = r; best = e; } }
      }
      if (!best || !g.buyEnergy(best.id)) break;
    }
  };
  // chaîne d'hébergement : garder des emplacements GPU libres devant soi
  const ensureHosting = () => {
    let guard = 0;
    while (guard++ < 800 && g.hostingActive() && g.freeSlots('gpu') < 16) {
      let target = g.freeSlots('server') >= 1 ? 'server'
        : g.freeSlots('rack') >= 1 ? 'rack'
        : g.freeSlots('datacenter') >= 1 ? 'datacenter' : 'realestate';
      const item = INFRA.find(x => x.id === target);
      if (s.money - reserve < g.infraCost(item)) break;
      if (!g.buyInfra(target)) break;
    }
  };
  let safety = 0;
  while (safety++ < 600) {
    // ne pas sur-produire : au-delà de ~2× la demande, les tokens seraient perdus
    const prodNow = g.computeEffective() * s.alloc.serve * g.model.throughput;
    if (g.phase < 2 && prodNow > g.demandPerSec() * 2) break;
    buyEnergyHeadroom();
    ensureHosting();
    if (g.energyThrottle() <= 0.9) break;
    let bought = false;
    for (let i = GPUS.length - 1; i >= 0; i--) {
      const gpu = GPUS[i];
      if (gpu.phase && g.phase < gpu.phase) continue;
      if (!g.dateUnlocked(gpu) || g.discontinued(gpu)) continue; // date / hors-marché
      if (g.hostingActive() && g.freeSlots('gpu') < 1) continue; // pas d'emplacement
      if (s.money - reserve >= g.gpuCost(gpu) * 2.5) { if (g.buyGPU(gpu.id)) bought = true; break; }
    }
    if (!bought) break;
  }

  // 7) allocation phase 2+
  if (g.phase >= 2) {
    g.setAlloc('harvest', 0.5); g.setAlloc('improve', 0.25); g.setAlloc('research', 0.1); g.setAlloc('serve', 0.15);
  }
  // 8) améliorations de sondes phase 3
  if (g.phase >= 3) { for (const sp of ['harvest','replication','speed','hazard']) g.upgradeProbe(sp); }
}
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
