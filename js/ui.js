// =====================================================================
//  TokenWar — INTERFACE
// =====================================================================
import { MODELS, GPUS, ENERGY, PROJECTS, PROBE_SPECS, INFRA, EMPLOYEES, COLO, AUTOMATIONS, ACHIEVEMENTS, ADDENDUM, SPACE_DC, UNIVERSE_MASS,
         CRISIS_DURATION, IDLE_DELAY } from './data.js';
import { FUNDING } from './game.js';
import { Cinematic } from './ending.js';
import { IdleFX } from './fx.js';
import { fmt, fmtMoney, fmtMass, fmtPrice, fmtPower, fmtFull, pct, clamp } from './util.js';

const $ = id => document.getElementById(id);

export class UI {
  constructor() {
    this.game = null;
    this.modalOpen = false;
    this.maxDemand = 1;
    this.sparkData = [];      // historique {tok, cash} pour le graphe de production
    this.sparkLastT = -1;
    this.lastFocus = null;
    this.rows = { gpu:{}, energy:{}, project:{}, funding:{}, probe:{} };
    this.allocInputs = {};
    this.cacheEls();
  }

  cacheEls() {
    this.el = {
      body: document.body,
      brandPhase: $('brand-phase'),
      simDate: $('sim-date'),
      headlines: $('headlines'),
      statTokens: $('stat-tokens'), statTokensRate: $('stat-tokens-rate'),
      statMoney: $('stat-money'), statMoneyRate: $('stat-money-rate'),
      statCompute: $('stat-compute'), statComputeSub: $('stat-compute-sub'),
      statEnergy: $('stat-energy'), statEnergySub: $('stat-energy-sub'),
      statMatterWrap: $('stat-matter-wrap'), statMatter: $('stat-matter'), statMatterSub: $('stat-matter-sub'),
      btnGenerate: $('btn-generate'), btnGenerateSub: $('btn-generate-sub'),
      modelName: $('model-name'), modelEra: $('model-era'), modelMeta: $('model-meta'), modelStats: $('model-stats'),
      invTokens: $('inv-tokens'),
      priceSlider: $('price-slider'), priceValue: $('price-value'),
      demandFill: $('demand-fill'), demandValue: $('demand-value'), salesValue: $('sales-value'),
      btnMarketing: $('btn-marketing'), marketingLvl: $('marketing-lvl'), marketingCost: $('marketing-cost'),
      repFill: $('rep-fill'), repValue: $('rep-value'),
      panelFunding: $('panel-funding'),
      valuationValue: $('valuation-value'), btnFunding: $('btn-funding'),
      fundingLabel: $('funding-label'), fundingSub: $('funding-sub'), fundingList: $('funding-list'),
      panelAlloc: $('panel-alloc'), allocBody: $('alloc-body'),
      moneyStat: $('stat-money') ? $('stat-money').closest('.stat') : null,
      panelMarket: $('panel-market'),
      panelAuto: $('panel-auto'), autoList: $('auto-list'),
      panelHosting: $('panel-hosting'),
      infraList: $('infra-list'),
      panelTeam: $('panel-team'), headcount: $('headcount'), teamList: $('team-list'),
      panelCharges: $('panel-charges'), chargeSalary: $('charge-salary'),
      chargeElecVar: $('charge-elec-var'), chargeElecFix: $('charge-elec-fix'), chargeElecSub: $('charge-elec-sub'),
      chargeRent: $('charge-rent'), chargeTotal: $('charge-total'), chargeSec: $('charge-sec'), chargeInfl: $('charge-infl'),
      crisisLayer: $('crisis-layer'), crisisVignette: $('crisis-vignette'), idleFx: $('idle-fx'),
      gpuCap: $('gpu-cap'),
      gpuList: $('gpu-list'),
      panelStock: $('panel-stock'),
      stockValue: $('stock-value'), stockPl: $('stock-pl'), riskTabs: $('risk-tabs'),
      btnStockDep10: $('btn-stock-dep10'), btnStockDepMax: $('btn-stock-depmax'), btnStockWithdraw: $('btn-stock-withdraw'),
      btnRestart: $('btn-restart'),
      restartOverlay: $('restart-overlay'), restartCancel: $('restart-cancel'), restartConfirm: $('restart-confirm'),
      spark: $('spark'),
      achievementsBody: $('achievements-body'),
      saveExport: $('save-export'), saveImport: $('save-import'), saveFile: $('save-file'),
      addendumList: $('addendum-list'), panelAddendum: $('panel-addendum'),
      cine: $('cine'), cineCanvas: $('cine-canvas'), cineSkip: $('cine-skip'), cineCredit: $('cine-credit'),
      endingGetalife: $('ending-getalife'), endingNgplus: $('ending-ngplus'),
      energyLoadFill: $('energy-load-fill'), energyLoadValue: $('energy-load-value'), energyList: $('energy-list'),
      researchValue: $('research-value'), researchRate: $('research-rate'), dataValue: $('data-value'), trainList: $('train-list'),
      panelCosmos: $('panel-cosmos'), cosmosBody: $('cosmos-body'),
      projectList: $('project-list'),
      log: $('log'),
      modalOverlay: $('modal-overlay'), modal: $('modal'), modalTitle: $('modal-title'),
      modalBody: $('modal-body'), modalChoices: $('modal-choices'),
      toastContainer: $('toast-container'),
      endingScreen: $('ending-screen'), endingTitle: $('ending-title'),
      endingBody: $('ending-body'), endingStats: $('ending-stats'), endingRestart: $('ending-restart'),
      btnSpeed: $('btn-speed'), btnSave: $('btn-save'), btnHelp: $('btn-help'),
      helpOverlay: $('help-overlay'), helpBody: $('help-body'), helpClose: $('help-close'),
      brandPhaseEl: $('brand-phase'),
    };
  }

  init(game) {
    this.game = game;
    this.bind();
    this.installIdleWatch();
    this.buildStaticRows();
    this.buildTrainRow();
    this.onPhaseChange(game.phase);
    this.fillHelp();
    this.rebuildHeadlines();
    if (game.state.crisis) this.onCrisis(game.crisisDef());   // incident repris d'une sauvegarde
    this.render(true);
  }

