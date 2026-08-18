// Test de fumée de l'UI réelle via jsdom : charge index.html, instancie UI+Game,
// rend, déclenche un événement, change de phase, affiche la fin. Détecte les erreurs DOM.
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const html = readFileSync('./index.html', 'utf8');
const dom = new JSDOM(html, { url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;

// expose les globals attendus par ui.js
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.localStorage = window.localStorage || { getItem(){return null;}, setItem(){}, removeItem(){} };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = window.performance || { now: () => Date.now() };
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.innerWidth = window.innerWidth; globalThis.innerHeight = window.innerHeight;
window.__speed = 1;

let errors = [];
// await impératif : une étape asynchrone qui échoue doit être ENREGISTRÉE,
// pas affichée « OK » pendant que le rejet part dans le vide.
async function step(label, fn) {
  try { await fn(); console.log('OK  ' + label); }
  catch (e) { errors.push(label + ' :: ' + e.message); console.log('ERR ' + label + ' :: ' + e.stack.split('\n').slice(0,3).join(' | ')); }
}

const { Game } = await import('./js/game.js');
const { UI } = await import('./js/ui.js');
const { Cinematic } = await import('./js/ending.js');
const { GPUS, INFRA, ENERGY } = await import('./js/data.js');

const ui = new UI();
const game = new Game(ui);

await step('ui.init', () => ui.init(game));
await step('render initial', () => ui.render(true));

// quelques ticks + rendus en phase 1
await step('ticks phase 1 + render', () => { for (let i=0;i<40;i++){ game.tick(0.25); if(i%5===0) ui.render(); } });

// clic manuel
await step('manualGenerate + render', () => { for(let i=0;i<5;i++) game.manualGenerate(); ui.render(); });

// achats divers
await step('buyGPU consumer', () => { game.state.money = 1e6; game.buyGPU('consumer'); ui.render(); });
await step('buyEnergy grid', () => { game.buyEnergy('grid'); ui.render(); });
await step('buyMarketing', () => { game.buyMarketing(); ui.render(); });
await step('slider prix', () => { ui.el.priceSlider.value = 55; ui.el.priceSlider.dispatchEvent(new window.Event('input')); ui.render(); });

// clic manuel = vente directe (l'argent monte immédiatement)
await step('clic manuel vend directement', () => {
  const m0 = game.money;
  game.manualGenerate();
  if (game.money <= m0) throw new Error('le clic ne rapporte pas d argent');
  if (!/\$/.test(ui.el.btnGenerateSub.textContent || '') && ui.render()) {}
  ui.render();
  if (!/\$/.test(ui.el.btnGenerateSub.textContent)) throw new Error('valeur du clic non affichée');
});
// sparkline présente et échantillonnée
await step('sparkline de production', () => {
  if (!ui.el.spark) throw new Error('canvas sparkline absent');
  for (let i = 0; i < 10; i++) { game.tick(0.25); ui.render(); }
  if (ui.sparkData.length < 2) throw new Error('aucun échantillon collecté');
});
// succès : déblocage + affichage dans l'aide
await step('succès débloqués + affichage', () => {
  game.state.lifetimeTokens = Math.max(game.state.lifetimeTokens, 2e6);
  game.checkAchievements();
  if (!game.state.achievements['million']) throw new Error('succès "million" non débloqué');
  ui.renderAchievements();
  if (!/🏆/.test(ui.el.achievementsBody.innerHTML)) throw new Error('succès non affichés dans l aide');
});
// export/import : présents et sans crash (jsdom n'a pas URL.createObjectURL)
await step('export/import de sauvegarde', () => {
  if (!ui.el.saveExport || !ui.el.saveImport || !ui.el.saveFile) throw new Error('boutons export/import absents');
  ui.exportSave();   // ne doit pas jeter (toast d erreur acceptable en jsdom)
});
// automatisations (auto-clickers : achat + activation/désactivation)
await step('automatisations : achat + toggle', () => {
  game.state.money = 1e6;
  const r = ui.rows.auto['gpu'];
  r.btn.dispatchEvent(new window.Event('click'));          // acheter
  if (!game.state.auto.gpu.owned) throw new Error('auto-GPU non acheté');
  ui.render();
  if (!/activé/.test(r.cost.textContent)) throw new Error('état activé non affiché');
  r.btn.dispatchEvent(new window.Event('click'));          // désactiver
  if (game.state.auto.gpu.on) throw new Error('toggle off échoué');
  ui.render();
});

// auto-achat PAR élément (toggle sur une carte précise)
await step('auto-achat par élément (toggle sur une carte)', () => {
  game.state.auto.gpu.owned = true; game.state.auto.gpu.on = true;
  const r = ui.rows.gpu['consumer'];
  // le bouton n'apparaît qu'à partir de 20 exemplaires en service
  game.state.gpuCounts['consumer'] = 5;
  ui.render();
  if (!r.autoBtn.classList.contains('hidden')) throw new Error('toggle auto visible avec moins de 20 exemplaires');
  game.state.gpuCounts['consumer'] = 20;
  ui.render();
  if (r.autoBtn.classList.contains('hidden')) throw new Error('toggle auto absent alors que capacité achetée et 20 exemplaires');
  r.autoBtn.dispatchEvent(new window.Event('click'));
  if (!game.isAutoItem('gpu', 'consumer')) throw new Error('auto élément non activé');
  ui.render();
  if (!r.autoBtn.classList.contains('on')) throw new Error('état actif non affiché');
  // une autre carte non cochée ne doit pas être auto
  if (game.isAutoItem('gpu', 'v100')) throw new Error('auto appliqué à toute la famille');
});

// boutons d'achat groupé ×10 / ×100
await step('boutons ×10 (≥20) et ×100 (≥200)', () => {
  game.state.money = 1e12;
  game.state.infraCounts.realestate = 50; game.state.infraCounts.datacenter = 50; game.state.infraCounts.rack = 50; game.state.infraCounts.server = 500;
  const r = ui.rows.gpu['consumer'];
  game.state.gpuCounts['consumer'] = 25;          // ≥20 → ×10 visible, ×100 caché
  ui.render();
  if (r.bulk10.classList.contains('hidden')) throw new Error('×10 caché alors que ≥20');
  if (!r.bulk100.classList.contains('hidden')) throw new Error('×100 visible alors que <200');
  const before = game.state.gpuCounts['consumer'];
  r.bulk10.dispatchEvent(new window.Event('click'));
  // les cartes commandées passent d'abord par le chantier (délai de mise en service)
  if (game.pendingCount('gpu', 'consumer') !== 10) throw new Error('×10 n a pas commandé 10');
  game.tick(30);                                   // on laisse le temps du rackage
  if (game.state.gpuCounts['consumer'] < before + 10) throw new Error('×10 n a pas livré 10');
  game.state.gpuCounts['consumer'] = 250;         // ≥200 → ×100 visible
  ui.render();
  if (r.bulk100.classList.contains('hidden')) throw new Error('×100 caché alors que ≥200');
});

// chaîne d'hébergement + GPU + revente
await step('buyInfra serveur (chantier puis mise en service)', () => {
  game.state.money = 1e9;
  const before = game.capacityFor('gpu');
  game.buyInfra('server');
  ui.render();
  // pendant le chantier : l'emplacement parent est réservé, mais aucune capacité encore offerte
  if (game.pendingCount('infra', 'server') !== 1) throw new Error('serveur non mis en chantier');
  if (game.capacityFor('gpu') !== before) throw new Error('capacité offerte avant la fin du chantier');
  // …mais la capacité PRÉVUE la compte, pour ne pas recommander en boucle
  if (game.plannedCapacityFor('gpu') <= before) throw new Error('capacité prévue ignorant le chantier');
  game.tick(30);
  if (game.capacityFor('gpu') <= before) throw new Error('capacité GPU non augmentée après le chantier');
});
await step('buyGPU avec emplacement + render slot', () => { game.buyGPU('consumer'); ui.render(); if (ui.el.gpuCap.textContent.indexOf('/') < 0) throw new Error('indicateur emplacements absent'); });
await step('sellGPU (revente)', () => { const n = game.state.gpuCounts['consumer'] || 0; if (n < 1) game.buyGPU('consumer'); ui.rows.gpu['consumer'].sell.dispatchEvent(new window.Event('click')); ui.render(); });
// équipe (RH) + charges + dépendances
await step('embauche/licenciement + charges affichées', () => {
  ui.rows.team['hr'].hireBtn.dispatchEvent(new window.Event('click'));
  ui.rows.team['rnd'].hireBtn.dispatchEvent(new window.Event('click'));
  ui.render();
  if (game.headcount() < 2) throw new Error('embauche échouée');
  if (!/\/j/.test(ui.el.chargeTotal.textContent)) throw new Error('charges journalières non affichées');
  if (!/\d/.test(ui.el.headcount.textContent)) throw new Error('effectif non affiché');
  ui.rows.team['rnd'].fireBtn.dispatchEvent(new window.Event('click'));
  if (game.empCount('rnd') !== 0) throw new Error('licenciement échoué');
});
// tokens invendus perdus affichés
await step('affichage tokens perdus + date au jour', () => {
  if (!/\/s/.test(ui.el.invTokens.textContent)) throw new Error('débit de tokens perdus non affiché');
  if (!/\d+ \w+ \d{4}/.test(ui.el.simDate.textContent)) throw new Error('date jour-mois-année absente');
});
// colocation (espace en datacenter)
await step('colocation : espace loué (+baies)', () => {
  const before = game.capacityFor('rack');
  ui.rows.infra['rack'].el.querySelector('[data-act=rent]').dispatchEvent(new window.Event('click'));
  if (game.capacityFor('rack') <= before) throw new Error('colocation sans effet');
  ui.render();
});
// location de datacenter
await step('location datacenter (coût journalier)', () => {
  const before = game.capacityFor('rack');
  ui.rows.infra['datacenter'].el.querySelector('[data-act=rent]').dispatchEvent(new window.Event('click'));
  if (game.capacityFor('rack') <= before) throw new Error('capacité baies non augmentée par location');
  ui.render();
  if (!/loué/.test(ui.rows.infra['datacenter'].rentInfo.textContent)) throw new Error('info location absente');
  ui.rows.infra['datacenter'].el.querySelector('[data-act=unrent]').dispatchEvent(new window.Event('click'));
});
// bourse
await step('bourse dépôt/retrait + risque', () => {
  game.state.money = 1e6; game.state.stockUnlocked = true; // débloquée à 100k$
  ui.el.btnStockDepMax.dispatchEvent(new window.Event('click'));
  if (game.state.stock.invested <= 0) throw new Error('dépôt échoué');
  for (let i = 0; i < 20; i++) game.tick(0.5);          // le portefeuille évolue
  ui.el.riskTabs.querySelector('[data-risk="2"]').dispatchEvent(new window.Event('click'));
  if (game.state.stock.risk !== 2) throw new Error('risque non appliqué');
  ui.el.btnStockWithdraw.dispatchEvent(new window.Event('click'));
  if (game.state.stock.invested !== 0) throw new Error('retrait échoué');
  ui.render();
});
// énergie en kW affichée
await step('énergie affichée en kW/MW', () => { if (!/kW|MW/.test(ui.el.statEnergy.textContent)) throw new Error('format puissance absent'); });
// redémarrage depuis le début
await step('redémarrage (restart)', () => {
  game.state.lifetimeTokens = 5e6; game.state.modelTier = 4;
  ui.el.btnRestart.dispatchEvent(new window.Event('click'));
  if (ui.el.restartOverlay.classList.contains('hidden')) throw new Error('confirmation non affichée');
  ui.el.restartConfirm.dispatchEvent(new window.Event('click'));
  if (game.state.lifetimeTokens !== 0 || game.state.modelTier !== 0) throw new Error('partie non réinitialisée');
  ui.render();
});

// événement → modale → choix
await step('showEvent + choisir option 0', () => {
  const ev = game.pickEvent() || { id:'t', title:'Test', body:'b', phase:1, choices:[{label:'A',desc:'d',apply:()=>{}},{label:'B',desc:'d',apply:()=>{}}] };
  ui.showEvent(ev);
  if (ui.el.modalOverlay.classList.contains('hidden')) throw new Error('modale non affichée');
  ui.el.modalChoices.querySelector('.choice').dispatchEvent(new window.Event('click'));
  if (!ui.el.modalOverlay.classList.contains('hidden')) throw new Error('modale non fermée après choix');
});

// directives permanentes : achat, case à cocher, résolution automatique
await step('addendum : directives + case « désormais » + auto-résolution', () => {
  game.state.money = 1e6;
  ui.rows.addendum['directives'].el.dispatchEvent(new window.Event('click'));
  if (!game.state.addendum) throw new Error('achat des directives échoué');
  const ev = { id:'test_auto', title:'T', body:'b', phase:1, choices:[{label:'A',desc:'d',apply:g=>{g.state._autoHit=(g.state._autoHit||0)+1;}},{label:'B',desc:'d',apply:()=>{}}] };
  ui.showEvent(ev);
  const box = ui.el.modalChoices.querySelector('.auto-choice input');
  if (!box) throw new Error('case à cocher absente alors que directives actives');
  box.checked = true;
  ui.el.modalChoices.querySelector('.choice').dispatchEvent(new window.Event('click'));
  if (game.state.autoChoices['test_auto'] !== 0) throw new Error('directive non mémorisée');
  if (!game.autoResolve(ev)) throw new Error('auto-résolution refusée');
  if (game.state._autoHit !== 2) throw new Error('choix non appliqué automatiquement');
  ui.render();
});

// datacenter orbital : commande → 18 mois → retard 6 mois → faillite
await step('datacenter orbital : chrono, retard, faillite', () => {
  game.state.playSeconds = (2031 - 2019) * 300; // an 2031, fenêtre 2030-2040
  game.state.money = 1e8;
  ui.render();
  const r = ui.rows.addendum['spacedc'];
  if (r.el.classList.contains('hidden')) throw new Error('offre orbitale invisible en 2031');
  r.el.dispatchEvent(new window.Event('click'));
  if (game.state.spaceDC.status !== 'building') throw new Error('commande échouée');
  if (!game.spaceDCNews('order')) throw new Error('titre « commande » inactif');
  game.state.playSeconds += 18 * 25 + 1; game.tickSpaceDC();   // 18 mois
  if (game.state.spaceDC.status !== 'delayed') throw new Error('retard non déclenché à 18 mois');
  if (!game.spaceDCNews('delay')) throw new Error('titre « retard » inactif');
  ui.render();
  if (r.bar.classList.contains('hidden')) throw new Error('barre de chrono absente');
  game.state.playSeconds += 6 * 25 + 1; game.tickSpaceDC();    // +6 mois
  if (game.state.spaceDC.status !== 'bankrupt') throw new Error('faillite non déclenchée');
  if (!game.spaceDCNews('bankrupt')) throw new Error('titre « faillite » inactif');
  game.checkAchievements();
  if (!game.state.achievements['spacedc']) throw new Error('succès orbital non débloqué');
  ui.render();
  game.state.playSeconds = 60; // retour à une date normale pour la suite des tests
});

// ---- inflation simulée : les prix suivent l'indice, pas la trésorerie ----
await step('inflation : indice, prix et pouvoir d achat', () => {
  game.state.playSeconds = 0;
  const idx0 = game.inflIndex();
  const gpu0 = game.gpuCost(GPUS[0]), sal0 = game.salaryPerDay ? game.salaryPerDay() : 0;
  if (Math.abs(idx0 - 1) > 1e-9) throw new Error('indice ≠ 1 en 2019');
  game.state.playSeconds = 300 * 8;                  // huit ans plus tard
  const idx1 = game.inflIndex();
  if (!(idx1 > 1.2)) throw new Error('inflation non cumulée : ' + idx1);
  if (!(game.gpuCost(GPUS[0]) > gpu0 * 1.2)) throw new Error('le prix du matériel ne suit pas l inflation');
  game.state.employees.rnd = 2;
  if (!(game.salaryPerDay() > 2 * 400)) throw new Error('les salaires ne suivent pas l inflation');
  game.state.employees.rnd = 0;
  if (!(game.purchasingLoss() > 0.15)) throw new Error('pouvoir d achat non érodé');
  ui.render();
  if (!/indice/.test(ui.el.chargeInfl.textContent)) throw new Error('inflation non affichée');
  game.state.playSeconds = 60;
});

// ---- coûts d'énergie : unique vs récurrents (fixe / variable / abonnement) ----
await step('énergie : coût unique vs coûts récurrents', () => {
  game.state.energyCounts = { grid: 2, gas: 1 };
  game.state.energyCap = 26;
  const b = game.energyBill();
  if (!(b.sub > 0)) throw new Error('abonnement (puissance souscrite) absent');
  if (!(b.fixed > 0)) throw new Error('coût fixe d exploitation absent');
  if (!(b.variable >= 0)) throw new Error('coût variable absent');
  if (Math.abs(b.total - (b.variable + b.fixed + b.sub)) > 1e-6) throw new Error('total incohérent');
  ui.render();
  const txt = ui.el.chargeElecSub.textContent + ui.el.chargeElecFix.textContent + ui.el.chargeElecVar.textContent;
  if (!/\$/.test(txt)) throw new Error('les trois natures de coût ne sont pas affichées');
  // le capex, lui, est un coût UNIQUE payé à la commande
  const m0 = game.state.money = 1e7;
  game.buyEnergy('solar');
  if (game.state.money >= m0) throw new Error('capex non prélevé à la commande');
});

// ---- délais de mise en service proportionnels à la complexité ----
await step('chantiers : délais croissants avec la complexité', () => {
  const t = f => game.buildSeconds(f.id ? f.id : f, f);
  const secGpu = game.buildSeconds('gpu', GPUS.find(g => g.id === 'consumer'));
  const secRack = game.buildSeconds('gpu', GPUS.find(g => g.id === 'gb200'));
  if (!(secRack > secGpu)) throw new Error('un rack complet devrait être plus long qu une carte gamer');
  const secDc = game.buildSeconds('datacenter', INFRA.find(i => i.id === 'datacenter'));
  const secServer = game.buildSeconds('server', INFRA.find(i => i.id === 'server'));
  if (!(secDc > secServer)) throw new Error('un datacenter devrait être plus long qu un serveur');
  const smr = ENERGY.find(e => e.id === 'nuclear'), sun = ENERGY.find(e => e.id === 'solar');
  if (!(game.buildSeconds('energy', smr) > game.buildSeconds('energy', sun))) throw new Error('un SMR devrait être plus long qu un panneau');
  // la capacité énergétique en chantier est comptée dans la capacité prévue
  game.state.money = 1e7;
  const capPlanned = game.energyCapPlanned(), capReal = game.state.energyCap;
  game.buyEnergy('gas');
  if (!(game.energyCapPlanned() > capPlanned)) throw new Error('capacité énergétique prévue ignorant le chantier');
  if (game.state.energyCap !== capReal) throw new Error('capacité énergétique livrée avant la fin du chantier');
  game.tick(30);
  if (!(game.state.energyCap > capReal)) throw new Error('capacité énergétique non livrée après le chantier');
  // et le badge « en chantier » apparaît bien dans la liste
  game.state.money = 1e9;
  game.state.playSeconds = 60;
  game.state.infraCounts.rack = 4; game.state.infraCounts.server = 4;   // de quoi loger une carte
  if (!game.buyGPU('consumer')) throw new Error('achat de carte refusé alors qu il y a de la place');
  ui.render();
  if (!/chantier/.test(ui.rows.gpu['consumer'].effect.innerHTML)) throw new Error('badge de chantier absent');
  game.tick(30);
});

// ---- crises : boîte rouge cachée, saignée, remédiation ----
await step('crise : apparition silencieuse, saignée puis remédiation', () => {
  game.state.money = 1e6; game.state.modelTier = 3;   // une exploitation réelle à mettre en péril
  game.state.crisis = null; game.state.crisisTimer = 0;
  const logs = ui.el.log.children.length;
  game.tickCrisis(0.1);
  if (!game.state.crisis) throw new Error('aucune crise déclenchée');
  if (ui.el.log.children.length !== logs) throw new Error('la crise ne doit PAS être annoncée dans le journal');
  if (!ui.crisisBox || !ui.el.crisisLayer.querySelector('.crisis-box')) throw new Error('boîte d alerte absente');
  if (!ui.crisisBox.querySelector('.crisis-halo')) throw new Error('halo rouge absent');
  if (!ui.crisisBox.style.top || !ui.crisisBox.style.left) throw new Error('boîte non positionnée dans la page');
  if (ui.el.crisisVignette.classList.contains('hidden')) throw new Error('indice visuel (liseré) absent');
  game.state.money = 1e9;
  for (let i = 0; i < 120; i++) game.tick(0.25);      // 30 s sans réaction
  if (!(game.state.crisis && game.state.crisis.lost > 0)) throw new Error('la trésorerie ne saigne pas');
  ui.render();
  if (!/−\$/.test(ui.crisisBox.querySelector('.crisis-lost').textContent)) throw new Error('pertes non affichées');
  // …et au bout de 2 minutes, la saignée atteint bien ~70% de la fortune
  const f = game._crisisCurve(120);
  if (Math.abs(f - 0.70) > 1e-6) throw new Error('la perte maximale à 2 min devrait être de 70%');
  const cash = game.money;
  ui.crisisBox.querySelector('.crisis-fix').dispatchEvent(new window.Event('click'));
  if (game.state.crisis) throw new Error('la crise n a pas été résolue');
  if (!(game.money < cash)) throw new Error('la remédiation devrait coûter');
  if (ui.el.crisisLayer.querySelector('.crisis-box')) throw new Error('boîte non retirée');
});
await step('crise : résorption automatique au bout de 2 minutes', () => {
  ui.closeModal();                                   // un événement a pu s'ouvrir pendant les ticks
  game.state.money = 1e6; game.state.modelTier = 3;
  game.state.crisis = null; game.state.crisisTimer = 0;
  game.tickCrisis(0.1);
  if (!game.state.crisis) throw new Error('aucune crise déclenchée');
  for (let i = 0; i < 500; i++) game.tick(0.25);      // > 2 minutes
  if (game.state.crisis) throw new Error('la crise aurait dû se résorber seule');
  if (ui.el.crisisLayer.querySelector('.crisis-box')) throw new Error('boîte encore présente');
});

// ---- animations d'inactivité : 12 types, jamais deux fois la même de suite ----
await step('inactivité : tirage sans remise des 12 animations', () => {
  const seen = [];
  let prev = null;
  for (let i = 0; i < 24; i++) {
    const id = ui.idle.nextId();
    if (id === prev) throw new Error('deux fois la même animation de suite : ' + id);
    prev = id; seen.push(id);
  }
  const uniq = new Set(seen.slice(0, 12));
  if (uniq.size !== 12) throw new Error('les 12 animations ne passent pas avant une répétition (' + uniq.size + ')');
});
await step('inactivité : déclenchement après 15 s sans interaction', () => {
  ui.closeModal();
  ui._lastAct = Date.now() - 20000;                  // 20 s d'immobilité
  ui._nextIdleAt = 0;
  game.state.headlineTimer = 99;
  ui._calm = true;                                   // sans canvas (jsdom) : la presse prend le relais
  ui.tickIdle();
  if (game.state.headlineTimer !== 0) throw new Error('aucune manifestation après 15 s d inactivité');
  ui._calm = false;
  ui._lastAct = Date.now();
});

// ---- presse corrélée à l'avancement du joueur ----
await step('presse : titres corrélés au palier de modèle', () => {
  game.state.playSeconds = 300 * 6;                  // 2025
  game.state.modelTier = 0;
  game.state.recentHeadlines = []; game.state.lastHeadlineText = null;
  const low = new Set(); for (let i = 0; i < 200; i++) { const h = game.pickHeadline(); if (h) low.add(h.t); }
  if ([...low].some(t => /essaim|world model|mémoire persistante|super-intelligence/i.test(t)))
    throw new Error('titre d une capacité non atteinte');
  game.state.modelTier = 10;
  const hi = new Set(); for (let i = 0; i < 400; i++) { const h = game.pickHeadline(); if (h) hi.add(h.t); }
  if (![...hi].some(t => /essaim/i.test(t))) throw new Error('aucun titre lié au palier atteint');
  if (game.tierLag() < 0) throw new Error('retard technologique négatif');
  game.state.playSeconds = 60;
});

// ---- énergie de départ : 10 kW, puis subvention « jeunes pousses » ----
await step('énergie de départ nulle + subvention', async () => {
  const fresh = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  if (fresh.state.energyCap !== 0) throw new Error('aucune puissance ne devrait être offerte au départ');
  if (fresh.energyThrottle() !== 0) throw new Error('sans raccordement, le calcul doit être totalement bridé');
  if (fresh.money !== 30000) throw new Error('la trésorerie de départ devrait être de 30 000');
  if (fresh.infraCount('rack') !== 0 || fresh.infraCount('server') !== 0)
    throw new Error('la partie doit démarrer sans baie ni serveur');
  if (fresh.freeSlots('gpu') !== 0) throw new Error('aucun emplacement GPU tant que rien n est bâti');
  const { HEADLINES } = await import('./js/data.js');
  const grant = HEADLINES.find(h => h.id === 'energy_grant');
  if (!grant) throw new Error('titre de subvention énergie absent');
  if (!grant.cond(fresh)) throw new Error('la subvention devrait être proposée à une startup sous-alimentée');
  grant.effect(fresh);
  if (!(fresh.state.energyCap >= 0.15)) throw new Error('la subvention n a pas renforcé le raccordement');
  fresh.state.headlinesFired[grant.id] = true;
  if (fresh.pickHeadline() === grant) throw new Error('la subvention devrait être unique');
});

// ---- optimisations récurrentes (CUDA 18 mois, moteur 9 mois, contexte 12 mois) ----
await step('optimisations : une seule proposée, intégrée puis deux mois de calme', async () => {
  const { OPTIMS } = await import('./js/data.js');
  const per = Object.fromEntries(OPTIMS.map(o => [o.id, o.months]));
  if (per.cuda !== 18 || per.engine !== 9 || per.context !== 12)
    throw new Error('périodicités attendues : CUDA 18, moteur 9, contexte 12');
  const { OPTIM_GAP_MONTHS, INTEGRATION_WEEKS } = await import('./js/data.js');
  if (OPTIM_GAP_MONTHS !== 2) throw new Error('le calme entre deux optimisations devrait être de deux mois');
  game.state.playSeconds = 60; game.state.money = 1e6;
  game.state.optims = {}; game.state.integrations = []; game.state.lastOptimAt = -1e9;
  const monthSec = 300 / 12, weekSec = 300 / 52;

  // les trois sont dues d'entrée, mais une seule est proposée
  if (OPTIMS.some(o => !game.optimReady(o))) throw new Error('les trois devraient être dues d entrée');
  const proposee = game.nextOptim();
  if (!proposee) throw new Error('aucune optimisation proposée');
  const autre = OPTIMS.find(o => o.id !== proposee.id);
  if (game.buyOptim(autre.id)) throw new Error('une optimisation non proposée a été achetée');
  if (Math.abs(game.optimCost(proposee) - 1000 * game.inflIndex()) > 1e-6) throw new Error('coût ≠ 1000 $');

  // payée tout de suite, effective seulement une fois intégrée
  const avant = { cmp: game.mods.computeMult, q: game.mods.qualityMult, e: game.mods.energyEff, argent: game.money };
  if (!game.buyOptim(proposee.id)) throw new Error(`${proposee.id} non achetable`);
  if (!(game.money < avant.argent)) throw new Error('l optimisation n a pas été payée');
  if (game.mods.computeMult !== avant.cmp || game.mods.qualityMult !== avant.q || game.mods.energyEff !== avant.e)
    throw new Error('l effet est tombé avant la fin de l intégration');
  const p0 = game.integrationProgress('optim');
  if (p0 == null || p0 > 0.01) throw new Error('la barre d intégration ne démarre pas à zéro');

  // l'intégration dure entre 1 et 4 semaines : rien avant, tout après
  game.state.playSeconds += INTEGRATION_WEEKS[0] * weekSec * 0.99; game.tickIntegrations();
  if (game.optimState(proposee.id).n !== 0) throw new Error('intégrée en moins d une semaine');
  game.state.playSeconds += INTEGRATION_WEEKS[1] * weekSec; game.tickIntegrations();
  if (game.optimState(proposee.id).n !== 1) throw new Error('toujours pas intégrée après quatre semaines');
  const gained = game.mods.computeMult > avant.cmp || game.mods.qualityMult > avant.q || game.mods.energyEff < avant.e;
  if (!gained) throw new Error(`${proposee.id} sans effet une fois intégrée`);
  if (game.integrationProgress('optim') != null) throw new Error('l intégration devrait être terminée');
  // …et elle revient exactement à l'échéance annoncée, comptée depuis l'intégration
  if (Math.abs(game.optimWait(proposee) - proposee.months * monthSec) > 0.5)
    throw new Error(`${proposee.id} : échéance incorrecte`);

  // deux mois de calme avant qu'une autre soit proposée
  if (game.nextOptim()) throw new Error('une optimisation est proposée aussitôt après');
  game.state.playSeconds += 1.9 * monthSec;
  if (game.nextOptim()) throw new Error('une optimisation apparaît avant les deux mois');
  game.state.playSeconds += 0.2 * monthSec;
  const suivante = game.nextOptim();
  if (!suivante) throw new Error('aucune optimisation après les deux mois');
  if (suivante.id === proposee.id) throw new Error('la même optimisation est reproposée aussitôt');

  // l'interface n'en montre jamais plus d'une
  ui.render();
  const visibles = Object.values(ui.rows.optim).filter(r => !r.el.classList.contains('hidden'));
  if (visibles.length > 1) throw new Error(visibles.length + ' optimisations affichées au lieu d une');
  game.state.playSeconds = 60; game.state.optims = {}; game.state.integrations = []; game.state.lastOptimAt = -1e9;
});

// ---- directives permanentes : achetées à l'unité, au prix du moment ----
await step('directives : une par paiement, prix croissant, plafond', () => {
  ui.closeModal();
  game.state.playSeconds = 0;                      // inflation neutre
  game.state.addendum = false; game.state.directivesPaid = 0; game.state.autoChoices = {};
  game.state.money = 1e12;
  const c1 = game.addendumCost();
  if (Math.abs(c1 - 250000) > 1e-6) throw new Error('première directive ≠ 250 000 $');
  if (!game.buyAddendum()) throw new Error('achat de la première directive refusé');
  if (game.directiveSlots() !== 1) throw new Error('un paiement doit ouvrir UNE directive, pas ' + game.directiveSlots());
  if (!game.setAutoChoice('ev0', 0)) throw new Error('directive 0 refusée');
  // la deuxième est refusée tant qu'on n'a pas payé une place de plus
  if (game.setAutoChoice('ev1', 0)) throw new Error('2e directive acceptée sans payer');
  // …mais remplacer une directive existante reste gratuit
  if (!game.setAutoChoice('ev0', 1)) throw new Error('remplacement d une directive refusé');
  if (game.state.autoChoices['ev0'] !== 1) throw new Error('remplacement non appliqué');
  // le prix monte d'un cran à chaque directive
  const c2 = game.addendumCost();
  if (Math.abs(c2 - 500000) > 1e-6) throw new Error('deuxième directive ≠ 500 000 $ (' + c2 + ')');
  if (!game.buyAddendum()) throw new Error('achat de la deuxième refusé');
  if (game.directiveSlots() !== 2) throw new Error('la deuxième n a pas ouvert de place');
  if (Math.abs(game.addendumCost() - 750000) > 1e-6) throw new Error('troisième directive ≠ 750 000 $');
  if (!game.setAutoChoice('ev1', 0)) throw new Error('2e directive toujours refusée après paiement');
  // plafond : on ne vend pas plus de places qu'il n'existe d'événements à choix
  const cap = game.directiveCap();
  if (cap < 10) throw new Error('plafond invraisemblable : ' + cap);
  game.state.directivesPaid = cap;
  if (!game.directivesMaxed()) throw new Error('plafond non détecté');
  if (game.buyAddendum()) throw new Error('une directive vendue au-delà du plafond');
  if (game.state.directivesPaid !== cap) throw new Error('le plafond a été franchi');
  // la case à cocher de la modale reflète le quota atteint
  game.state.directivesPaid = 1; game.state.autoChoices = {};
  game.setAutoChoice('ev0', 0);
  const ev = { id:'ev_full', title:'T', body:'B', phase:1, choices:[{ label:'a', desc:'d', apply(){} }] };
  ui.showEvent(ev);
  const box = ui.el.modalChoices.querySelector('#auto-choice-box');
  if (!box || !box.disabled) throw new Error('case à cocher active alors que le quota est atteint');
  ui.closeModal();
  game.state.autoChoices = {};
  game.state.playSeconds = 60;
});


// ---- migration : une vieille sauvegarde ne doit pas conserver les 500 kW ----
await step('migration : ancienne sauvegarde ramenée au nouveau raccordement', () => {
  const stub = { toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false };
  // sauvegarde d'avant le changement de règle : base 500 kW + 2 raccordements achetés,
  // et PAS de marqueur `baseGridMW` (c'est à cela qu'on la reconnaît).
  const old = { v:4, savedAt: Date.now(), lifetimeTokens: 1e6, money: 5000,
    energyCap: 1.5, energyCounts: { grid: 2 } };
  window.localStorage.setItem('tokenwar_save_v1', JSON.stringify(old));
  const g = new Game(stub);
  if (!g.load()) throw new Error('sauvegarde non chargée');
  // 1,5 MW − (0,5 offert autrefois − 0 aujourd'hui) = 1,0 MW : les 2 raccordements achetés restent
  if (Math.abs(g.state.energyCap - 1.0) > 1e-6) throw new Error('capacité migrée incorrecte : ' + g.state.energyCap);
  if (g.state.baseGridMW !== 0) throw new Error('marqueur de règle non posé');
  // une sauvegarde déjà migrée ne doit PAS être amputée une seconde fois
  const again = new Game(stub);
  again.state = Object.assign(again.state, { energyCap: 1.0 });
  again.migrate({ baseGridMW: 0, energyCap: 1.0 });
  if (Math.abs(again.state.energyCap - 1.0) > 1e-6) throw new Error('migration appliquée deux fois');
  window.localStorage.removeItem('tokenwar_save_v1');
});

// ---- l'embauche coûte 1000 $ ----
await step('embauche : coût fixe de 1000 $', () => {
  game.state.playSeconds = 0;                     // indice d'inflation = 1
  game.state.money = 2500;
  const before = game.money, head = game.headcount();
  if (Math.abs(game.hireCost() - 1000) > 1e-6) throw new Error('frais d embauche ≠ 1000 $');
  if (!game.hire('ops')) throw new Error('embauche refusée alors que finançable');
  if (Math.abs((before - game.money) - 1000) > 1e-6) throw new Error('frais d embauche non prélevés');
  if (game.headcount() !== head + 1) throw new Error('effectif inchangé');
  game.state.money = 200;                         // plus les moyens
  if (game.canHire('hr')) throw new Error('embauche possible sans trésorerie');
  if (game.hire('ops')) throw new Error('embauche effectuée sans trésorerie');
  ui.render();
  if (!/à l’embauche/.test(ui.rows.team['ops'].cost.innerHTML)) throw new Error('coût d embauche non affiché');
  game.fire('ops');
  game.state.playSeconds = 60;
});

// ---- 30 jours d'arriérés : l'équipe s'en va ----
await step('salaires impayés : départs au bout de 30 jours', () => {
  ui.closeModal();
  game.state.money = 0;
  game.state.employees = { hr:2, rnd:3, marketer:1, ops:1, data:1 };
  game.state.unpaidDays = 0; game.state.quitDebt = 0; game.state._payWarned = false;
  const head0 = game.headcount();
  const perDay = 300 / 365;
  game.tickPayroll(20 * perDay);                  // 20 jours : on prévient, personne ne part
  if (game.headcount() !== head0) throw new Error('départ prématuré avant 30 jours');
  ui.render();
  if (ui.el.chargeArrears.classList.contains('hidden')) throw new Error('arriérés non signalés');
  game.tickPayroll(11 * perDay);                  // 31 jours : premier départ
  if (game.headcount() !== head0 - 1) throw new Error('aucun départ après 30 jours d arriérés');
  game.tickPayroll(6 * perDay);                   // +6 jours → 3 départs de plus (1 tous les 2 j)
  if (game.headcount() > head0 - 4) throw new Error('les départs ne s enchaînent pas');
  // on repaie : l'hémorragie s'arrête
  game.state.money = 1e6;
  game.tickPayroll(perDay);
  const head1 = game.headcount();
  game.tickPayroll(50 * perDay);
  if (game.headcount() !== head1) throw new Error('des départs continuent alors que les salaires sont payés');
  if (game.state.unpaidDays !== 0) throw new Error('compteur d arriérés non remis à zéro');
  game.state.employees = { hr:0, rnd:0, marketer:0, ops:0, data:0 };
});

// ---- sélecteur de langue ----
await step('langue : sélecteur, changement à chaud, repli', async () => {
  const i18n = await import('./js/i18n.js');
  const sel = ui.el.langSelect;
  if (!sel) throw new Error('sélecteur de langue absent');
  if (sel.options.length !== i18n.LANGS.length) throw new Error('toutes les langues ne sont pas proposées');
  const panel = document.querySelector('[data-i18n="Production de tokens"]');
  const before = panel.textContent;
  sel.value = 'en';
  sel.dispatchEvent(new window.Event('change'));
  await new Promise(r => setTimeout(r, 30));
  if (i18n.lang() !== 'en') throw new Error('langue non appliquée');
  if (panel.textContent === before) throw new Error('les textes statiques ne sont pas retraduits');
  if (panel.textContent !== 'Token production') throw new Error('traduction inattendue : ' + panel.textContent);
  // les libellés issus des données suivent aussi
  ui.render(true);
  if (!/Consumer GPU/.test(ui.rows.gpu['consumer'].name.textContent)) throw new Error('les données ne sont pas traduites');
  // retour au français : la source, sans dictionnaire
  sel.value = 'fr';
  sel.dispatchEvent(new window.Event('change'));
  await new Promise(r => setTimeout(r, 30));
  if (panel.textContent !== 'Production de tokens') throw new Error('retour au français échoué');
});

// ---- programmes par étapes : fusion et sphère de Dyson ----
await step('programme fusion : recherche → mise au point → commande → ignition', () => {
  ui.closeModal();
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  const mois = 300 / 12;
  const fusion = g2.progDef('fusion');
  // avant 2026 la recherche ne s'ouvre pas
  g2.state.playSeconds = 300 * 3;                       // 2022
  g2.tickPrograms();
  if (g2.progState('fusion').stage !== 'none') throw new Error('recherche ouverte trop tôt');
  // le réacteur à fusion n'est pas achetable tant que le programme n'a pas abouti
  const reac = ENERGY.find(e => e.id === 'fusion');
  if (!reac.needsProgram) throw new Error('le réacteur devrait dépendre du programme');
  g2.state.playSeconds = 300 * 12;                      // 2031, phase 2
  g2.state.phase = 2;
  if (g2.dateUnlocked(reac)) throw new Error('réacteur achetable sans programme abouti');
  // la recherche démarre seule, puis s'enchaîne
  g2.tickPrograms();
  if (g2.progState('fusion').stage !== 'research') throw new Error('recherche non démarrée');
  if (!g2.programNews('fusion', 'research')) throw new Error('pas de couverture presse de la recherche');
  g2.state.playSeconds += fusion.researchMonths * mois; g2.tickPrograms();
  if (g2.progState('fusion').stage !== 'tuning') throw new Error('mise au point non atteinte');
  g2.state.playSeconds += fusion.tuningMonths * mois; g2.tickPrograms();
  if (g2.progState('fusion').stage !== 'ready') throw new Error('disponibilité non atteinte');
  if (!g2.programNews('fusion', 'ready')) throw new Error('pas de couverture presse de la disponibilité');
  // commande : elle coûte, et elle est refusée sans les moyens
  if (g2.canOrderProgram('fusion')) throw new Error('commande possible sans ressources');
  g2.state.money = 1e12; g2.state.research = 1e9;
  const cap0 = g2.state.energyCap, m0 = g2.money;
  if (!g2.orderProgram('fusion')) throw new Error('commande refusée alors que finançable');
  if (g2.money >= m0) throw new Error('la commande devrait coûter');
  if (!g2.programNews('fusion', 'ordered')) throw new Error('pas de couverture presse de la commande');
  // déploiement puis ignition
  g2.state.playSeconds += fusion.deployMonths * mois; g2.tickPrograms();
  if (g2.progState('fusion').stage !== 'done') throw new Error('programme non achevé');
  if (!(g2.state.energyCap > cap0)) throw new Error('la fusion n a pas apporté d énergie');
  if (!g2.programNews('fusion', 'done')) throw new Error('pas de couverture presse de l ignition');
  if (!g2.dateUnlocked(reac)) throw new Error('le réacteur devrait être achetable après le programme');
});

await step('sphère de Dyson : payée en matière, répétable, effet réel', () => {
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  const mois = 300 / 12;
  const dy = g2.progDef('dyson');
  if (dy.cost.matter == null || dy.cost.money != null) throw new Error('la sphère doit se payer en matière, pas en dollars');
  g2.state.phase = 2; g2.state.earthConsumed = 0.6; g2.state.playSeconds = 300 * 12;
  g2.tickPrograms();
  if (g2.progState('dyson').stage !== 'research') throw new Error('recherche non démarrée en phase 2');
  g2.state.playSeconds += dy.researchMonths * mois; g2.tickPrograms();
  if (g2.progState('dyson').stage !== 'tuning') throw new Error('mise au point non atteinte');
  g2.state.playSeconds += dy.tuningMonths * mois; g2.tickPrograms();
  if (g2.progState('dyson').stage !== 'ready') throw new Error('disponibilité non atteinte');
  // commandable seulement une fois dans l'espace
  g2.state.matter = 1e40;
  if (g2.canOrderProgram('dyson')) throw new Error('sphère commandable avant la phase 3');
  g2.state.phase = 3;
  if (!g2.canOrderProgram('dyson')) throw new Error('sphère non commandable en phase 3');
  const boost0 = g2.dysonBoost();
  const mat0 = g2.matter;
  g2.orderProgram('dyson');
  if (!(g2.matter < mat0)) throw new Error('la matière n a pas été prélevée');
  g2.state.playSeconds += dy.deployMonths * mois; g2.tickPrograms();
  if (g2.dysonCount() !== 1) throw new Error('sphère non achevée');
  if (!(g2.dysonBoost() > boost0)) throw new Error('la sphère n accélère pas la récolte');
  // répétable, et la suivante coûte plus cher
  if (g2.progState('dyson').stage !== 'ready') throw new Error('la sphère devrait être répétable');
  const c1 = g2.progCost(dy).matter;
  if (!(c1 > dy.cost.matter)) throw new Error('la sphère suivante devrait coûter plus cher');
  // …mais le gain est plafonné
  g2.progState('dyson').n = 50;
  if (g2.dysonBoost() > 3.0001) throw new Error('gain non plafonné');
});

// ---- crypto : marché, cycles réels et pression sur le prix des GPU ----
await step('crypto : cycles historiques et pression sur les GPU', () => {
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  const at = y => { g2.state.playSeconds = 300 * (y - 2019); return g2.cryptoEra(); };
  if (!(at(2021).gpu > 1.3)) throw new Error('2021 devrait renchérir fortement les GPU');
  if (!(at(2021).drift > 0)) throw new Error('2021 devrait être haussier');
  if (!(at(2022).drift < 0)) throw new Error('2022 devrait être baissier');
  if (!(at(2023).gpu <= 1.01)) throw new Error('la pression devrait retomber après le krach');
  // la pression se voit vraiment sur le prix d'une carte
  // on isole la pression du minage de l'inflation, qui pousse en sens inverse
  const gpu = GPUS.find(x => x.id === 'rtx3090');
  const reel = () => g2.gpuCost(gpu) / g2.inflIndex();
  at(2023); const calme = reel();
  at(2021); const ruee = reel();
  if (!(ruee > calme * 1.4)) throw new Error('le minage ne renchérit pas les cartes');
  // et en dollars courants la carte reste sensiblement plus chère malgré l'inflation
  at(2023); const nom2023 = g2.gpuCost(gpu);
  at(2021); const nom2021 = g2.gpuCost(gpu);
  if (!(nom2021 > nom2023 * 1.2)) throw new Error('effet invisible en prix affiché');
  // dépôt / retrait
  g2.state.playSeconds = 300 * 5;
  g2.state.money = 1e6; g2.tickCrypto(0.25);
  if (!g2.state.crypto.unlocked) throw new Error('marché non débloqué à 1 M$');
  if (!g2.cryptoDeposit(1e5)) throw new Error('dépôt refusé');
  if (g2.state.crypto.basis !== 1e5) throw new Error('base de calcul incorrecte');
  for (let i = 0; i < 200; i++) g2.tickCrypto(0.25);
  if (!isFinite(g2.state.crypto.invested)) throw new Error('valeur non finie');
  const avant = g2.money;
  g2.cryptoWithdraw();
  if (!(g2.money > avant)) throw new Error('retrait sans effet');
  if (g2.state.crypto.invested !== 0) throw new Error('position non soldée');
});

// ---- chronique datée : climat, banquise, démographie, richesses ----
await step('chronique : articles datés, chiffrés et indexés sur la partie', async () => {
  const { CHRONICLE } = await import('./js/data.js');
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  const titres = () => g2.state.headlines.map(h => h.text);
  // rien avant l'année d'ouverture
  g2.state.playSeconds = 0; g2.tickChronicle();
  if (titres().some(t => /Climat/.test(t))) throw new Error('article climat publié avant 2020');
  // …puis il tombe, avec un chiffre
  g2.state.playSeconds = 300 * 1.2;                       // 2020
  g2.tickChronicle();
  const climat = titres().find(t => /Climat/.test(t));
  if (!climat) throw new Error('article climat non publié en 2020');
  if (!/\d/.test(climat)) throw new Error('article climat sans chiffre');
  // publié UNE seule fois pour l'année
  const n1 = titres().filter(t => /Climat/.test(t)).length;
  g2.tickChronicle(); g2.tickChronicle();
  if (titres().filter(t => /Climat/.test(t)).length !== n1) throw new Error('article répété la même année');
  // l'année suivante, il revient avec un chiffre plus élevé
  g2.state.playSeconds = 300 * 2.2;                       // 2021
  g2.tickChronicle();
  if (titres().filter(t => /Climat/.test(t)).length !== n1 + 1) throw new Error('article annuel non renouvelé');
  // périodicités demandées
  const per = Object.fromEntries(CHRONICLE.map(c => [c.id, [c.every, c.from]]));
  if (per.warming[0] !== 1) throw new Error('le climat doit être annuel');
  if (per.fertility[0] !== 3 || per.fertility[1] !== 2030) throw new Error('fécondité : tous les 3 ans à partir de 2030');
  if (per.wealth[0] !== 4) throw new Error('richesses : tous les 4 ans');
  if (per.extravagance[0] !== 4) throw new Error('extravagances : tous les 4 ans');
  // les chiffres suivent VOTRE partie
  const g3 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  g3.state.playSeconds = 300 * 21;                        // 2040
  const doux = g3.warming();
  g3.state.gpuCounts = { wafer: 5000 }; g3.state.phase = 2; g3.state.earthConsumed = 0.4;
  if (!(g3.warming() > doux + 0.5)) throw new Error('le réchauffement ignore l exploitation du joueur');
  if (!(g3.iceLoss() > 0.5)) throw new Error('la banquise ignore le réchauffement');
  if (!(g3.speciesLost() > 0.8)) throw new Error('les espèces ignorent la conversion de la Terre');
});

// ---- rachat de dette souveraine ----
await step('tutelle : offre à 4 000 milliards, 100 datacenters', () => {
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  g2.state.playSeconds = 0;
  g2.state.money = 3e12;
  if (g2.sovereignAvailable()) throw new Error('offre visible en dessous de 4 000 milliards');
  g2.state.money = 5e12;
  if (!g2.sovereignAvailable()) throw new Error('offre absente au-delà de 4 000 milliards');
  if (!g2.sovereignNews('offer')) throw new Error('pas de couverture presse de l offre');
  const dc0 = g2.infraCount('datacenter'), re0 = g2.infraCount('realestate'), rep0 = g2.reputation;
  const m0 = g2.money;
  if (!g2.buySovereign()) throw new Error('rachat refusé alors que finançable');
  if (!(g2.money < m0 - 1.9e12)) throw new Error('le rachat devrait coûter 2 000 milliards');
  if (g2.infraCount('datacenter') !== dc0 + 100) throw new Error('les 100 datacenters ne sont pas construits');
  if (g2.infraCount('realestate') <= re0) throw new Error('pas d immobilier pour les accueillir');
  if (!(g2.reputation < rep0)) throw new Error('aucun coût de réputation');
  if (!g2.sovereignNews('signed')) throw new Error('pas de couverture presse du rachat');
  // le feuilleton se déroule ensuite
  g2.state.playSeconds += 3 * (300 / 12);
  if (!g2.sovereignNews('build')) throw new Error('pas d article sur la construction');
  g2.state.playSeconds += 6 * (300 / 12);
  if (!g2.sovereignNews('protest')) throw new Error('pas d article sur les manifestations');
  // et l offre ne revient pas
  if (g2.sovereignAvailable()) throw new Error('offre encore disponible après rachat');
});

// ---- carte de l'univers (phase 3) ----
await step('carte de l univers : disposition stable, bleuissement progressif', () => {
  ui.buildUniverse();
  const a = ui.universe.map(g => g.x + ',' + g.y).join('|');
  ui.buildUniverse();
  const b = ui.universe.map(g => g.x + ',' + g.y).join('|');
  if (a !== b) throw new Error('la carte doit être déterministe d une construction à l autre');
  if (ui.universe.length < 100) throw new Error('carte trop pauvre');
  // l ordre de conversion va du centre vers le bord
  const centre = ui.universe[0], bord = ui.universe[ui.universe.length - 1];
  if (!(centre.order < bord.order)) throw new Error('la conversion devrait partir du centre');
  if (!ui.el.universeMap) throw new Error('canvas de la carte absent');
  game.state.universeConsumed = 0.5;
  ui.renderUniverse();                                    // sans contexte 2D en jsdom : ne doit pas jeter
  if (ui.el.universePct && !/%/.test(ui.el.universePct.textContent)) throw new Error('pourcentage non affiché');
});

// ---- modales bornées et défilantes ----
await step('aide : modale bornée à l écran et défilante', () => {
  const scroll = document.querySelector('#help-overlay .modal-scroll');
  if (!scroll) throw new Error('conteneur défilant de l aide absent');
  if (!scroll.querySelector('#help-body') || !scroll.querySelector('#achievements-body'))
    throw new Error('le texte et les succès doivent partager la zone défilante');
});

// ---- graphes de marché : l'indice tracé est celui qui bouge le portefeuille ----
await step('bourse : indice, historique et niveau d entrée cohérents', () => {
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  const st = g2.state.stock;
  if (st.index == null) throw new Error('la Bourse doit avoir un indice');
  // l indice vit MÊME sans position (sinon le graphe serait vide avant d investir)
  for (let i = 0; i < 60; i++) g2.tick(0.25);
  if (st.hist.length < 5) throw new Error('aucun historique sans position');
  if (st.index === 1) throw new Error('l indice ne bouge pas');
  // un seul tirage anime l indice ET la position : les rapports doivent coïncider
  g2.state.stockUnlocked = true; g2.state.money = 1e6;
  g2.stockDeposit(1000);
  const i0 = st.index, v0 = st.invested;
  for (let i = 0; i < 120; i++) g2.tick(0.25);
  const ri = st.index / i0, rv = st.invested / v0;
  if (Math.abs(ri - rv) > 1e-9) throw new Error('la courbe ne suit pas le portefeuille : ' + ri + ' vs ' + rv);
  // le niveau d entrée se déduit des valeurs calculées, sans état supplémentaire
  const lvl = ui.entryLevel(st);
  if (lvl == null) throw new Error('niveau d entrée introuvable');
  if (Math.abs(lvl - i0) > i0 * 1e-9) throw new Error('niveau d entrée incohérent : ' + lvl + ' vs ' + i0);
  // la plus-value affichée correspond au rapport à ce niveau
  const gain = st.invested / st.basis - 1, vsEntry = st.index / lvl - 1;
  if (Math.abs(gain - vsEntry) > 1e-9) throw new Error('plus-value et graphe divergent');
  // l historique reste borné
  for (let i = 0; i < 900; i++) g2.tick(0.25);
  if (st.hist.length > 160) throw new Error('historique non borné : ' + st.hist.length);
});

await step('crypto : même graphe, cours indépendant de la position', () => {
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  const c = g2.state.crypto;
  for (let i = 0; i < 60; i++) g2.tick(0.25);
  if (c.hist.length < 5) throw new Error('pas d historique du cours');
  if (c.invested !== 0) throw new Error('position ouverte sans dépôt');
  g2.state.money = 1e6; g2.tickCrypto(0.25);
  g2.cryptoDeposit(1000);
  const p0 = c.price, v0 = c.invested;
  for (let i = 0; i < 120; i++) g2.tick(0.25);
  if (Math.abs(c.price / p0 - c.invested / v0) > 1e-9) throw new Error('le cours ne suit pas la position');
  if (Math.abs(ui.entryLevel(c) - p0) > p0 * 1e-9) throw new Error('niveau d entrée incohérent');
});

await step('graphe : rendu sans contexte 2D et sans données', () => {
  // jsdom n a pas de canvas : le rendu doit rester silencieux, pas jeter
  ui.drawMarket(ui.el.stockChart, [], null, '#fff');
  ui.drawMarket(ui.el.stockChart, [1, 2, 3], 1.5, '#fff');
  ui.drawMarket(null, [1, 2], null, '#fff');
  ui.renderMarketLegend(ui.el.stockEntry, { invested: 0, basis: 0 }, null);
  if (!ui.el.stockEntry.classList.contains('hidden')) throw new Error('le niveau d entrée doit disparaître sans position');
});

// ---- automatisations : déblocage, familles, animation ----
await step('automatisation : carte cachée avant 50 gestes manuels', () => {
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  if (g2.autoUnlocked('click')) throw new Error('automatisation proposée sans aucun geste');
  for (let i = 0; i < 49; i++) g2.countClick('click');
  if (g2.autoUnlocked('click')) throw new Error('proposée dès 49 gestes');
  g2.countClick('click');
  if (!g2.autoUnlocked('click')) throw new Error('toujours pas proposée à 50 gestes');
  // chaque famille compte séparément
  if (g2.autoUnlocked('gpu')) throw new Error('les familles ne doivent pas partager le compteur');
  // et l interface le reflète
  const ui2 = ui;
  game.state.clicks = { click:0, gpu:0, hardware:0, housing:0, energy:0 };
  game.state.auto.click.owned = false;
  ui2.render();
  if (!ui2.rows.auto['click'].el.classList.contains('hidden')) throw new Error('carte visible sans les 50 gestes');
  game.countClick('click', 50);
  ui2.render();
  if (ui2.rows.auto['click'].el.classList.contains('hidden')) throw new Error('carte toujours cachée après 50 gestes');
});

await step('automatisation : matériel et immobilier sont distincts', async () => {
  const { AUTOMATIONS, INFRA } = await import('./js/data.js');
  const ids = AUTOMATIONS.map(a => a.id);
  if (!ids.includes('hardware') || !ids.includes('housing')) throw new Error('les deux familles doivent exister');
  if (ids.includes('infra')) throw new Error('l ancienne automatisation unique devrait avoir disparu');
  const fam = Object.fromEntries(INFRA.map(i => [i.id, i.family]));
  if (fam.rack !== 'hardware' || fam.server !== 'hardware') throw new Error('baie et serveur = matériel');
  if (fam.realestate !== 'housing' || fam.datacenter !== 'housing') throw new Error('bâtiment et datacenter = immobilier');
  // l une peut être active sans l autre
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  g2.state.money = 1e9;
  g2.state.auto.hardware.owned = true; g2.state.auto.housing.owned = false;
  g2.state.autoItems.hardware.server = true; g2.state.autoItems.housing.realestate = true;
  g2.state.infraCounts = { realestate:1, datacenter:1, rack:1, server:1 };
  g2.state.gpuCounts = { consumer: 8 };
  for (let i = 0; i < 200; i++) g2.tick(0.25);
  if (g2.infraCount('server') < 2) throw new Error('le matériel n a pas été racheté');
  if (g2.infraCount('realestate') !== 1) throw new Error('l immobilier a été acheté alors qu il est désactivé');
});

await step('automatisation : l immobilier ne s achète plus pour rien', () => {
  // l ancien seuil absolu (4 places libres) rachetait un bâtiment en permanence,
  // puisqu un bâtiment n accueille que 4 datacenters
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  g2.state.money = 1e9;
  g2.state.auto.housing.owned = true;
  g2.state.autoItems.housing.realestate = true; g2.state.autoItems.housing.datacenter = true;
  g2.state.infraCounts = { realestate:1, datacenter:1, rack:1, server:1 };
  for (let i = 0; i < 400; i++) g2.tick(0.25);
  if (g2.infraCount('realestate') !== 1) throw new Error('bâtiment racheté sans nécessité : ' + g2.infraCount('realestate'));
  // …mais il s achète bien quand la place manque vraiment
  g2.state.infraCounts.datacenter = 4;                    // bâtiment plein
  for (let i = 0; i < 400; i++) g2.tick(0.25);
  if (g2.infraCount('realestate') < 2) throw new Error('bâtiment non racheté alors que la place manque');
});

await step('automatisation : animation déclenchée à chaque action', () => {
  let vus = [];
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false,
    onAutoFire(fam, id) { vus.push(fam + (id ? ':' + id : '')); } });
  g2.state.auto.click.owned = true;
  for (let i = 0; i < 12; i++) g2.tick(0.25);
  if (!vus.some(v => v === 'click')) throw new Error('aucune notification d auto-inférence');
  // et l interface pose bien la classe d animation
  ui.onAutoFire('click');
  if (!ui.rows.auto['click'].el.classList.contains('fired')) throw new Error('pas d animation sur la carte');
});

