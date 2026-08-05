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
function step(label, fn) { try { fn(); console.log('OK  ' + label); } catch (e) { errors.push(label + ' :: ' + e.message); console.log('ERR ' + label + ' :: ' + e.stack.split('\n').slice(0,3).join(' | ')); } }

const { Game } = await import('./js/game.js');
const { UI } = await import('./js/ui.js');
const { Cinematic } = await import('./js/ending.js');
const { GPUS, INFRA, ENERGY } = await import('./js/data.js');

const ui = new UI();
const game = new Game(ui);

step('ui.init', () => ui.init(game));
step('render initial', () => ui.render(true));

// quelques ticks + rendus en phase 1
step('ticks phase 1 + render', () => { for (let i=0;i<40;i++){ game.tick(0.25); if(i%5===0) ui.render(); } });

// clic manuel
step('manualGenerate + render', () => { for(let i=0;i<5;i++) game.manualGenerate(); ui.render(); });

// achats divers
step('buyGPU consumer', () => { game.state.money = 1e6; game.buyGPU('consumer'); ui.render(); });
step('buyEnergy grid', () => { game.buyEnergy('grid'); ui.render(); });
step('buyMarketing', () => { game.buyMarketing(); ui.render(); });
step('slider prix', () => { ui.el.priceSlider.value = 55; ui.el.priceSlider.dispatchEvent(new window.Event('input')); ui.render(); });