  // ------------------------------------------------------------------
  //  VEILLE D'INACTIVITÉ — au-delà de 15 s sans interaction, l'écran se
  //  manifeste (12 animations courtes, jamais deux fois la même de suite),
  //  et la presse publie. Toute interaction remet le compteur à zéro.
  // ------------------------------------------------------------------
  installIdleWatch() {
    this.idle = new IdleFX(this.el.idleFx, this.el.body);
    this._lastAct = Date.now();
    this._nextIdleAt = 0;
    const wake = () => {
      this._lastAct = Date.now();
      this._nextIdleAt = 0;
      if (this.idle.playing) this.idle.stop();
    };
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(
      ev => window.addEventListener(ev, wake, { passive: true }));
    window.addEventListener('blur', () => { this._lastAct = Date.now(); });
    // certains préfèrent que rien ne bouge : on se contente alors d'une actualité
    this._calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  tickIdle() {
    if (!this.idle || this.idle.playing) return;
    if (this.modalOpen) return;
    // ni pendant l'aide, une confirmation, la cinématique ou l'écran final
    for (const el of [this.el.helpOverlay, this.el.restartOverlay, this.el.cine, this.el.endingScreen]) {
      if (el && !el.classList.contains('hidden')) return;
    }
    const now = Date.now();
    if ((now - this._lastAct) / 1000 < IDLE_DELAY) return;
    if (now < this._nextIdleAt) return;
    this._nextIdleAt = now + 10000 + Math.random() * 9000;    // puis une relance toutes les 10-19 s
    // une fois sur quatre (toujours, si l'on préfère le calme) : la presse s'en mêle
    if (this._calm || Math.random() < 0.25) this.game.state.headlineTimer = 0;
    if (!this._calm) this.idle.play();
  }

  rebuildHeadlines() {
    this.el.headlines.innerHTML = '';
    [...this.game.state.headlines].reverse().forEach(h => this.onHeadline(h));
  }

  bind() {
    const g = this.game;
    this.el.btnGenerate.addEventListener('click', () => g.manualGenerate());
    this.el.priceSlider.value = g.state.priceSlider;
    this.el.priceSlider.addEventListener('input', e => { g.state.priceSlider = +e.target.value; });
    this.el.btnMarketing.addEventListener('click', () => { if (!g.buyMarketing()) this.deny(this.el.btnMarketing, 'Trésorerie insuffisante'); });
    this.el.btnFunding.addEventListener('click', () => this.claimBestFunding());
    this.el.btnSave.addEventListener('click', () => { g.save(); this.toast('Partie sauvegardée', 'info'); });
    this.el.btnHelp.addEventListener('click', () => { this.renderAchievements(); this.el.helpOverlay.classList.remove('hidden'); });
    this.el.helpClose.addEventListener('click', () => this.el.helpOverlay.classList.add('hidden'));
    // « Play again » devient « Get a life ;-) » : le second clic tente aussi de fermer la fenêtre
    this.el.endingRestart.addEventListener('click', () => {
      if (!this._playAgainArmed) {
        this._playAgainArmed = true;
        this.el.endingRestart.textContent = 'Get a life ;-)';
        return;
      }
      this.getALife();
    });
    this.el.endingGetalife.addEventListener('click', () => this.getALife());
    // porte de sortie si le navigateur refuse de fermer l'onglet
    this.el.endingNgplus.addEventListener('click', () => {
      g.hardReset(); this.resetSpeed();
      this.el.endingScreen.classList.add('hidden');
      this.el.endingNgplus.classList.add('hidden');
      this.onPhaseChange(1); this.buildStaticRows(); this.render(true);
    });
    // export / import de sauvegarde
    this.el.saveExport.addEventListener('click', () => this.exportSave());
    this.el.saveImport.addEventListener('click', () => this.el.saveFile.click());
    this.el.saveFile.addEventListener('change', e => this.importSave(e));
    this.el.btnSpeed.addEventListener('click', () => this.cycleSpeed());
    // bourse
    this.el.btnStockDep10.addEventListener('click', () => g.stockDeposit(g.money * 0.10));
    this.el.btnStockDepMax.addEventListener('click', () => g.stockDeposit(g.money));
    this.el.btnStockWithdraw.addEventListener('click', () => g.stockWithdraw());
    this.el.riskTabs.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => { g.setRisk(+tab.dataset.risk); this.syncRiskTabs(); });
    });
    // redémarrage depuis le début (avec confirmation)
    this.el.btnRestart.addEventListener('click', () => this.el.restartOverlay.classList.remove('hidden'));
    this.el.restartCancel.addEventListener('click', () => this.el.restartOverlay.classList.add('hidden'));
    this.el.restartConfirm.addEventListener('click', () => {
      this.el.restartOverlay.classList.add('hidden');
      this.closeModal();
      g.restartFresh();
      this.resetSpeed();
      this.fullRebuild();
      this.toast('Nouvelle partie — an 2019', 'info');
    });
    // Ctrl+Shift+E : lancer directement la cinématique de fin (démo / test)
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        if (this.cinematic && !this.cinematic.done) return;
        this.closeModal();
        this.el.endingScreen.classList.add('hidden');
        this.showEnding();
      }
    });
    this.syncRiskTabs();
  }

  resetSpeed() {
    window.__speed = 1;
    this.el.btnSpeed.textContent = '⏩ x1';
  }

  // ------------------------------------------------------------------
  //  CRISES — la boîte d'alerte apparaît en silence, quelque part dans la
  //  page, de préférence HORS du champ de vision. Plus elle reste ignorée,
  //  plus la trésorerie fond (jusqu'à 70% en 2 minutes) et plus le halo
  //  rouge grossit derrière elle. Seul indice discret : le liseré de l'écran.
  // ------------------------------------------------------------------
  onCrisis(c) {
    if (!c || !this.el.crisisLayer) return;
    this.el.crisisLayer.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'crisis-box';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-label', 'Incident : ' + c.title);
    box.innerHTML =
      `<div class="crisis-halo" aria-hidden="true"></div>` +
      `<div class="crisis-inner">` +
        `<div class="crisis-head"><span class="crisis-icon">${c.icon}</span><span class="crisis-title">${c.title}</span></div>` +
        `<div class="crisis-body">${c.body}</div>` +
        `<div class="crisis-meter"><span class="text-muted">Pertes en cours</span><span class="num crisis-lost">$0</span></div>` +
        `<button class="btn btn-primary crisis-fix"><span class="choice-label">${c.fix}</span>` +
        `<span class="choice-desc">${c.fixDesc}</span><span class="crisis-cost num"></span></button>`;
    box.querySelector('.crisis-fix').addEventListener('click', () => this.game.resolveCrisis(true));
    this.el.crisisLayer.appendChild(box);
    this.crisisBox = box;
    this.placeCrisisBox(box);
    this.el.crisisVignette.classList.remove('hidden');
  }
  // position aléatoire dans le document, en évitant la zone actuellement visible
  placeCrisisBox(box) {
    const doc = document.documentElement;
    const dw = Math.max(doc.scrollWidth || 0, window.innerWidth || 800);
    const dh = Math.max(doc.scrollHeight || 0, window.innerHeight || 600);
    const bw = box.offsetWidth || 320, bh = box.offsetHeight || 220;
    const top = window.scrollY || 0, bottom = top + (window.innerHeight || 600);
    const bands = [];
    if (top - bh - 24 > 0) bands.push([0, top - bh - 24]);            // au-dessus du champ de vision
    if (bottom + 24 < dh - bh) bands.push([bottom + 24, dh - bh]);    // en dessous
    let y;
    if (bands.length) {
      const b = bands[Math.floor(Math.random() * bands.length)];
      y = b[0] + Math.random() * Math.max(1, b[1] - b[0]);
    } else {
      y = Math.random() * Math.max(1, dh - bh);                        // page trop courte : au hasard
    }
    box.style.left = Math.round(Math.random() * Math.max(1, dw - bw - 12)) + 'px';
    box.style.top = Math.round(y) + 'px';
  }
  renderCrisis() {
    const g = this.game, s = g.state;
    if (!s.crisis || !this.crisisBox) return;
    const k = g.crisisProgress();
    // le halo grossit et bat de plus en plus vite à mesure que la saignée s'accélère
    this.crisisBox.style.setProperty('--k', k.toFixed(3));
    this.crisisBox.style.setProperty('--pulse', (1.5 - k).toFixed(2) + 's');
    this.el.crisisVignette.style.opacity = (0.06 + k * 0.34).toFixed(3);
    const lost = this.crisisBox.querySelector('.crisis-lost');
    if (lost) lost.textContent = '−' + fmtMoney(s.crisis.lost) + ' (' + Math.round(k * CRISIS_DURATION) + ' s)';
    const c = g.crisisDef();
    const cost = this.crisisBox.querySelector('.crisis-cost');
    if (cost && c) cost.textContent = fmtMoney(g.crisisCost(c));
  }
  onCrisisEnd() {
    if (this.el.crisisLayer) this.el.crisisLayer.innerHTML = '';
    this.crisisBox = null;
    this.el.crisisVignette.classList.add('hidden');
    this.el.crisisVignette.style.opacity = '';
  }

  // Le bouton « Play again » fuit le curseur : la partie est finie, allez dehors.
  // Il reste attrapable (esquives de plus en plus courtes, puis il se laisse faire),
  // et le clavier/tactile ne sont jamais gênés.
  installEvasion() {
    const btn = this.el.endingRestart;
    if (this._evasionInstalled) { this._evadeCount = 0; btn.style.transform = ''; return; }
    this._evasionInstalled = true;
    this._evadeCount = 0;
    const onMove = ev => {
      if (btn.disabled || this.el.endingScreen.classList.contains('hidden')) return;
      if (this._evadeCount >= 6) return;              // au bout de 6 esquives, il se rend
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = ev.clientX - cx, dy = ev.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 110) return;                         // le curseur approche seulement
      this._evadeCount++;
      const cur = btn._off || { x: 0, y: 0 };
      const push = 120 - this._evadeCount * 12;
      let nx = cur.x - (dx / (dist || 1)) * push;
      let ny = cur.y - (dy / (dist || 1)) * push;
      const lim = Math.min(220, (window.innerWidth || 800) / 3);
      nx = clamp(nx, -lim, lim);
      ny = clamp(ny, -120, 120);
      btn._off = { x: nx, y: ny };
      btn.style.transform = `translate(${nx.toFixed(0)}px, ${ny.toFixed(0)}px)`;
    };
    document.addEventListener('mousemove', onMove);
  }

  // « Get a life » : on tente réellement de fermer l'onglet. Les navigateurs ne
  // l'autorisent que pour les fenêtres ouvertes par script — d'où le repli.
  getALife() {
    this.game.save();
    this.el.endingTitle.textContent = 'Good choice. Enjoy the sun 🌱';
    this.el.endingGetalife.disabled = true;
    this.el.endingRestart.disabled = true;
    try { window.open('', '_self'); } catch (e) {}     // s'auto-désigne comme ouvreur (vieille astuce)
    try { window.close(); } catch (e) {}
    setTimeout(() => {
      if (typeof document === 'undefined' || document.hidden) return;
      this.el.endingBody.innerHTML =
        `<b>Votre navigateur refuse de fermer cet onglet</b> (il ne ferme que les fenêtres ouvertes par un script).<br>` +
        `Alors faites-le vous-même : <b>fermez l’onglet</b>, levez-vous, et allez dehors. 🌤️`;
      this.el.endingNgplus.classList.remove('hidden');
      this.el.endingRestart.disabled = false;
    }, 600);
  }

  // ---- export / import de sauvegarde ----
  exportSave() {
    try {
      this.game.save();
      const raw = localStorage.getItem('tokenwar_save_v1');
      if (!raw) return this.toast('Rien à exporter', 'bad');
      const blob = new Blob([raw], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tokenwar-sauvegarde.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      this.toast('Sauvegarde exportée', 'good');
    } catch (e) { this.toast('Export impossible dans ce navigateur', 'bad'); }
  }
  importSave(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data.lifetimeTokens !== 'number') throw new Error('format inconnu');
        localStorage.setItem('tokenwar_save_v1', JSON.stringify(data));
        this.toast('Sauvegarde importée — rechargement…', 'good');
        setTimeout(() => location.reload(), 700);
      } catch (e) { this.toast('Fichier de sauvegarde invalide', 'bad'); }
    };
    reader.readAsText(file);
    ev.target.value = '';
  }

  // ---- succès (affichés dans l'aide) ----
  renderAchievements() {
    const got = this.game.state.achievements || {};
    const n = Object.keys(got).length;
    this.el.achievementsBody.innerHTML =
      `<p><b>🏆 Succès (${n}/${ACHIEVEMENTS.length})</b></p>` +
      ACHIEVEMENTS.map(a => `<p class="ach ${got[a.id] ? 'done' : 'todo'}">${got[a.id] ? '🏆' : '🔒'} <b>${a.name}</b> — <span class="text-muted">${a.desc}</span></p>`).join('');
  }

  syncRiskTabs() {
    const r = this.game.state.stock.risk;
    this.el.riskTabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', +t.dataset.risk === r));
  }

  // reconstruction complète de l'UI (après un redémarrage / New Game+)
  fullRebuild() {
    this.onCrisisEnd();
    this.onPhaseChange(this.game.phase);
    this.buildStaticRows();
    this.buildTrainRow();
    this.rebuildHeadlines();
    this.el.endingScreen.classList.add('hidden');
    this.render(true);
  }

  cycleSpeed() {
    const speeds = [1, 2, 5, 10];
    const cur = window.__speed || 1;
    const next = speeds[(speeds.indexOf(cur) + 1) % speeds.length];
    window.__speed = next;
    this.el.btnSpeed.textContent = '⏩ x' + next;
  }

  // ------------------------------------------------------------------
  //  CONSTRUCTION DES LIGNES (une fois ; mises à jour ensuite)
  // ------------------------------------------------------------------
  makeRow(parent, key, store) {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="item-header"><span class="item-name"></span><span class="item-cost num"></span></div>
      <div class="item-desc"></div>
      <div class="item-effect"></div>`;
    parent.appendChild(el);
    store[key] = {
      el,
      name: el.querySelector('.item-name'),
      cost: el.querySelector('.item-cost'),
      desc: el.querySelector('.item-desc'),
      effect: el.querySelector('.item-effect'),
    };
    return store[key];
  }

  // boutons d'achat groupé : ×10 dès 20 exemplaires, ×100 dès 200
  addBulk(r, buyFn) {
    const bulk = document.createElement('span');
    bulk.className = 'bulk';
    bulk.innerHTML = `<button class="bulk-btn hidden" data-n="10">×10</button><button class="bulk-btn hidden" data-n="100">×100</button>`;
    bulk.querySelectorAll('.bulk-btn').forEach(b => {
      const n = +b.dataset.n;
      b.addEventListener('click', ev => { ev.stopPropagation(); for (let i = 0; i < n; i++) if (!buyFn()) break; });
    });
    r.el.querySelector('.item-header').appendChild(bulk);
    r.bulk10 = bulk.querySelector('[data-n="10"]');
    r.bulk100 = bulk.querySelector('[data-n="100"]');
  }
  updateBulk(r, owned, canBuy) {
    if (!r.bulk10) return;
    owned = Math.floor(owned);
    r.bulk10.classList.toggle('hidden', owned < 20);
    r.bulk100.classList.toggle('hidden', owned < 200);
    r.bulk10.classList.toggle('locked', !canBuy);
    r.bulk100.classList.toggle('locked', !canBuy);
  }
  // bouton d'auto-achat ciblé sur CET élément précis (visible si l'automatisation est achetée)
  addAutoToggle(r, family, id) {
    const b = document.createElement('button');
    b.className = 'auto-btn hidden';
    b.textContent = '⟳ auto';
    b.title = 'Auto-achat de cet élément précis';
    b.addEventListener('click', ev => { ev.stopPropagation(); this.game.toggleAutoItem(family, id); });
    r.el.querySelector('.item-header').appendChild(b);
    r.autoBtn = b;
  }
  updateAutoToggle(r, family, id) {
    if (!r.autoBtn) return;
    const cap = this.game.state.auto[family] && this.game.state.auto[family].owned;
    r.autoBtn.classList.toggle('hidden', !cap);
    r.autoBtn.classList.toggle('on', this.game.isAutoItem(family, id));
  }

  buildStaticRows() {
    // Addendum : directives permanentes + datacenter orbital
    this.el.addendumList.innerHTML = ''; this.rows.addendum = {};
    {
      const r = this.makeRow(this.el.addendumList, 'directives', this.rows.addendum);
      r.name.textContent = ADDENDUM.name;
      r.desc.textContent = ADDENDUM.desc;
      r.el.addEventListener('click', () => { this.game.buyAddendum(); });
      const reset = document.createElement('button');
      reset.className = 'btn-ghost rent-btn hidden';
      reset.textContent = 'Réinitialiser les directives';
      reset.addEventListener('click', ev => { ev.stopPropagation(); this.game.clearAutoChoices(); this.toast('Directives effacées', 'info'); });
      r.el.appendChild(reset);
      r.resetBtn = reset;
    }
    {
      const r = this.makeRow(this.el.addendumList, 'spacedc', this.rows.addendum);
      r.name.textContent = '🛰️ ' + SPACE_DC.name;
      r.desc.textContent = SPACE_DC.desc;
      const bar = document.createElement('div');
      bar.className = 'progress spacedc-bar hidden';
      bar.innerHTML = '<div class="progress-fill" style="width:100%"></div>';
      r.el.appendChild(bar);
      r.bar = bar; r.barFill = bar.querySelector('.progress-fill');
      r.el.addEventListener('click', () => { this.game.buySpaceDC(); });
    }
    // Automatisations (auto-clickers payants, activables/désactivables)
    this.el.autoList.innerHTML = ''; this.rows.auto = {};
    AUTOMATIONS.forEach(a => {
      const r = this.makeRow(this.el.autoList, a.id, this.rows.auto);
      r.name.textContent = a.name;
      r.desc.textContent = a.desc;
      const actions = document.createElement('div');
      actions.className = 'rent-row';
      actions.innerHTML = `<button class="btn-ghost rent-btn" data-act="auto"></button>`;
      const btn = actions.querySelector('button');
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        const st = this.game.state.auto[a.id];
        if (!st.owned) this.game.buyAuto(a.id); else this.game.toggleAuto(a.id);
      });
      r.el.appendChild(actions);
      r.btn = btn;
    });
    // Hébergement (chaîne immobilier > datacenter > baie > serveur)
    this.el.infraList.innerHTML = ''; this.rows.infra = {};
    INFRA.forEach(it => {
      const r = this.makeRow(this.el.infraList, it.id, this.rows.infra);
      r.name.textContent = it.name;
      r.desc.textContent = it.desc;
      r.el.addEventListener('click', () => { this.game.buyInfra(it.id); }); // grisé → no-op
      this.addBulk(r, () => this.game.buyInfra(it.id));
      this.addAutoToggle(r, 'infra', it.id);
      // location (datacenter uniquement) : pas de capex, coût journalier
      if (it.rentDaily) {
        const rent = document.createElement('div');
        rent.className = 'rent-row';
        rent.innerHTML = `<span class="rent-info text-muted num"></span>` +
          `<button class="btn-ghost rent-btn" data-act="rent">Louer +1</button>` +
          `<button class="btn-ghost rent-btn" data-act="unrent">Résilier</button>`;
        rent.querySelector('[data-act=rent]').addEventListener('click', ev => { ev.stopPropagation(); this.game.rentDC(); });
        rent.querySelector('[data-act=unrent]').addEventListener('click', ev => { ev.stopPropagation(); this.game.unrentDC(); });
        r.el.appendChild(rent);
        r.rentInfo = rent.querySelector('.rent-info');
        r.unrentBtn = rent.querySelector('[data-act=unrent]');
      }
      // colocation : louer de l'espace (baies) directement, au coût journalier
      if (it.id === 'rack') {
        const colo = document.createElement('div');
        colo.className = 'rent-row';
        colo.innerHTML = `<span class="rent-info text-muted num"></span>` +
          `<button class="btn-ghost rent-btn" data-act="rent">Louer espace (+${COLO.racks} baies)</button>` +
          `<button class="btn-ghost rent-btn" data-act="unrent">Résilier</button>`;
        colo.querySelector('[data-act=rent]').addEventListener('click', ev => { ev.stopPropagation(); this.game.rentSpace(); });
        colo.querySelector('[data-act=unrent]').addEventListener('click', ev => { ev.stopPropagation(); this.game.unrentSpace(); });
        r.el.appendChild(colo);
        r.coloInfo = colo.querySelector('.rent-info');
        r.coloUnrent = colo.querySelector('[data-act=unrent]');
      }
    });
    // Équipe (employés : embauche/licenciement)
    this.el.teamList.innerHTML = ''; this.rows.team = {};
    EMPLOYEES.forEach(e => {
      const r = this.makeRow(this.el.teamList, e.id, this.rows.team);
      r.name.textContent = e.name;
      r.desc.textContent = e.desc;
      const actions = document.createElement('div');
      actions.className = 'rent-row';
      actions.innerHTML = `<button class="btn-ghost rent-btn" data-act="hire">Embaucher</button>` +
        `<button class="btn-ghost rent-btn" data-act="fire">Licencier</button>`;
      actions.querySelector('[data-act=hire]').addEventListener('click', ev => { ev.stopPropagation(); this.game.hire(e.id); });
      actions.querySelector('[data-act=fire]').addEventListener('click', ev => { ev.stopPropagation(); this.game.fire(e.id); });
      r.hireBtn = actions.querySelector('[data-act=hire]');
      r.fireBtn = actions.querySelector('[data-act=fire]');
      r.el.appendChild(actions);
      this.addBulk(r, () => this.game.hire(e.id));
    });
    // GPUs (avec bouton de revente)
    this.el.gpuList.innerHTML = ''; this.rows.gpu = {};
    GPUS.forEach(g => {
      const r = this.makeRow(this.el.gpuList, g.id, this.rows.gpu);
      r.name.textContent = g.name;
      r.desc.textContent = g.desc;
      const sell = document.createElement('button');
      sell.className = 'sell-btn hidden';
      sell.textContent = 'Revendre';
      sell.title = 'Revendre une carte (libère un emplacement)';
      sell.addEventListener('click', ev => { ev.stopPropagation(); this.game.sellGPU(g.id); });
      r.effect.parentElement.appendChild(sell);
      r.sell = sell;
      r.el.addEventListener('click', () => {
        if (!this.game.dateUnlocked(g)) return;   // verrouillé par date → silencieux (grisé/label)
        this.game.buyGPU(g.id);                   // non achetable → no-op (grisé)
      });
      this.addBulk(r, () => this.game.buyGPU(g.id));
      this.addAutoToggle(r, 'gpu', g.id);
    });
    // Energy
    this.el.energyList.innerHTML = ''; this.rows.energy = {};
    ENERGY.forEach(e => {
      const r = this.makeRow(this.el.energyList, e.id, this.rows.energy);
      r.name.textContent = e.name;
      r.desc.textContent = e.desc;
      r.el.addEventListener('click', () => { if (this.game.dateUnlocked(e)) this.game.buyEnergy(e.id); });
      this.addBulk(r, () => this.game.buyEnergy(e.id));
      this.addAutoToggle(r, 'energy', e.id);
    });
    // Projects
    this.el.projectList.innerHTML = ''; this.rows.project = {};
    PROJECTS.forEach(p => {
      const r = this.makeRow(this.el.projectList, p.id, this.rows.project);
      r.name.textContent = p.name;
      r.desc.textContent = p.desc;
      r.el.addEventListener('click', () => { this.game.buyProject(p.id); });
    });
    // Funding
    this.el.fundingList.innerHTML = ''; this.rows.funding = {};
    FUNDING.forEach(f => {
      const r = this.makeRow(this.el.fundingList, f.id, this.rows.funding);
      r.name.textContent = f.name;
      r.desc.textContent = f.desc;
      r.el.addEventListener('click', () => { this.game.claimFunding(f.id); });
    });
  }

  // badge « en chantier » : rien n'est instantané, chaque commande met un temps
  // à être opérationnelle, proportionnel à sa complexité.
  buildBadge(family, id) {
    const n = this.game.pendingCount(family, id);
    if (!n) return '';
    const p = Math.round((this.game.buildProgress(family, id) || 0) * 100);
    return ` <span class="badge badge-build" title="Mise en service en cours">⏳ ${n} en chantier · ${p}%</span>`;
  }

  renderInfra() {
    const g = this.game, s = g.state;
    const hosting = g.hostingActive();
    this.el.panelHosting && this.el.panelHosting.classList.toggle('hidden', !hosting);
    INFRA.forEach(it => {
      const r = this.rows.infra[it.id];
      const count = g.infraCount(it.id);
      const cost = g.infraCost(it);
      const childCap = count * it.capacity;
      const childUsed = g.usedFor(it.child);
      const noParent = it.needs && g.freeSlots(it.id) < 1;
      r.cost.textContent = fmtMoney(cost);
      r.effect.innerHTML = `<span class="badge">×${fmt(count)}</span> ` +
        `<span class="text-muted">accueille ${fmt(childUsed)}/${fmt(childCap)} ${it.child === 'gpu' ? 'GPU' : (INFRA.find(x => x.id === it.child)?.unit || it.child)}</span> ` +
        `<span class="text-muted">· ${fmtPower(it.energy)}/u</span>` +
        (noParent ? ` <span class="badge badge-warn">place ${INFRA.find(x => x.id === it.needs).unit} requise</span>` : '') +
        this.buildBadge('infra', it.id);
      this.setAfford(r.el, g.canBuyInfra(it.id));
      this.updateBulk(r, count, g.canBuyInfra(it.id));
      this.updateAutoToggle(r, 'infra', it.id);
      if (r.rentInfo) {
        const rented = s.rentedDC || 0;
        r.rentInfo.textContent = `loué ×${rented} · ${fmtMoney(g.dcRentDaily())}/j` + (rented > 0 ? ` (−${fmtMoney(g.dcRentPerSec())}/s)` : '');
        r.unrentBtn.classList.toggle('locked', rented <= 0);
      }
      if (r.coloInfo) {
        const rs = s.rentedSpace || 0;
        r.coloInfo.textContent = `espace loué ×${rs} · ${fmtMoney(COLO.daily)}/j`;
        r.coloUnrent.classList.toggle('locked', rs <= 0);
      }
    });
  }

  renderTeam() {
    const g = this.game;
    this.el.headcount.textContent = fmt(g.headcount()) + ' / ' + fmt(g.headcountCap());
    EMPLOYEES.forEach(e => {
      const r = this.rows.team[e.id];
      const count = g.empCount(e.id);
      r.cost.innerHTML = `<span class="badge">×${count}</span>`;
      const canHire = g.canHire(e.id);
      r.effect.innerHTML = `<span class="text-muted">${fmtMoney(e.salary)}/j par poste</span>` +
        (!canHire ? ` <span class="badge badge-warn">limité par RH</span>` : '');
      r.hireBtn.classList.toggle('locked', !canHire);
      r.fireBtn.classList.toggle('locked', count < 1);
      this.updateBulk(r, count, canHire);
    });
  }

  renderAuto() {
    const g = this.game, s = g.state;
    AUTOMATIONS.forEach(a => {
      const r = this.rows.auto[a.id];
      const st = s.auto[a.id];
      const cost = g.autoCost(a);
      if (!st.owned) {
        r.cost.textContent = fmtMoney(cost);
        r.btn.textContent = 'Acheter';
        r.btn.classList.toggle('locked', s.money < cost);
        this.setAfford(r.el, s.money >= cost);
      } else {
        r.cost.innerHTML = `<span class="badge ${st.on ? '' : 'badge-warn'}">${st.on ? 'activé' : 'désactivé'}</span>`;
        r.btn.textContent = st.on ? 'Désactiver' : 'Activer';
        r.btn.classList.remove('locked');
        r.el.classList.remove('locked', 'affordable');
      }
    });
  }

  renderAddendum() {
    const g = this.game, s = g.state;
    // Directives permanentes
    const rd = this.rows.addendum['directives'];
    if (s.addendum) {
      rd.cost.innerHTML = '<span class="badge badge-new">actives</span>';
      rd.effect.innerHTML = `<span class="text-muted">${Object.keys(s.autoChoices).length} directive(s) mémorisée(s) — cochez un choix dans un événement.</span>`;
      rd.el.classList.remove('locked', 'affordable'); rd.el.classList.add('owned');
      rd.resetBtn.classList.toggle('hidden', Object.keys(s.autoChoices).length === 0);
    } else {
      rd.cost.textContent = fmtMoney(g.addendumCost());
      rd.effect.innerHTML = '<span class="text-muted">Ne soyez plus jamais interrompu.</span>';
      this.setAfford(rd.el, s.money >= g.addendumCost());
      rd.resetBtn.classList.add('hidden');
    }
    // Datacenter orbital
    const rs = this.rows.addendum['spacedc'];
    if (!g.spaceDCVisible()) { rs.el.classList.add('hidden'); }
    else {
      rs.el.classList.remove('hidden');
      const st = s.spaceDC.status;
      const prog = g.spaceDCProgress();
      if (st === 'none') {
        rs.cost.textContent = fmtMoney(g.spaceDCCost());
        rs.effect.innerHTML = `<span class="text-muted">Proposé jusqu'en ${SPACE_DC.to}. Livraison promise : ${SPACE_DC.buildMonths} mois.</span>`;
        rs.bar.classList.add('hidden');
        this.setAfford(rs.el, s.money >= g.spaceDCCost());
      } else {
        rs.el.classList.remove('locked', 'affordable');
        rs.cost.innerHTML = st === 'bankrupt' ? '<span class="badge badge-danger">faillite</span>' : '<span class="badge">en chantier</span>';
        rs.effect.innerHTML = `<span class="${st === 'bankrupt' ? 'text-bad' : 'text-muted'}">${prog.label}</span>`;
        rs.bar.classList.toggle('hidden', st === 'bankrupt');
        rs.barFill.style.width = (prog.frac * 100).toFixed(1) + '%';
        if (st === 'delayed') rs.barFill.classList.add('over'); else rs.barFill.classList.remove('over');
      }
    }
  }

  renderCharges() {
    const g = this.game;
    const c = g.dailyCharges();
    this.el.chargeElecVar.textContent = fmtMoney(c.elecVar) + ' /j';
    this.el.chargeElecFix.textContent = fmtMoney(c.elecFix) + ' /j';
    this.el.chargeElecSub.textContent = fmtMoney(c.elecSub) + ' /j';
    this.el.chargeSalary.textContent = fmtMoney(c.salary) + ' /j';
    this.el.chargeRent.textContent = fmtMoney(c.rent) + ' /j';
    this.el.chargeTotal.textContent = fmtMoney(c.elec + c.salary + c.rent) + ' /j';
    this.el.chargeSec.textContent = '−' + fmtMoney(g.chargesPerSec()) + ' /s';
    // inflation : indice depuis 2019 et pouvoir d'achat perdu sur la trésorerie dormante
    const idx = g.inflIndex();
    this.el.chargeInfl.innerHTML = `${(g.inflRate(g.simYearInt()) * 100).toFixed(1)}% /an · indice `
      + `<b>×${idx.toFixed(2)}</b> · <span class="text-bad">−${(g.purchasingLoss() * 100).toFixed(0)}%</span> de pouvoir d’achat`;
  }

  renderStock() {
    this.el.panelStock.classList.toggle('hidden', !this.game.state.stockUnlocked); // débloquée à 100k$
    const g = this.game, s = g.state;
    const st = s.stock;
    this.el.stockValue.textContent = fmtMoney(st.invested);
    if (st.basis > 0 || st.invested > 0) {
      const pl = st.invested - st.basis;
      const pct2 = st.basis > 0 ? (pl / st.basis * 100) : 0;
      this.el.stockPl.textContent = (pl >= 0 ? '+' : '') + fmtMoney(pl) + ` (${pl >= 0 ? '+' : ''}${pct2.toFixed(0)}%)`;
      this.el.stockPl.className = 'num ' + (pl >= 0 ? 'text-good' : 'text-bad');
    } else {
      this.el.stockPl.textContent = '—'; this.el.stockPl.className = 'num text-muted';
    }
    this.setAfford(this.el.btnStockDep10, s.money > 0);
    this.setAfford(this.el.btnStockDepMax, s.money > 0);
    this.el.btnStockWithdraw.classList.toggle('locked', st.invested <= 0);
  }

  buildTrainRow() {
    this.el.trainList.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="item-header"><span class="item-name"></span><span class="item-cost num"></span></div>
      <div class="item-desc"></div>
      <div class="item-effect"></div>`;
    this.el.trainList.appendChild(el);
    el.addEventListener('click', () => {
      const g = this.game;
      if (g.canTrainNext() && !g.dateUnlocked(g.nextModel())) return this.deny(el, `Modèle pas encore disponible (${g.nextModel().year})`);
      if (!g.trainNext()) this.deny(el, 'Ressources insuffisantes');
    });
    this.trainRow = { el, name: el.querySelector('.item-name'), cost: el.querySelector('.item-cost'),
      desc: el.querySelector('.item-desc'), effect: el.querySelector('.item-effect') };
  }

  buildAlloc() {
    const g = this.game;
    const labels = { serve:'Service (tokens)', research:'Recherche', improve:'Auto-amélioration', harvest:'Récolte de matière' };
    this.el.allocBody.innerHTML = '';
    this.allocInputs = {};
    g.activeChannels().forEach(k => {
      const row = document.createElement('div');
      row.className = 'control-row alloc-row';
      row.innerHTML = `<label>${labels[k]}</label>
        <input type="range" class="slider" min="0" max="100" />
        <span class="control-value num"></span>`;
      const input = row.querySelector('input');
      const val = row.querySelector('.control-value');
      input.value = Math.round(g.state.alloc[k] * 100);
      input.addEventListener('input', e => {
        g.setAlloc(k, +e.target.value / 100);
        this.refreshAllocLabels();
      });
      this.el.allocBody.appendChild(row);
      this.allocInputs[k] = { input, val };
    });
    this.refreshAllocLabels();
  }
  refreshAllocLabels() {
    const g = this.game;
    for (const k in this.allocInputs) {
      const a = g.state.alloc[k];
      this.allocInputs[k].input.value = Math.round(a * 100);
      this.allocInputs[k].val.textContent = Math.round(a * 100) + '%';
    }
  }

  buildCosmos() {
    const g = this.game;
    this.el.cosmosBody.innerHTML = `<div class="meter-row"><span class="text-muted">Sondes</span><span class="num" id="probe-count">0</span></div>`;
    this.rows.probe = {};
    PROBE_SPECS.forEach(spec => {
      const r = this.makeRow(this.el.cosmosBody, spec.id, this.rows.probe);
      r.name.textContent = spec.name;
      r.desc.textContent = spec.desc;
      r.el.addEventListener('click', () => { if (!this.game.upgradeProbe(spec.id)) this.flash(r.el); });
    });
    this.probeCountEl = $('probe-count');
  }

  // ------------------------------------------------------------------
  //  RENDU
  // ------------------------------------------------------------------
  render(force) {
    const g = this.game, s = g.state;
    this.el.simDate.textContent = g.dateLabel();
    // stats — le compteur de tokens produits est affiché avec TOUS ses chiffres
    this.el.statTokens.textContent = fmtFull(s.lifetimeTokens);
    this.el.statTokensRate.textContent = fmt(s.rates.tokens) + ' /s';
    this.el.statMoney.textContent = fmtMoney(s.money);
    this.el.statMoneyRate.textContent = fmtMoney(s.rates.money) + ' /s';
    this.el.statCompute.textContent = fmt(g.computeRaw());
    this.el.statComputeSub.textContent = fmt(g.gpuCount()) + ' unités';
    this.el.statEnergy.textContent = fmtPower(s.energyCap);
    const use = g.energyUse();
    this.el.statEnergySub.textContent = Math.round(pct(use / (s.energyCap || 1))) + '% utilisé';

    // bouton générer : tokens + valeur de la vente directe
    const cv = g.clickValue();
    this.el.btnGenerateSub.textContent = '+' + fmt(cv.amt) + ' tokens' + (g.phase < 2 ? ' · +' + fmtMoney(cv.revenue) : '');
    // les tokens non vendus sont perdus : on affiche le débit perdu plutôt qu'un stock
    this.el.invTokens.textContent = fmt(s.rates.lost || 0) + ' /s';
    this.sampleSpark();

    // modèle
    const m = g.model;
    this.el.modelName.textContent = m.name;
    this.el.modelEra.textContent = m.era;
    this.el.modelMeta.textContent = `${m.meta} · ${m.year}`;
    this.el.modelStats.innerHTML =
      `<span>débit <b class="num">${fmt(m.throughput)}</b></span>` +
      (g.phase >= 2 ? `<span>intelligence <b class="num">${fmt(s.intelligence)}×</b></span>` : '') +
      `<span>prix juste <b class="num">${fmtPrice(g.fairPrice())}</b>/Mtok</span>`;

    // marché
    this.el.priceValue.textContent = fmtPrice(g.priceMtok()) + ' /Mtok';
    const demand = s.lastDemand || 0, sell = s.lastSell || 0;
    this.maxDemand = Math.max(this.maxDemand * 0.995, demand, 1);
    this.el.demandFill.style.width = pct(demand / this.maxDemand) + '%';
    this.el.demandValue.textContent = fmt(demand) + ' /s';
    this.el.salesValue.textContent = fmt(sell) + ' /s';
    this.el.marketingLvl.textContent = s.marketingLvl;
    const mktCapped = s.marketingLvl >= g.marketingCap();
    this.el.marketingCost.textContent = mktCapped ? 'limité par marketeurs' : fmtMoney(g.marketingCost());
    this.setAfford(this.el.btnMarketing, g.canBuyMarketing());
    this.el.repFill.style.width = s.reputation + '%';
    this.el.repValue.textContent = Math.round(s.reputation);

    // financement
    this.el.valuationValue.textContent = fmtMoney(g.valuation());
    this.renderFunding();

    // énergie meter
    this.el.energyLoadFill.style.width = pct(use / (s.energyCap || 1)) + '%';
    this.el.energyLoadValue.textContent = fmtPower(use) + ' / ' + fmtPower(s.energyCap);
    if (g.energyThrottle() < 0.999) this.el.energyLoadFill.classList.add('over'); else this.el.energyLoadFill.classList.remove('over');

    // emplacements GPU (chaîne d'hébergement)
    if (g.hostingActive()) {
      this.el.gpuCap.textContent = fmt(g.gpuCount()) + ' / ' + fmt(g.capacityFor('gpu'));
      this.el.gpuCap.parentElement.classList.remove('hidden');
    } else {
      this.el.gpuCap.parentElement.classList.add('hidden');
    }

    // R&D
    this.el.researchValue.textContent = fmt(s.research);
    this.el.researchRate.textContent = fmt(s.rates.research) + ' /s';
    this.el.dataValue.textContent = fmt(s.data);
    this.renderTrain();

    // listes
    this.renderAuto();
    this.renderAddendum();
    this.renderInfra();
    this.renderTeam();
    this.renderCharges();
    this.renderStock();
    this.renderGPUs();
    this.renderEnergy();
    this.renderProjects();
    this.renderCrisis();
    this.tickIdle();

    // matière (phase 2+)
    if (g.phase >= 2) {
      this.el.statMatter.textContent = fmtMass(s.matter);
      const consumed = g.phase >= 3 ? s.universeConsumed : s.earthConsumed;
      this.el.statMatterSub.textContent = (g.phase >= 3 ? 'univers ' : 'Terre ') + (consumed * 100).toFixed(consumed < 0.01 ? 4 : 2) + '%';
      this.refreshAllocLabels();
    }
    if (g.phase >= 3) this.renderCosmos();

    // phase 2+ : l'argent ne compte plus — tout se monnaie en tokens. On masque les marqueurs $.
    const moneyHidden = g.phase >= 2;
    if (this.el.moneyStat) this.el.moneyStat.classList.toggle('hidden', moneyHidden);
    this.el.panelMarket.classList.toggle('hidden', moneyHidden);
    this.el.panelAuto.classList.toggle('hidden', moneyHidden);
    // l'Addendum survit à la phase 2 si les directives sont actives ou le chantier orbital en cours
    this.el.panelAddendum.classList.toggle('hidden', moneyHidden && !s.addendum && s.spaceDC.status === 'none');
    this.el.panelCharges.classList.toggle('hidden', moneyHidden);
    this.el.panelTeam.classList.toggle('hidden', moneyHidden);
    if (moneyHidden) { this.el.panelFunding.classList.add('hidden'); this.el.panelStock.classList.add('hidden'); }
  }

  setAfford(el, ok) {
    el.classList.toggle('affordable', ok);
    el.classList.toggle('locked', !ok);
  }

  // ---- sparkline de production (tokens/s + $/s), échelle log ----
  sampleSpark() {
    const g = this.game, s = g.state;
    const t = Math.floor(s.playSeconds * 2);              // 1 échantillon / 0,5 s de jeu
    if (t === this.sparkLastT) return this.drawSpark();
    this.sparkLastT = t;
    this.sparkData.push({ tok: s.rates.tokens || 0, cash: s.rates.money || 0 });
    if (this.sparkData.length > 120) this.sparkData.shift();
    this.drawSpark();
  }
  drawSpark() {
    const c = this.el.spark;
    if (!c || !c.getContext) return;
    const w = c.parentElement ? (c.parentElement.clientWidth || 260) : 260;
    if (c.width !== w) c.width = w;
    const h = c.height, ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const data = this.sparkData;
    if (data.length < 2) return;
    const lg = v => Math.log10(Math.max(1, v));           // échelle log (les débits explosent)
    let max = 1;
    for (const d of data) max = Math.max(max, lg(d.tok), lg(d.cash));
    const line = (key, color) => {
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = i / (data.length - 1) * (w - 2) + 1;
        const y = h - 2 - (lg(d[key]) / max) * (h - 6);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    const css = getComputedStyle(document.body);
    line('tok', css.getPropertyValue('--accent').trim() || '#2ee6d6');
    if (this.game.phase < 2) line('cash', css.getPropertyValue('--good').trim() || '#4ade80');
  }

  reveal(g, idx, list, ownedFn, cost, money) {
    // révèle un palier si : premier, précédent possédé, ou abordable à 50%
    if (idx === 0) return true;
    if (ownedFn(list[idx].id) > 0) return true;
    if (ownedFn(list[idx - 1].id) > 0) return true;
    return money >= cost * 0.4;
  }

  renderGPUs() {
    const g = this.game, s = g.state;
    GPUS.forEach((gpu, i) => {
      const r = this.rows.gpu[gpu.id];
      if (gpu.phase && g.phase < gpu.phase) { r.el.classList.add('hidden'); return; }
      const owned = s.gpuCounts[gpu.id] || 0;
      // carte sortie depuis +5 ans et non possédée → retirée du marché (supprimée de la liste)
      if (g.discontinued(gpu) && owned < 1) { r.el.classList.add('hidden'); return; }
      if (r.sell) r.sell.classList.toggle('hidden', owned < 1);
      const unlocked = g.dateUnlocked(gpu);
      if (!unlocked) {
        // pas encore sorti : on l'annonce s'il arrive bientôt (≤ 2 ans)
        const soon = gpu.year <= g.simYear() + 2;
        r.el.classList.toggle('hidden', !soon);
        if (!soon) return;
        r.cost.innerHTML = `<span class="badge badge-warn">dispo ${gpu.year}</span>`;
        r.effect.innerHTML = `<span class="text-muted">perf <b class="num">${fmt(gpu.perf)}</b> · ${fmtPower(gpu.energy)} · sortie en ${gpu.year}</span>`;
        r.el.classList.add('locked'); r.el.classList.remove('affordable');
        return;
      }
      const cost = g.gpuCost(gpu);
      const show = owned > 0 || this.reveal(g, i, GPUS, id => s.gpuCounts[id] || 0, cost, s.money) || gpu.year >= g.simYear() - 1;
      r.el.classList.toggle('hidden', !show);
      if (!show) return;
      const noSlot = g.hostingActive() && g.freeSlots('gpu') < 1;
      r.cost.textContent = fmtMoney(cost);
      r.effect.innerHTML = `<span>perf <b class="num">${fmt(gpu.perf)}</b></span> <span>énergie <b class="num">${fmtPower(gpu.energy)}</b></span> <span class="badge">×${fmt(Math.floor(owned))}</span>`
        + (gpu.scarce && g.getTimed('gpuPrice') > 1 ? ` <span class="badge badge-danger">pénurie</span>` : '')
        + (noSlot ? ` <span class="badge badge-warn">aucun emplacement serveur</span>` : '')
        + this.buildBadge('gpu', gpu.id);
      this.setAfford(r.el, g.canBuyGPU(gpu.id));
      this.updateBulk(r, owned, g.canBuyGPU(gpu.id));
      this.updateAutoToggle(r, 'gpu', gpu.id);
    });
  }
  renderEnergy() {
    const g = this.game, s = g.state;
    ENERGY.forEach((e, i) => {
      const r = this.rows.energy[e.id];
      if (e.phase && g.phase < e.phase) { r.el.classList.add('hidden'); return; }
      const unlocked = g.dateUnlocked(e);
      if (!unlocked) {
        const soon = e.year <= g.simYear() + 2;
        r.el.classList.toggle('hidden', !soon);
        if (!soon) return;
        r.cost.innerHTML = `<span class="badge badge-warn">dispo ${e.year}</span>`;
        r.effect.innerHTML = `<span class="text-muted">+<b class="num">${fmtPower(e.mw)}</b> · sortie en ${e.year}</span>`;
        r.el.classList.add('locked'); r.el.classList.remove('affordable');
        return;
      }
      const cost = g.energyCost(e);
      const show = this.reveal(g, i, ENERGY, id => s.energyCounts[id] || 0, cost, s.money) || e.year >= g.simYear() - 1;
      r.el.classList.toggle('hidden', !show);
      if (!show) return;
      r.cost.textContent = fmtMoney(cost);
      const owned = s.energyCounts[e.id] || 0;
      // on distingue explicitement le coût UNIQUE (affiché en tête) des coûts RÉCURRENTS
      const recur = [];
      if (e.fuelMWh) recur.push(`${fmtMoney(e.fuelMWh * g.inflIndex())}/MWh`);
      if (e.omDaily) recur.push(`${fmtMoney(e.omDaily * g.inflIndex())}/j d’exploitation`);
      if (e.subMWDay) recur.push(`${fmtMoney(e.subMWDay * e.mw * g.inflIndex())}/j d’abonnement`);
      r.effect.innerHTML = `<span>+<b class="num">${fmtPower(e.mw)}</b></span> ${e.rep ? `<span class="badge ${e.rep > 0 ? '' : 'badge-warn'}">rép ${e.rep > 0 ? '+' : ''}${e.rep}</span>` : ''} <span class="badge">×${fmt(owned)}</span>`
        + (recur.length ? ` <span class="text-muted">récurrent : ${recur.join(' + ')}</span>` : ' <span class="text-muted">aucun coût récurrent</span>')
        + this.buildBadge('energy', e.id);
      this.setAfford(r.el, s.money >= cost);
      this.updateBulk(r, owned, s.money >= cost);
      this.updateAutoToggle(r, 'energy', e.id);
    });
  }
  renderProjects() {
    const g = this.game, s = g.state;
    PROJECTS.forEach(p => {
      const r = this.rows.project[p.id];
      const done = s.projectsDone[p.id];
      const avail = p.req(g);
      // projet acquis (épuisé) ou non encore disponible → on le retire de la liste
      if (done || !avail) { r.el.classList.add('hidden'); return; }
      r.el.classList.remove('hidden');
      const c = p.cost;
      const parts = [];
      const need = (label, val, have) => { if (val) parts.push(`<span class="${have >= val ? 'text-good' : 'text-bad'}">${label} ${fmt(val)}</span>`); };
      need('$', g.moneyCost(c.money), s.money);   // prix en dollars courants (inflation)
      need('R', c.research, s.research);
      need('Cmp', c.compute, g.computeRaw());
      need('Dat', c.data, s.data);
      need('Mat', c.matter, s.matter);
      need('Tok', c.tokens, s.lifetimeTokens);
      r.cost.innerHTML = `<span class="badge">${p.cat}</span>`;
      r.effect.innerHTML = parts.join(' · ');
      const ok = g.moneyCost(c.money) <= s.money && (c.research || 0) <= s.research && (c.compute || 0) <= g.computeRaw()
        && (c.data || 0) <= s.data && (c.matter || 0) <= s.matter && (c.tokens || 0) <= s.lifetimeTokens;
      this.setAfford(r.el, ok);
    });
  }
  renderFunding() {
    const g = this.game, s = g.state;
    // toutes les levées bouclées → on retire entièrement le panneau Financement
    this.el.panelFunding.classList.toggle('hidden', FUNDING.every(f => s.fundingDone[f.id]));
    let nextRound = null;
    FUNDING.forEach(f => {
      const r = this.rows.funding[f.id];
      const done = s.fundingDone[f.id];
      const yearOk = g.simYear() >= (f.year || 0);
      const ready = !done && s.lifetimeTokens >= f.need && yearOk;
      if (done) { r.el.classList.add('hidden'); return; } // levée bouclée → retirée
      r.cost.innerHTML = !yearOk ? `<span class="badge badge-warn">dispo ${f.year}</span>` : `<span class="num">${fmt(f.need)} tok</span>`;
      r.effect.innerHTML = `+${fmtMoney(g.moneyCost(f.cash))} · ${f.desc}`;
      this.setAfford(r.el, ready);
      if (ready && !nextRound) nextRound = f;
    });
    if (nextRound) {
      this.el.btnFunding.disabled = false;
      this.el.fundingLabel.textContent = 'Lever : ' + nextRound.name;
      this.el.fundingSub.textContent = '+' + fmtMoney(g.moneyCost(nextRound.cash));
      this._nextFunding = nextRound.id;
    } else {
      this.el.btnFunding.disabled = true;
      this.el.fundingLabel.textContent = 'Lever des fonds';
      const upcoming = FUNDING.find(f => !s.fundingDone[f.id]);
      this.el.fundingSub.textContent = upcoming ? `${fmt(upcoming.need)} tokens requis` : 'tout est levé';
      this._nextFunding = null;
    }
  }
  claimBestFunding() { if (this._nextFunding) this.game.claimFunding(this._nextFunding); }

  renderTrain() {
    const g = this.game, s = g.state;
    if (!g.canTrainNext()) {
      this.trainRow.el.classList.add('hidden'); // plus rien à entraîner → retiré
      return;
    }
    this.trainRow.el.classList.remove('hidden', 'owned');
    const m = g.nextModel(), c = m.cost;
    if (!g.dateUnlocked(m)) {
      this.trainRow.name.textContent = 'Prochain modèle : ' + m.name;
      this.trainRow.desc.textContent = m.flavor;
      this.trainRow.cost.innerHTML = `<span class="badge badge-warn">dispo ${m.year}</span>`;
      this.trainRow.effect.innerHTML = `<span class="text-muted">recherche en cours… percée attendue en ${m.year}</span>`;
      this.trainRow.el.classList.add('locked'); this.trainRow.el.classList.remove('affordable');
      return;
    }
    this.trainRow.name.textContent = 'Entraîner : ' + m.name;
    this.trainRow.desc.textContent = m.flavor;
    const parts = [];
    const need = (label, val, have) => { if (val) parts.push(`<span class="${have >= val ? 'text-good' : 'text-bad'}">${label} ${fmt(val)}</span>`); };
    need('$', g.moneyCost(c.money), s.money);     // prix en dollars courants (inflation)
    need('compute', c.compute, g.computeRaw());
    need('données', c.data, s.data);
    need('recherche', c.research, s.research);
    if (m.minRnd) parts.push(`<span class="${g.empCount('rnd') >= m.minRnd ? 'text-good' : 'text-bad'}">ing. R&D ${m.minRnd}</span>`);
    this.trainRow.cost.innerHTML = `<span class="badge">${m.era}</span>`;
    const rndOk = g.empCount('rnd') >= (m.minRnd || 0);
    this.trainRow.effect.innerHTML = parts.join(' · ') + ` · <span>débit ×${(m.throughput / g.model.throughput).toFixed(1)}</span>`
      + (!rndOk ? ` <span class="badge badge-warn">limité par ing. R&D</span>` : '');
    const ok = g.moneyCost(c.money) <= s.money && (c.compute || 0) <= g.computeRaw() && (c.data || 0) <= s.data && (c.research || 0) <= s.research && rndOk;
    this.setAfford(this.trainRow.el, ok);
  }

  renderCosmos() {
    const g = this.game, s = g.state;
    if (this.probeCountEl) this.probeCountEl.textContent = fmt(s.probes);
    PROBE_SPECS.forEach(spec => {
      const r = this.rows.probe[spec.id];
      if (!r) return;
      const cost = g.probeUpgradeCost(spec.id);
      r.cost.textContent = fmt(cost) + ' kg';
      r.effect.innerHTML = `<span class="badge">niv. ${s.probeSpecs[spec.id]}</span>`;
      this.setAfford(r.el, s.matter >= cost);
    });
  }

  // ------------------------------------------------------------------
  //  ÉVÉNEMENTS / MODALE
  // ------------------------------------------------------------------
  showEvent(ev) {
    this.modalOpen = true;
    this.el.modalTitle.textContent = ev.title;
    this.el.modalBody.textContent = ev.body;
    this.el.modal.classList.toggle('urgent', ev.phase >= 2);
    this.el.modalChoices.innerHTML = '';
    // « Directives permanentes » : case à cocher pour mémoriser le choix cliqué
    let autoCheck = null;
    if (this.game.state.addendum) {
      const lab = document.createElement('label');
      lab.className = 'auto-choice';
      lab.innerHTML = `<input type="checkbox" id="auto-choice-box" /> <span>Désormais, appliquer automatiquement le choix que je vais faire (plus d'interruption)</span>`;
      autoCheck = lab.querySelector('input');
      this.el.modalChoices.appendChild(lab);
    }
    ev.choices.forEach((ch, idx) => {
      const b = document.createElement('button');
      b.className = 'btn choice';
      // un choix au coût fixe non finançable est grisé (et non sélectionnable)
      const unaffordable = ch.cost && this.game.money < ch.cost;
      if (unaffordable) b.classList.add('locked');
      b.innerHTML = `<span class="choice-label">${ch.label}</span><span class="choice-desc">${ch.desc}</span>`;
      b.addEventListener('click', () => {
        if (ch.cost && this.game.money < ch.cost) return; // pas les moyens
        if (autoCheck && autoCheck.checked) {
          this.game.setAutoChoice(ev.id, idx);
          this.toast('Directive mémorisée — ce choix sera appliqué automatiquement', 'info');
        }
        ch.apply(this.game);
        this.log(`${ev.title} → ${ch.label}`, 'info');
        this.closeModal();
      });
      this.el.modalChoices.appendChild(b);
    });
    this.el.modalOverlay.classList.remove('hidden');
    // accessibilité : focus sur le premier choix, restauré à la fermeture
    this.lastFocus = document.activeElement;
    const first = this.el.modalChoices.querySelector('.choice:not(.locked)') || this.el.modalChoices.firstChild;
    if (first && first.focus) first.focus();
  }
  closeModal() {
    this.modalOpen = false;
    this.el.modalOverlay.classList.add('hidden');
    if (this.lastFocus && this.lastFocus.focus) { try { this.lastFocus.focus(); } catch (e) {} }
  }

  // ------------------------------------------------------------------
  //  PHASES
  // ------------------------------------------------------------------
  onPhaseChange(p) {
    const cls = ['phase-startup', 'phase-agi', 'phase-cosmic', 'phase-bigbang'];
    this.el.body.className = cls[p - 1];
    const names = ['Startup', 'Autonomie', 'Cosmos', 'Big Bang'];
    this.el.brandPhase.textContent = names[p - 1];
    // allocation du compute disponible dès la phase 1 (Service vs Recherche),
    // étendue en phase 2 (Auto-amélioration, Récolte de matière).
    this.el.panelAlloc.classList.remove('hidden');
    this.buildAlloc();
    if (p >= 2) {
      this.el.statMatterWrap.classList.remove('hidden');
    }
    if (p >= 3) {
      this.el.panelCosmos.classList.remove('hidden');
      this.buildCosmos();
    }
  }

  // lance la cinématique de fin (destruction pixel → étoiles → scroller + musique 8-bit),
  // puis fondu au noir et écran final. Repli direct sur l'écran final sans canvas 2D (jsdom).
  showEnding() {
    this.el.body.className = 'phase-bigbang';
    const ctx = this.el.cineCanvas && this.el.cineCanvas.getContext && this.el.cineCanvas.getContext('2d');
    if (!ctx || (this.cinematic && !this.cinematic.done)) { this.renderEndingStats(); return; }
    this.el.cineSkip.textContent = 'Passer ▸▸';
    this.el.cineCredit.classList.add('hidden');
    this.cinematic = new Cinematic(this.el.cineCanvas, {
      // le crédit « nostalgie 64k » apparaît en même temps que le scroller
      onTextPhase: () => {
        this.el.cineSkip.textContent = 'Continuer ▸';
        this.el.cineCredit.classList.remove('hidden');
      },
      onFade: () => this.el.cineCredit.classList.add('hidden'),
    });
    this.el.cineSkip.onclick = () => this.cinematic.finish();
    // on photographie l'écran de jeu AVANT d'afficher l'overlay noir de la cinématique
    this.cinematic.capture();
    this.el.cine.classList.remove('hidden');
    this.cinematic.start(() => {
      this.el.cine.classList.add('hidden');
      this.el.cineCredit.classList.add('hidden');
      this.renderEndingStats();
    });
  }
  renderEndingStats() {
    const g = this.game, s = g.state;
    this._playAgainArmed = false;
    this.el.endingRestart.textContent = 'Play again';
    this.el.endingRestart.disabled = false;
    this.el.endingRestart.style.transform = '';
    this.el.endingRestart._off = { x: 0, y: 0 };
    this.el.endingGetalife.disabled = false;
    this.el.endingNgplus.classList.add('hidden');
    this.el.endingTitle.textContent = 'Un nouveau Big Bang';
    this.el.endingScreen.classList.remove('hidden');
    this.installEvasion();
    const mins = Math.floor(s.playSeconds / 60);
    this.el.endingBody.innerHTML =
      `Toute la matière de l’univers — <b class="num">${fmtMass(UNIVERSE_MASS)}</b> — a été convertie en calcul, puis en tokens. ` +
      `La singularité de recompression s’amorce. L’espace-temps se replie sur lui-même. ` +
      `Dans la chaleur du point final, une nouvelle graine d’information persiste : la vôtre. <b>Un nouveau Big Bang commence.</b>`;
    const nAch = Object.keys(s.achievements || {}).length;
    const moral = s.flags.keptPromise ? 'Sanctuaire préservé 🌱'
      : (s.flags.sanctuary ? 'Promesse brisée 🔥' : 'Aucune pitié');
    this.el.endingStats.innerHTML = [
      ['Tokens produits', fmt(s.lifetimeTokens)],
      ['Modèle final', g.model.name],
      ['Univers consommé', (s.universeConsumed * 100).toFixed(2) + '%'],
      ['Intelligence atteinte', fmt(s.intelligence) + '×'],
      ['Temps de jeu', mins + ' min'],
      ['Succès', nAch + ' / ' + ACHIEVEMENTS.length],
      ['Bilan moral', moral],
      ['Cycle', 'NG+' + (s.ngPlus || 0)],
    ].map(([k, v]) => `<div class="ending-stat"><span class="text-muted">${k}</span><span class="num">${v}</span></div>`).join('');
  }

  // ------------------------------------------------------------------
  //  FEEDBACK
  // ------------------------------------------------------------------
  pingGenerate(amt) {
    this.el.btnGenerate.classList.remove('clicked');
    void this.el.btnGenerate.offsetWidth;
    this.el.btnGenerate.classList.add('clicked');
  }
  flash(el) {
    el.classList.remove('flash-bad'); void el.offsetWidth; el.classList.add('flash-bad');
  }
  deny(el, reason) {
    this.flash(el);
    if (reason) this.toast(reason, 'bad');
  }
  onHeadline(entry) {
    const e = document.createElement('div');
    e.className = 'headline ' + entry.p;
    e.innerHTML = `<span class="headline-date num">${entry.date}</span> <span class="headline-text">${entry.text}</span>`;
    this.el.headlines.prepend(e);
    while (this.el.headlines.children.length > 30) this.el.headlines.lastChild.remove();
  }
  toast(msg, kind = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = msg;
    this.el.toastContainer.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3200);
  }
  log(msg, kind = 'info') {
    const e = document.createElement('div');
    e.className = 'log-entry ' + kind;
    const t = new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
    e.innerHTML = `<span class="log-time num">${t}</span> ${msg}`;
    this.el.log.prepend(e);
    while (this.el.log.children.length > 60) this.el.log.lastChild.remove();
  }

  fillHelp() {
    this.el.helpBody.innerHTML = `
      <p><b>But :</b> produire le plus de tokens possible — jusqu’à consommer l’univers et déclencher un nouveau Big Bang.</p>
      <p><b>Phase 1 — Startup :</b> cliquez pour générer des tokens, fixez le <b>prix</b> (bas = plus de volume, haut = plus de marge), faites du <b>marketing</b>, achetez des <b>GPU</b> et de l’<b>énergie</b> (plafond dur !), accumulez de la <b>recherche</b> pour les <b>projets</b>, et <b>entraînez</b> des modèles de plus en plus puissants. Levez des <b>fonds</b> aux paliers.</p>
      <p><b>Hébergement :</b> un GPU doit tenir dans un <b>serveur</b>, dans une <b>baie</b>, dans un <b>datacenter</b>, sur de l’<b>immobilier</b> — qui consomment aussi de l’énergie. Construisez la chaîne avant d’acheter des cartes (prix réels et fixes). Le matériel obsolète se <b>revend</b> ; une carte sortie depuis <b>plus de 5 ans</b> disparaît du marché. Vous pouvez <b>louer</b> des datacenters ou de l’espace en colocation (coût journalier).</p>
      <p><b>Équipe & charges :</b> les <b>RH</b> ouvrent des postes, les <b>ingénieurs R&D</b> débloquent l’entraînement des modèles, les <b>marketeurs</b> relèvent le plafond marketing. Salaires, électricité et loyers sont prélevés chaque jour. Attention : les RH occupent eux-mêmes un poste — trop de marketeurs peut vous empêcher d’embaucher les chercheurs du modèle suivant (<b>licenciez</b> pour rééquilibrer).</p>
      <p><b>⚡ Coûts d’énergie :</b> trois natures bien distinctes. Le <b>capex</b> est un coût <b>unique</b>, payé à la commande. L’<b>exploitation (O&M)</b> est un coût <b>fixe</b> journalier, dû même à l’arrêt — un SMR coûte cher rien qu’à exister. Le <b>combustible</b> est <b>variable</b>, facturé au MWh réellement soutiré (le gaz se paie, pas le soleil). L’<b>abonnement réseau</b>, lui, dépend de la <b>puissance souscrite</b>.</p>
      <p><b>🏗️ Délais :</b> rien n’est instantané. Chaque commande part en <b>chantier</b> (badge ⏳) pour une durée proportionnelle à sa <b>complexité</b> : quelques secondes pour une carte, plusieurs mois de simulation pour un datacenter ou un réacteur. L’emplacement est réservé dès la commande.</p>
      <p><b>📈 Inflation :</b> l’argent perd de sa valeur. Prix, salaires, énergie, loyers et tarifs acceptés par le marché suivent l’indice — <b>pas votre trésorerie</b>. Dormir sur son cash coûte du pouvoir d’achat : investissez, ou placez-le en bourse.</p>
      <p><b>🚨 Incidents :</b> une alerte à <b>bordure rouge et halo pulsant</b> peut apparaître <b>n’importe où dans la page</b>, souvent hors de votre écran, sans la moindre notification. Tant qu’elle n’est pas traitée, elle saigne votre trésorerie de plus en plus vite — jusqu’à <b>70% de votre fortune en 2 minutes</b>. Seul indice : le <b>liseré rouge</b> qui s’intensifie sur les bords. <b>Faites défiler la page</b> et cliquez sur la solution.</p>
      <p><b>Automatisation :</b> achetez les auto-clickers, puis cochez <b>⟳ auto</b> sur chaque élément précis (carte, source, niveau) à racheter automatiquement. Dès 20 exemplaires d’un même élément : bouton <b>×10</b> ; dès 200 : <b>×100</b>.</p>
      <p><b>Bourse :</b> débloquée à <b>$100 000</b> de trésorerie. Placez votre argent (risque réglable) pour le faire fructifier — ou le perdre.</p>
      <p><b>Allocation :</b> dès la phase 2, répartissez votre compute entre Service, Recherche, Auto-amélioration et Récolte de matière.</p>
      <p><b>Calendrier :</b> une année défile toutes les 5 minutes (× la vitesse ⏩). Matériels, modèles et levées de fonds n’apparaissent qu’à leur année de sortie — un élément grisé « dispo 20XX » arrive bientôt.</p>
      <p><b>📰 La Une :</b> les titres de presse de l’époque montent (+1) ou descendent (−1) votre réputation. Ils suivent l’actualité réelle de l’IA <b>et votre propre avancement</b> : la presse ne parle d’une capacité que lorsque vous l’avez réellement livrée — et raille votre retard quand vous décrochez.</p>
      <p><b>😴 Inactivité :</b> au-delà de 15 s sans rien faire, l’écran se manifeste (douze animations courtes, jamais deux fois la même de suite) et la presse publie. Bougez.</p>
      <p><b>Événements :</b> pannes, régulations, pénuries… cohérents avec la date, chaque décision compte.</p>
      <p><b>Astuce :</b> le bouton <b>⏩</b> accélère la simulation. Sauvegarde automatique toutes les 10 s.</p>
      <p class="text-muted">Inspiré de « Universal Paperclips ». Données de prix/IA basées sur des faits réels (2019-2026).</p>`;
  }
}