// ---- risques liés à l effectif ----
await step('sous-effectif SRE : 20% de risque annuel après l IPO', () => {
  const mk = ops => {
    const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
    g2.state.fundingDone.ipo = true;
    g2.state.employees = { hr:2, rnd:10, marketer:5, ops, data:3 };
    g2.state.playSeconds = 300 * 3;
    return g2;
  };
  // avant l IPO : aucun risque
  const avant = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  avant.state.employees = { hr:2, rnd:10, marketer:5, ops:0, data:3 };
  avant.state.playSeconds = 300 * 3;
  const v = avant.state.mods.valuationMult;
  for (let i = 0; i < 50; i++) { avant.state.opsCheckYear = 0; avant.tickOpsRisk(); }
  if (avant.state.mods.valuationMult !== v) throw new Error('risque appliqué avant l IPO');
  // sous-effectif : environ 20% des années
  let touches = 0;
  for (let k = 0; k < 300; k++) { const g2 = mk(0); const v0 = g2.state.mods.valuationMult; g2.tickOpsRisk();
    if (g2.state.mods.valuationMult < v0) touches++; }
  const taux = touches / 300;
  if (taux < 0.12 || taux > 0.30) throw new Error('taux hors cible : ' + (taux * 100).toFixed(0) + '%');
  // effectif suffisant : jamais
  for (let k = 0; k < 100; k++) { const g2 = mk(5); const v0 = g2.state.mods.valuationMult; g2.tickOpsRisk();
    if (g2.state.mods.valuationMult < v0) throw new Error('incident malgré assez de SRE'); }
  // la perte est bien de 15% et un article est publié
  const g3 = mk(0);
  g3.state.mods.valuationMult = 1;
  let n = 0;
  while (g3.state.mods.valuationMult === 1 && n++ < 200) { g3.state.opsCheckYear = 0; g3.tickOpsRisk(); }
  if (Math.abs(g3.state.mods.valuationMult - 0.85) > 1e-9) throw new Error('la perte devrait être de 15%');
  if (!g3.state.headlines.length) throw new Error('aucun article publié');
});