// clic manuel = vente directe (l'argent monte immédiatement)
step('clic manuel vend directement', () => {
  const m0 = game.money;
  game.manualGenerate();
  if (game.money <= m0) throw new Error('le clic ne rapporte pas d argent');
  if (!/\$/.test(ui.el.btnGenerateSub.textContent || '') && ui.render()) {}
  ui.render();
  if (!/\$/.test(ui.el.btnGenerateSub.textContent)) throw new Error('valeur du clic non affichée');
});
// sparkline présente et échantillonnée
step('sparkline de production', () => {
  if (!ui.el.spark) throw new Error('canvas sparkline absent');
  for (let i = 0; i < 10; i++) { game.tick(0.25); ui.render(); }
  if (ui.sparkData.length < 2) throw new Error('aucun échantillon collecté');
});
// succès : déblocage + affichage dans l'aide
step('succès débloqués + affichage', () => {
  game.state.lifetimeTokens = Math.max(game.state.lifetimeTokens, 2e6);
  game.checkAchievements();
  if (!game.state.achievements['million']) throw new Error('succès "million" non débloqué');
  ui.renderAchievements();
  if (!/🏆/.test(ui.el.achievementsBody.innerHTML)) throw new Error('succès non affichés dans l aide');
});
// export/import : présents et sans crash (jsdom n'a pas URL.createObjectURL)
step('export/import de sauvegarde', () => {
  if (!ui.el.saveExport || !ui.el.saveImport || !ui.el.saveFile) throw new Error('boutons export/import absents');
  ui.exportSave();   // ne doit pas jeter (toast d erreur acceptable en jsdom)
});
// automatisations (auto-clickers : achat + activation/désactivation)
step('automatisations : achat + toggle', () => {
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
step('auto-achat par élément (toggle sur une carte)', () => {
  game.state.auto.gpu.owned = true; game.state.auto.gpu.on = true;
  const r = ui.rows.gpu['consumer'];
  ui.render();
  if (r.autoBtn.classList.contains('hidden')) throw new Error('toggle auto absent alors que capacité achetée');
  r.autoBtn.dispatchEvent(new window.Event('click'));
  if (!game.isAutoItem('gpu', 'consumer')) throw new Error('auto élément non activé');
  ui.render();
  if (!r.autoBtn.classList.contains('on')) throw new Error('état actif non affiché');
  // une autre carte non cochée ne doit pas être auto
  if (game.isAutoItem('gpu', 'v100')) throw new Error('auto appliqué à toute la famille');
});

// boutons d'achat groupé ×10 / ×100
step('boutons ×10 (≥20) et ×100 (≥200)', () => {
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
step('buyInfra serveur (chantier puis mise en service)', () => {
  game.state.money = 1e9;
  const before = game.capacityFor('gpu');
  game.buyInfra('server');
  ui.render();
  // pendant le chantier : l'emplacement parent est réservé, mais aucune capacité encore offerte
  if (game.pendingCount('infra', 'server') !== 1) throw new Error('serveur non mis en chantier');
  if (game.capacityFor('gpu') !== before) throw new Error('capacité offerte avant la fin du chantier');
  game.tick(30);
  if (game.capacityFor('gpu') <= before) throw new Error('capacité GPU non augmentée après le chantier');
});
step('buyGPU avec emplacement + render slot', () => { game.buyGPU('consumer'); ui.render(); if (ui.el.gpuCap.textContent.indexOf('/') < 0) throw new Error('indicateur emplacements absent'); });
step('sellGPU (revente)', () => { const n = game.state.gpuCounts['consumer'] || 0; if (n < 1) game.buyGPU('consumer'); ui.rows.gpu['consumer'].sell.dispatchEvent(new window.Event('click')); ui.render(); });
// équipe (RH) + charges + dépendances
step('embauche/licenciement + charges affichées', () => {
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
step('affichage tokens perdus + date au jour', () => {
  if (!/\/s/.test(ui.el.invTokens.textContent)) throw new Error('débit de tokens perdus non affiché');
  if (!/\d+ \w+ \d{4}/.test(ui.el.simDate.textContent)) throw new Error('date jour-mois-année absente');
});
// colocation (espace en datacenter)
step('colocation : espace loué (+baies)', () => {
  const before = game.capacityFor('rack');
  ui.rows.infra['rack'].el.querySelector('[data-act=rent]').dispatchEvent(new window.Event('click'));
  if (game.capacityFor('rack') <= before) throw new Error('colocation sans effet');
  ui.render();
});
// location de datacenter
step('location datacenter (coût journalier)', () => {
  const before = game.capacityFor('rack');
  ui.rows.infra['datacenter'].el.querySelector('[data-act=rent]').dispatchEvent(new window.Event('click'));
  if (game.capacityFor('rack') <= before) throw new Error('capacité baies non augmentée par location');
  ui.render();
  if (!/loué/.test(ui.rows.infra['datacenter'].rentInfo.textContent)) throw new Error('info location absente');
  ui.rows.infra['datacenter'].el.querySelector('[data-act=unrent]').dispatchEvent(new window.Event('click'));
});
// bourse
step('bourse dépôt/retrait + risque', () => {
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
step('énergie affichée en kW/MW', () => { if (!/kW|MW/.test(ui.el.statEnergy.textContent)) throw new Error('format puissance absent'); });
// redémarrage depuis le début
step('redémarrage (restart)', () => {
  game.state.lifetimeTokens = 5e6; game.state.modelTier = 4;
  ui.el.btnRestart.dispatchEvent(new window.Event('click'));
  if (ui.el.restartOverlay.classList.contains('hidden')) throw new Error('confirmation non affichée');
  ui.el.restartConfirm.dispatchEvent(new window.Event('click'));
  if (game.state.lifetimeTokens !== 0 || game.state.modelTier !== 0) throw new Error('partie non réinitialisée');
  ui.render();
});

// événement → modale → choix
step('showEvent + choisir option 0', () => {
  const ev = game.pickEvent() || { id:'t', title:'Test', body:'b', phase:1, choices:[{label:'A',desc:'d',apply:()=>{}},{label:'B',desc:'d',apply:()=>{}}] };
  ui.showEvent(ev);
  if (ui.el.modalOverlay.classList.contains('hidden')) throw new Error('modale non affichée');
  ui.el.modalChoices.querySelector('.choice').dispatchEvent(new window.Event('click'));
  if (!ui.el.modalOverlay.classList.contains('hidden')) throw new Error('modale non fermée après choix');
});

// directives permanentes : achat, case à cocher, résolution automatique
step('addendum : directives + case « désormais » + auto-résolution', () => {
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
step('datacenter orbital : chrono, retard, faillite', () => {
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
step('inflation : indice, prix et pouvoir d achat', () => {
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
step('énergie : coût unique vs coûts récurrents', () => {
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
step('chantiers : délais croissants avec la complexité', () => {
  const t = f => game.buildSeconds(f.id ? f.id : f, f);
  const secGpu = game.buildSeconds('gpu', GPUS.find(g => g.id === 'consumer'));
  const secRack = game.buildSeconds('gpu', GPUS.find(g => g.id === 'gb200'));
  if (!(secRack > secGpu)) throw new Error('un rack complet devrait être plus long qu une carte gamer');
  const secDc = game.buildSeconds('datacenter', INFRA.find(i => i.id === 'datacenter'));
  const secServer = game.buildSeconds('server', INFRA.find(i => i.id === 'server'));
  if (!(secDc > secServer)) throw new Error('un datacenter devrait être plus long qu un serveur');
  const smr = ENERGY.find(e => e.id === 'nuclear'), sun = ENERGY.find(e => e.id === 'solar');
  if (!(game.buildSeconds('energy', smr) > game.buildSeconds('energy', sun))) throw new Error('un SMR devrait être plus long qu un panneau');
  // et le badge « en chantier » apparaît bien dans la liste
  game.state.money = 1e9;
  game.state.playSeconds = 60;
  game.buyGPU('consumer');
  ui.render();
  if (!/chantier/.test(ui.rows.gpu['consumer'].effect.innerHTML)) throw new Error('badge de chantier absent');
  game.tick(30);
});

// ---- crises : boîte rouge cachée, saignée, remédiation ----
step('crise : apparition silencieuse, saignée puis remédiation', () => {
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
step('crise : résorption automatique au bout de 2 minutes', () => {
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
step('inactivité : tirage sans remise des 12 animations', () => {
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
step('inactivité : déclenchement après 15 s sans interaction', () => {
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
step('presse : titres corrélés au palier de modèle', () => {
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

// toast + log
step('toast & log', () => { ui.toast('hello','good'); ui.log('test log','milestone'); });

// passage phase 2
step('enterPhase 2 + alloc UI', () => {
  game.state.modelTier = 7;
  game.enterPhase(2);
  if (ui.el.panelAlloc.classList.contains('hidden')) throw new Error('panel alloc non affiché');
  ui.render();
});
step('ticks phase 2', () => { game.state.alloc={serve:0.3,research:0.1,improve:0.2,harvest:0.4}; for(let i=0;i<40;i++){ game.tick(0.25); if(i%10===0) ui.render(); } });
step('phase 2 : marqueurs argent masqués', () => {
  ui.render();
  if (!ui.el.moneyStat.classList.contains('hidden')) throw new Error('stat argent encore visible en phase 2');
  if (!ui.el.panelMarket.classList.contains('hidden')) throw new Error('panneau marché encore visible en phase 2');
  if (!ui.el.panelCharges.classList.contains('hidden')) throw new Error('panneau charges encore visible en phase 2');
});
step('slider alloc', () => { const k=Object.keys(ui.allocInputs)[0]; ui.allocInputs[k].input.value=60; ui.allocInputs[k].input.dispatchEvent(new window.Event('input')); ui.render(); });

// passage phase 3 + cosmos
step('enterPhase 3 + cosmos UI', () => {
  game.state.earthConsumed = 1;
  game.enterPhase(3);
  if (ui.el.panelCosmos.classList.contains('hidden')) throw new Error('panel cosmos non affiché');
  ui.render();
});
step('ticks phase 3 + upgrade sonde', () => { game.state.matter=1e30; for(let i=0;i<20;i++){ game.tick(0.25); } game.upgradeProbe('harvest'); ui.render(); });

// fin
step('triggerEnding + showEnding', () => {
  game.state.universeConsumed = 1; game.state.lifetimeTokens = 1e62;
  game.triggerEnding();
  if (ui.el.endingScreen.classList.contains('hidden')) throw new Error('écran de fin non affiché');
});
step('écran final : Play again → « Get a life ;-) » → fermeture tentée', () => {
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
step('Play again fuit la souris, NG+ reste accessible', () => {
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
step('capture de fin fidèle à l écran de jeu', () => {
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
step('Ctrl+Shift+E lance la fin', () => {
  ui.el.endingScreen.classList.add('hidden');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'E', ctrlKey: true, shiftKey: true }));
  // sans canvas 2D (jsdom), showEnding() bascule directement sur l'écran final
  if (ui.el.endingScreen.classList.contains('hidden') && ui.el.cine.classList.contains('hidden'))
    throw new Error('Ctrl+Shift+E n a pas déclenché la fin');
  ui.el.endingScreen.classList.add('hidden');
});

// save/load
step('save', () => { if(!game.save()) throw new Error('save a échoué'); });

console.log('\n=== ' + (errors.length ? errors.length + ' ERREUR(S) ===' : 'UI OK — aucune erreur ==='));
errors.forEach(e => console.log(' - ' + e));
process.exit(errors.length ? 1 : 0);
