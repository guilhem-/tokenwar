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
globalThis.performance = window.performance || { now: () => Date.now() };
window.__speed = 1;

let errors = [];
function step(label, fn) { try { fn(); console.log('OK  ' + label); } catch (e) { errors.push(label + ' :: ' + e.message); console.log('ERR ' + label + ' :: ' + e.stack.split('\n').slice(0,3).join(' | ')); } }

const { Game } = await import('./js/game.js');
const { UI } = await import('./js/ui.js');

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

// événement → modale → choix
step('showEvent + choisir option 0', () => {
  const ev = game.pickEvent() || { id:'t', title:'Test', body:'b', phase:1, choices:[{label:'A',desc:'d',apply:()=>{}},{label:'B',desc:'d',apply:()=>{}}] };
  ui.showEvent(ev);
  if (ui.el.modalOverlay.classList.contains('hidden')) throw new Error('modale non affichée');
  ui.el.modalChoices.children[0].dispatchEvent(new window.Event('click'));
  if (!ui.el.modalOverlay.classList.contains('hidden')) throw new Error('modale non fermée après choix');
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
step('NG+ restart', () => { ui.el.endingRestart.dispatchEvent(new window.Event('click')); ui.render(true); });

// save/load
step('save', () => { if(!game.save()) throw new Error('save a échoué'); });

console.log('\n=== ' + (errors.length ? errors.length + ' ERREUR(S) ===' : 'UI OK — aucune erreur ==='));
errors.forEach(e => console.log(' - ' + e));
process.exit(errors.length ? 1 : 0);