await step('sous-effectif data : 5% d échec à l entraînement', async () => {
  const { TRAINING_FAILURES } = await import('./js/data.js');
  if (TRAINING_FAILURES.length !== 10) throw new Error('il faut dix articles d échec');
  const essai = (dataEng, rnd) => {
    let echecs = 0;
    for (let k = 0; k < 1500; k++) {
      const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
      g2.state.playSeconds = 300 * 3; g2.state.modelTier = 1;
      g2.state.employees = { hr:5, rnd, marketer:0, ops:0, data:dataEng };
      g2.state.money = 1e9; g2.state.data = 1e9; g2.state.research = 1e9;
      g2.state.gpuCounts = { consumer: 1000 };
      if (!g2.trainNext() && g2.state.modelTier === 1) echecs++;
    }
    return echecs / 1500;
  };
  const sous = essai(0, 10);
  if (sous < 0.02 || sous > 0.09) throw new Error('taux d échec hors cible : ' + (sous * 100).toFixed(1) + '%');
  if (essai(8, 4) !== 0) throw new Error('échec malgré assez de data engineers');
});

// ---- percées : une seule à la fois, deux mois d écart ----
await step('percées : une seule proposée, intégrée, deux mois entre chacune', async () => {
  const { PROJECT_GAP_MONTHS } = await import('./js/data.js');
  if (PROJECT_GAP_MONTHS !== 2) throw new Error('le délai devrait être de deux mois');
  const g2 = new Game({ toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){}, showEvent(){}, modalOpen:false });
  g2.state.money = 1e12; g2.state.research = 1e12; g2.state.data = 1e12;
  g2.state.lifetimeTokens = 1e9; g2.state.modelTier = 8; g2.state.gpuCounts = { consumer: 1e6 };
  const premiere = g2.nextProject();
  if (!premiere) throw new Error('aucune percée proposée');
  // les autres sont refusées, même finançables
  const autre = (await import('./js/data.js')).PROJECTS.find(p => p.id !== premiere.id && p.req(g2));
  if (autre && g2.buyProject(autre.id)) throw new Error('une percée non proposée a été acquise');
  if (!g2.buyProject(premiere.id)) throw new Error('la percée proposée est refusée');
  // payée, mais pas acquise : elle reste affichée le temps de s'intégrer
  const { INTEGRATION_WEEKS } = await import('./js/data.js');
  if (g2.state.projectsDone[premiere.id]) throw new Error('percée acquise avant la fin de l intégration');
  if (g2.integrationProgress('project') == null) throw new Error('aucune intégration en cours');
  const encore = g2.nextProject();
  if (!encore || encore.id !== premiere.id) throw new Error('la percée en intégration devrait rester affichée');
  if (g2.buyProject(premiere.id)) throw new Error('la percée a pu être payée deux fois');
  g2.state.playSeconds += INTEGRATION_WEEKS[1] * (300 / 52); g2.tickIntegrations();
  if (!g2.state.projectsDone[premiere.id]) throw new Error('intégration jamais terminée');
  // …puis plus rien pendant deux mois
  if (g2.nextProject()) throw new Error('une percée apparaît immédiatement après');
  g2.state.playSeconds += 1.9 * (300 / 12);
  if (g2.nextProject()) throw new Error('une percée apparaît avant les deux mois');
  g2.state.playSeconds += 0.2 * (300 / 12);
  const suivante = g2.nextProject();
  if (!suivante) throw new Error('aucune percée après les deux mois');
  if (suivante.id === premiere.id) throw new Error('la même percée est reproposée');
  // l interface n en affiche qu une
  game.state.projectsDone = {}; game.state.lastProjectAt = -1e9;
  ui.render();
  const visibles = Object.values(ui.rows.project).filter(r => !r.el.classList.contains('hidden'));
  if (visibles.length > 1) throw new Error(visibles.length + ' percées affichées au lieu d une');
});

