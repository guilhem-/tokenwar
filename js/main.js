// =====================================================================
//  TokenWar — BOOTSTRAP & BOUCLE
// =====================================================================
import { Game } from './game.js';
import { UI } from './ui.js';
import { init as initI18n, t } from './i18n.js';

// la langue doit être choisie AVANT toute construction d'interface :
// les libellés sont figés à la création des lignes.
await initI18n();

const ui = new UI();
const game = new Game(ui);

// chargement d'une éventuelle sauvegarde
if (game.load()) {
  ui.toast(t('Partie chargée'), 'info');
}
ui.init(game);

window.__speed = 1;
window.game = game; // accès console (debug)

// ---- boucle principale ----
let last = performance.now();
let renderAcc = 0;
let saveAcc = 0;

function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.5) dt = 0.5;            // évite les sauts après un onglet en arrière-plan
  const steps = window.__speed || 1;
  // on subdivise pour rester stable à haute vitesse
  const simDt = dt * steps;
  let remaining = simDt;
  const maxStep = 0.25;
  while (remaining > 0) {
    const step = Math.min(maxStep, remaining);
    game.tick(step);
    remaining -= step;
  }

  renderAcc += dt;
  if (renderAcc >= 0.1) { ui.render(); renderAcc = 0; }   // ~10 fps de rendu

  saveAcc += dt;
  if (saveAcc >= 10) { game.save(); saveAcc = 0; }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// sauvegarde à la fermeture
window.addEventListener('beforeunload', () => game.save());