// ---- remise à zéro des graphes ----
await step('nouvelle partie : les graphes repartent de zéro', () => {
  game.state.stock.hist = [1, 2, 3]; game.state.crypto.hist = [1, 2];
  // valeurs volontairement reconnaissables : aucune ne doit survivre
  ui.sparkData = [{ tok: 4242, cash: 4242 }, { tok: 4243, cash: 4243 }];
  ui.buildUniverse();
  const carteAvant = ui.universe;
  game.restartFresh();
  ui.fullRebuild();
  if (ui.sparkData.some(d => d.tok >= 4242)) throw new Error('la courbe de production garde ses anciens points');
  if (ui.sparkData.length > 1) throw new Error('la courbe devrait repartir du seul échantillon courant');
  if (ui.universe === carteAvant) throw new Error('la carte de l univers n est pas reconstruite');
  if (game.state.stock.hist.length !== 0) throw new Error('l historique boursier survit');
  if (game.state.crypto.hist.length !== 0) throw new Error('l historique crypto survit');
});

// toast + log
await step('toast & log', () => { ui.toast('hello','good'); ui.log('test log','milestone'); });

// passage phase 2
await step('enterPhase 2 + alloc UI', () => {
  game.state.modelTier = 7;
  game.enterPhase(2);
  if (ui.el.panelAlloc.classList.contains('hidden')) throw new Error('panel alloc non affiché');
  ui.render();
});
await step('ticks phase 2', () => { game.state.alloc={serve:0.3,research:0.1,improve:0.2,harvest:0.4}; for(let i=0;i<40;i++){ game.tick(0.25); if(i%10===0) ui.render(); } });
await step('phase 2 : marqueurs argent masqués', () => {
  ui.render();
  if (!ui.el.moneyStat.classList.contains('hidden')) throw new Error('stat argent encore visible en phase 2');
  if (!ui.el.panelMarket.classList.contains('hidden')) throw new Error('panneau marché encore visible en phase 2');
  if (!ui.el.panelCharges.classList.contains('hidden')) throw new Error('panneau charges encore visible en phase 2');
});
await step('slider alloc', () => { const k=Object.keys(ui.allocInputs)[0]; ui.allocInputs[k].input.value=60; ui.allocInputs[k].input.dispatchEvent(new window.Event('input')); ui.render(); });

// passage phase 3 + cosmos
await step('enterPhase 3 + cosmos UI', () => {
  game.state.earthConsumed = 1;
  game.enterPhase(3);
  if (ui.el.panelCosmos.classList.contains('hidden')) throw new Error('panel cosmos non affiché');
  ui.render();
});
await step('ticks phase 3 + upgrade sonde', () => { game.state.matter=1e30; for(let i=0;i<20;i++){ game.tick(0.25); } game.upgradeProbe('harvest'); ui.render(); });

// fin
await step('triggerEnding + showEnding', () => {
  game.state.universeConsumed = 1; game.state.lifetimeTokens = 1e62;
  game.triggerEnding();
  if (ui.el.endingScreen.classList.contains('hidden')) throw new Error('écran de fin non affiché');
});
await step('écran final : Play again → « Get a life ;-) » → fermeture tentée', () => {
  let closeTried = false;
  const origClose = window.close;
  window.close = () => { closeTried = true; };
  ui.renderEndingStats();
  if (ui.el.endingRestart.textContent !== 'Play again') throw new Error('libellé initial incorrect');
  ui.el.endingRestart.dispatchEvent(new window.Event('click'));
  if (ui.el.endingRestart.textContent !== 'Get a life ;-)') throw new Error('transformation du bouton absente');
  ui.el.endingRestart.dispatchEvent(new window.Event('click'));   // second clic → tente de fermer
  if (!closeTried) throw new Error('window.close() non tenté par « Get a life ;-) »');
  closeTried = false;
  ui.renderEndingStats();
  ui.el.endingGetalife.dispatchEvent(new window.Event('click'));  // bouton « Get a life »
  if (!closeTried) throw new Error('window.close() non tenté par « Get a life »');
  window.close = origClose;
});
// bouton fuyant + porte de sortie NG+
await step('Play again fuit la souris, NG+ reste accessible', () => {
  ui.renderEndingStats();
  const btn = ui.el.endingRestart;
  const before = btn.style.transform;
  // jsdom renvoie un rect nul : le curseur est donc « tout proche » du centre
  document.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 5, clientY: 5 }));
  if (btn.style.transform === before) throw new Error('le bouton ne se dérobe pas');
  ui.el.endingNgplus.classList.remove('hidden');
  ui.el.endingNgplus.dispatchEvent(new window.Event('click'));
  if (game.state.ended) throw new Error('NG+ non relancé par la porte de sortie');
  ui.render(true);
});
// la capture de fin doit refléter l'ÉTAT DU JEU (vrai texte, overlays exclus)
await step('capture de fin fidèle à l écran de jeu', () => {
  // faux contexte 2D : on enregistre les textes peints et les rectangles de fond
  const painted = [];
  const fakeCtx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'fillText') return (txt) => painted.push(String(txt));
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k === 'getImageData') return () => ({ data: [0, 0, 0, 0] });
      return () => {};
    },
    set: () => true,
  });
  const origCreate = document.createElement.bind(document);
  document.createElement = tag => {
    const el = origCreate(tag);
    if (tag === 'canvas') el.getContext = () => fakeCtx;
    return el;
  };
  // jsdom ne fait pas de mise en page : on simule des rectangles plausibles
  const origElRect = window.Element.prototype.getBoundingClientRect;
  const origRangeRects = window.Range.prototype.getClientRects;
  window.Element.prototype.getBoundingClientRect = () => ({ left:10, top:10, right:210, bottom:50, width:200, height:40 });
  window.Range.prototype.getClientRects = () => [{ left:10, top:10, right:210, bottom:30, width:200, height:20 }];
  // un marqueur unique dans le jeu + un marqueur dans un overlay qui doit être ignoré
  const brand = document.querySelector('.brand-name');
  brand.textContent = 'MARQUEUR_JEU_42';
  ui.el.endingTitle.textContent = 'MARQUEUR_OVERLAY';
  ui.el.endingScreen.classList.remove('hidden');
  const cine = Object.create(Cinematic.prototype);
  cine.SKIP = /\b(cine|ending-screen|modal-overlay|toast-container|hidden)\b/;
  let snap, err = null;
  try { snap = cine.paintDOM(); } catch (e) { err = e; }
  document.createElement = origCreate;
  window.Element.prototype.getBoundingClientRect = origElRect;
  window.Range.prototype.getClientRects = origRangeRects;
  ui.el.endingScreen.classList.add('hidden');
  if (err) throw err;
  if (!snap) throw new Error('capture nulle');
  if (!painted.includes('MARQUEUR_JEU_42')) throw new Error('le vrai texte du jeu n est pas peint');
  if (painted.includes('MARQUEUR_OVERLAY')) throw new Error('un overlay a été photographié (écran final)');
});

// raccourci Ctrl+Shift+E → cinématique de fin
await step('Ctrl+Shift+E lance la fin', () => {
  ui.el.endingScreen.classList.add('hidden');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'E', ctrlKey: true, shiftKey: true }));
  // sans canvas 2D (jsdom), showEnding() bascule directement sur l'écran final
  if (ui.el.endingScreen.classList.contains('hidden') && ui.el.cine.classList.contains('hidden'))
    throw new Error('Ctrl+Shift+E n a pas déclenché la fin');
  ui.el.endingScreen.classList.add('hidden');
});

// ---- revente groupée : ×10 au-delà de 10, tout au-delà de 100 ----
await step('revente : à l unité, ×10, puis en totalité', () => {
  const g0 = GPUS[0];
  game.state.playSeconds = 0;                        // inflation neutre
  game.state.gpuCounts = { [g0.id]: 250 };
  game.state.money = 0;
  const prix = g0.cost * 0.45;
  // à l'unité
  game.sellGPU(g0.id);
  if (game.state.gpuCounts[g0.id] !== 249) throw new Error('revente à l unité : ' + game.state.gpuCounts[g0.id]);
  if (Math.abs(game.state.money - prix) > 1e-6) throw new Error('remboursement unitaire faux');
  // par dix : dix fois le remboursement, dix cartes en moins
  game.state.money = 0;
  game.sellGPU(g0.id, false, 10);
  if (game.state.gpuCounts[g0.id] !== 239) throw new Error('revente ×10 : ' + game.state.gpuCounts[g0.id]);
  if (Math.abs(game.state.money - prix * 10) > 1e-6) throw new Error('remboursement ×10 faux');
  // tout : le parc tombe à zéro et la ligne disparaît de l'état
  game.state.money = 0;
  game.sellGPU(g0.id, false, Infinity);
  if (game.state.gpuCounts[g0.id]) throw new Error('« tout revendre » a laissé des cartes');
  if (Math.abs(game.state.money - prix * 239) > 1e-6) throw new Error('remboursement total faux : ' + game.state.money);
  // on ne vend jamais plus que ce qu'on possède
  game.state.gpuCounts = { [g0.id]: 3 }; game.state.money = 0;
  game.sellGPU(g0.id, false, 100);
  if (game.state.gpuCounts[g0.id]) throw new Error('reliquat après vente totale');
  if (Math.abs(game.state.money - prix * 3) > 1e-6) throw new Error('surfacturation : vendu plus que possédé');
  if (game.sellGPU(g0.id, false, 10)) throw new Error('vente acceptée sur un parc vide');
});

await step('revente : les boutons ×10 et « tout » suivent les seuils', () => {
  const g0 = GPUS[0];
  const r = ui.rows.gpu[g0.id];
  if (!r.sell10 || !r.sellAll) throw new Error('boutons de revente groupée absents');
  const vis = b => !b.classList.contains('hidden');
  game.state.gpuCounts = { [g0.id]: 5 }; ui.render();
  if (!vis(r.sell) || vis(r.sell10) || vis(r.sellAll)) throw new Error('à 5 cartes, seule la revente à l unité doit s afficher');
  game.state.gpuCounts = { [g0.id]: 11 }; ui.render();
  if (!vis(r.sell10) || vis(r.sellAll)) throw new Error('à 11 cartes, ×10 doit apparaître et « tout » rester caché');
  game.state.gpuCounts = { [g0.id]: 101 }; ui.render();
  if (!vis(r.sellAll)) throw new Error('à 101 cartes, « tout revendre » doit apparaître');
  game.state.gpuCounts = {}; ui.render();
  if (vis(r.sell) || vis(r.sell10) || vis(r.sellAll)) throw new Error('parc vide : aucun bouton de revente ne doit rester');
});

// ---- livraison : une place perdue entre la commande et la réception ----
await step('livraison refusée si l emplacement a disparu, commande remboursée', () => {
  game.state.phase = 1;
  game.state.playSeconds = 0;
  game.state.gpuCounts = {}; game.state.builds = []; game.state.buildSeq = 0;
  game.state.infraCounts = { realestate:1, datacenter:1, rack:1, server:1 };
  const g0 = GPUS[0];
  game.state.money = game.gpuCost(g0) * 4;
  const avant = game.state.money;
  if (!game.buyGPU(g0.id)) throw new Error('achat refusé alors qu un serveur est libre');
  const paye = avant - game.state.money;
  if (!(paye > 0)) throw new Error('rien n a été facturé');
  // le serveur disparaît pendant le chantier : la carte n a plus où aller
  game.state.infraCounts.server = 0;
  const b = game.state.builds[0];
  game.state.playSeconds = b.t1 + 1;
  game.tickBuilds();
  if (game.gpuCount() > 0) throw new Error('la carte a été livrée sans emplacement');
  if (game.state.builds.length) throw new Error('le chantier n a pas été soldé');
  if (Math.abs(game.state.money - avant) > 1e-6) throw new Error('commande non remboursée : ' + game.state.money + ' au lieu de ' + avant);
  // avec le serveur, la même livraison aboutit
  game.state.infraCounts.server = 1;
  game.buyGPU(g0.id);
  game.state.playSeconds = game.state.builds[0].t1 + 1;
  game.tickBuilds();
  if (game.gpuCount() !== 1) throw new Error('livraison normale cassée');
  // et le parc ne dépasse jamais la capacité d hébergement
  if (game.gpuCount() > game.capacityFor('gpu')) throw new Error('parc au-dessus de la capacité');
});

// ---- cadence des automatisations, découplée du bouton ⏩ ----
await step('cadence auto : ×1 ×1,5 ×2 ×3 pour ×1 ×2 ×5 ×10', () => {
  const attendu = { 1:1, 2:1.5, 5:2, 10:3 };
  for (const [sp, rate] of Object.entries(attendu)) {
    game.speed = +sp;
    // le facteur ramène le temps vu par les automatisations au rythme voulu :
    // la boucle en fournit déjà `speed` fois plus.
    const eff = game.autoTimeFactor() * +sp;
    if (Math.abs(eff - rate) > 1e-9) throw new Error(`×${sp} : cadence ${eff} au lieu de ${rate}`);
  }
  // strictement croissante, mais toujours en retrait de la vitesse de jeu
  let prev = 0;
  for (const sp of [1, 2, 5, 10]) {
    game.speed = sp;
    const eff = game.autoTimeFactor() * sp;
    if (eff <= prev && sp > 1) throw new Error('la cadence doit croître avec la vitesse');
    if (sp > 1 && eff >= sp) throw new Error(`×${sp} : la cadence (${eff}) devrait rester sous la vitesse`);
    prev = eff;
  }
  game.speed = 1;
});

await step('cadence auto : comptée sur une seconde réelle', () => {
  game.state.phase = 1;
  game.state.auto.click = { owned:true, on:true };
  // Une SECONDE RÉELLE de jeu : la boucle fournit dt × vitesse de temps simulé.
  // C'est là que le découplage se voit — sinon on compare des durées différentes.
  const parSeconde = sp => {
    game.speed = sp; game.state.autoTimer = 0;
    let n = 0; const vrai = game.manualGenerate.bind(game);
    game.manualGenerate = (...a) => { n++; return vrai(...a); };
    for (let i = 0; i < 40; i++) game.tickAuto(0.25 * sp);   // 10 s réelles
    game.manualGenerate = vrai; return n / 10;               // par seconde réelle
  };
  const r1 = parSeconde(1), r2 = parSeconde(2), r5 = parSeconde(5), r10 = parSeconde(10);
  game.speed = 1;
  const attendu = { 1:1, 2:1.5, 5:2, 10:3 };
  for (const [sp, obtenu] of [[1,r1],[2,r2],[5,r5],[10,r10]]) {
    if (Math.abs(obtenu - attendu[sp]) > 0.15)
      throw new Error(`×${sp} : ${obtenu} inférence(s)/s au lieu de ${attendu[sp]}`);
  }
  // accélérer aide, mais bien moins que le temps : ×10 donne 3 fois plus, pas 10
  if (!(r10 > r1)) throw new Error('accélérer devrait tout de même aider');
  if (r10 >= r1 * 10) throw new Error(`cadence non découplée : ${r1} → ${r10}`);
});

// ---- raccourcis clavier : vitesse, gel, achats ----
const touche = (k, opts = {}) => {
  const ev = new dom.window.KeyboardEvent('keydown', {
    key: k, code: k === ' ' ? 'Space' : 'Key' + k.toUpperCase(),
    bubbles: true, cancelable: true, ...opts,
  });
  (opts.target || dom.window.document.body).dispatchEvent(ev);
  return ev;
};

await step('espace : passe à la vitesse suivante, en boucle', () => {
  ui.setSpeed(1);
  const vu = [];
  for (let i = 0; i < 5; i++) { touche(' '); vu.push(dom.window.__speed); }
  if (vu.join(',') !== '2,5,10,1,2') throw new Error('cycle des vitesses : ' + vu.join(','));
  // le moteur voit la même vitesse que l'interface
  if (game.speed !== dom.window.__speed) throw new Error('moteur et interface désaccordés');
  ui.setSpeed(1);
});

await step('F : gèle, puis rend la vitesse d avant', () => {
  ui.setSpeed(5);
  touche('f');
  if (dom.window.__speed !== 0) throw new Error('F n a pas gelé (' + dom.window.__speed + ')');
  if (game.speed !== 0) throw new Error('le moteur ignore le gel');
  if (!ui.frozen()) throw new Error('état gelé non signalé');
  if (!dom.window.document.body.classList.contains('is-frozen')) throw new Error('marque visuelle du gel absente');
  // gelé, la simulation n avance plus : autoTimeFactor tombe à zéro
  if (game.autoTimeFactor() !== 0) throw new Error('les automatisations tournent encore une fois gelé');
  touche('f');
  if (dom.window.__speed !== 5) throw new Error('le dégel doit rendre ×5, pas ' + dom.window.__speed);
  if (dom.window.document.body.classList.contains('is-frozen')) throw new Error('marque du gel non retirée');
  // depuis le gel, l espace dégèle aussi plutôt que de poursuivre le cycle
  ui.setSpeed(10); touche('f');
  touche(' ');
  if (dom.window.__speed !== 10) throw new Error('espace depuis le gel doit rendre ×10, pas ' + dom.window.__speed);
  ui.setSpeed(1);
});

await step('raccourcis ignorés dans un champ de saisie et sous Ctrl', () => {
  ui.setSpeed(2);
  const input = dom.window.document.createElement('input');
  dom.window.document.body.appendChild(input);
  touche(' ', { target: input });
  if (dom.window.__speed !== 2) throw new Error('la barre d espace a été volée à un champ de saisie');
  touche('f', { target: input });
  if (dom.window.__speed !== 2) throw new Error('F a été volé à un champ de saisie');
  input.remove();
  touche(' ', { ctrlKey: true });
  if (dom.window.__speed !== 2) throw new Error('Ctrl+Espace ne doit pas changer la vitesse');
  ui.setSpeed(1);
});

await step('G H B M : achètent réellement', () => {
  game.state.phase = 1;
  game.state.playSeconds = 3 * 300;                  // 2022 : des cartes existent
  game.state.money = 1e9;
  game.state.infraCounts = { realestate:1, datacenter:1, rack:1, server:1 };
  game.state.gpuCounts = {}; game.state.builds = []; game.state.energyCap = 1e6;
  // G : commande une carte (elle part en chantier, donc on compte les chantiers)
  const av = game.state.builds.length;
  touche('g');
  if (game.state.builds.length <= av && game.gpuCount() === 0) throw new Error('G n a rien commandé');
  // et c est la meilleure abordable, pas la première venue
  const dispo = GPUS.filter(x => game.dateUnlocked(x) && !game.discontinued(x));
  const best = dispo.sort((a, b) => b.perf - a.perf)[0];
  const cmd = game.state.builds[game.state.builds.length - 1];
  if (cmd && cmd.f === 'gpu' && cmd.id !== best.id) throw new Error('G a pris ' + cmd.id + ' au lieu de ' + best.id);
  // H : complète l hébergement
  const infraAv = game.state.builds.filter(b => b.f === 'infra').length;
  touche('h');
  if (game.state.builds.filter(b => b.f === 'infra').length <= infraAv) throw new Error('H n a rien commandé');
  // M : un cran de marketing
  const mkAv = game.state.marketingLvl;
  touche('m');
  if (game.state.marketingLvl <= mkAv) throw new Error('M n a pas renforcé le marketing');
  // B : la percée proposée, s il y en a une. Depuis que les avancées s'intègrent
  // en 1 à 4 semaines, l'achat ne la marque pas faite : il la met en intégration.
  game.state.research = 1e9;
  const p = game.nextProject();
  touche('b');
  if (p) {
    const inte = game.integrationOf('project');
    if (!inte && !game.state.projectsDone[p.id]) throw new Error('B n a pas lancé la percée proposée');
    if (inte && inte.id !== p.id) throw new Error('B a lancé ' + inte.id + ' au lieu de ' + p.id);
  }
});

await step('raccourcis d achat inertes pendant une décision', () => {
  const ev = { id:'ev_short', title:'T', body:'B', phase:1, choices:[{ label:'a', desc:'d', apply(){} }] };
  ui.showEvent(ev);
  const mkAv = game.state.marketingLvl;
  touche('m');
  if (game.state.marketingLvl !== mkAv) throw new Error('M a acheté alors qu une décision est en attente');
  // la vitesse, elle, reste réglable : on peut vouloir geler pour réfléchir
  ui.setSpeed(1); touche('f');
  if (dom.window.__speed !== 0) throw new Error('impossible de geler pendant une modale');
  touche('f');
  ui.closeModal();
});

// ---- infobulles : le chiffre exact derrière l abrégé ----
await step('en-tête : infobulle avec tous les chiffres', () => {
  game.state.lifetimeTokens = 1234567890;
  game.state.money = 9876543;
  ui.render();
  const tok = ui.el.statTokens.title, mon = ui.el.statMoney.title;
  const chiffres = x => (x || '').replace(/[^0-9]/g, '');
  if (chiffres(tok) !== '1234567890') throw new Error('infobulle tokens : ' + tok);
  if (chiffres(mon) !== '9876543') throw new Error('infobulle trésorerie : ' + mon);
  if (!ui.el.statCompute.title) throw new Error('infobulle compute absente');
  if (!ui.el.statEnergy.title) throw new Error('infobulle énergie absente');
  // très grands nombres : tous les chiffres, sans bruit binaire
  game.state.lifetimeTokens = 1e60;
  ui.render();
  const gros = chiffres(ui.el.statTokens.title);
  if (gros.length !== 61) throw new Error('1e60 devrait faire 61 chiffres, pas ' + gros.length);
  if (!/^10+$/.test(gros)) throw new Error('artefacts de flottant dans l infobulle : ' + gros.slice(0, 30));
});

// save/load
await step('save', () => { if(!game.save()) throw new Error('save a échoué'); });

console.log('\n=== ' + (errors.length ? errors.length + ' ERREUR(S) ===' : 'UI OK — aucune erreur ==='));
errors.forEach(e => console.log(' - ' + e));
process.exit(errors.length ? 1 : 0);
