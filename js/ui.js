// =====================================================================
//  TokenWar — INTERFACE
// =====================================================================
import { MODELS, GPUS, ENERGY, PROJECTS, PROBE_SPECS, UNIVERSE_MASS } from './data.js';
import { FUNDING } from './game.js';
import { fmt, fmtMoney, fmtMass, fmtPrice, pct, clamp } from './util.js';

const $ = id => document.getElementById(id);

export class UI {
  constructor() {
    this.game = null;
    this.modalOpen = false;
    this.maxDemand = 1;
    this.rows = { gpu:{}, energy:{}, project:{}, funding:{}, probe:{} };
    this.allocInputs = {};
    this.cacheEls();
  }

  cacheEls() {
    this.el = {
      body: document.body,
      brandPhase: $('brand-phase'),
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
      valuationValue: $('valuation-value'), btnFunding: $('btn-funding'),
      fundingLabel: $('funding-label'), fundingSub: $('funding-sub'), fundingList: $('funding-list'),
      panelAlloc: $('panel-alloc'), allocBody: $('alloc-body'),
      gpuList: $('gpu-list'),
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
    this.buildStaticRows();
    this.buildTrainRow();
    this.onPhaseChange(game.phase);
    this.fillHelp();
    this.render(true);
  }

  bind() {
    const g = this.game;
    this.el.btnGenerate.addEventListener('click', () => g.manualGenerate());
    this.el.priceSlider.value = g.state.priceSlider;
    this.el.priceSlider.addEventListener('input', e => { g.state.priceSlider = +e.target.value; });
    this.el.btnMarketing.addEventListener('click', () => { if (!g.buyMarketing()) this.flash(this.el.btnMarketing); });
    this.el.btnFunding.addEventListener('click', () => this.claimBestFunding());
    this.el.btnSave.addEventListener('click', () => { g.save(); this.toast('Partie sauvegardée', 'info'); });
    this.el.btnHelp.addEventListener('click', () => this.el.helpOverlay.classList.remove('hidden'));
    this.el.helpClose.addEventListener('click', () => this.el.helpOverlay.classList.add('hidden'));
    this.el.endingRestart.addEventListener('click', () => { g.hardReset(); this.el.endingScreen.classList.add('hidden'); this.onPhaseChange(1); this.buildStaticRows(); this.render(true); });
    this.el.btnSpeed.addEventListener('click', () => this.cycleSpeed());
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

  buildStaticRows() {
    // GPUs
    this.el.gpuList.innerHTML = ''; this.rows.gpu = {};
    GPUS.forEach(g => {
      const r = this.makeRow(this.el.gpuList, g.id, this.rows.gpu);
      r.name.textContent = g.name;
      r.desc.textContent = g.desc;
      r.el.addEventListener('click', () => { if (!this.game.buyGPU(g.id)) this.flash(r.el); });
    });
    // Energy
    this.el.energyList.innerHTML = ''; this.rows.energy = {};
    ENERGY.forEach(e => {
      const r = this.makeRow(this.el.energyList, e.id, this.rows.energy);
      r.name.textContent = e.name;
      r.desc.textContent = e.desc;
      r.el.addEventListener('click', () => { if (!this.game.buyEnergy(e.id)) this.flash(r.el); });
    });
    // Projects
    this.el.projectList.innerHTML = ''; this.rows.project = {};
    PROJECTS.forEach(p => {
      const r = this.makeRow(this.el.projectList, p.id, this.rows.project);
      r.name.textContent = p.name;
      r.desc.textContent = p.desc;
      r.el.addEventListener('click', () => { if (!this.game.buyProject(p.id)) this.flash(r.el); });
    });
    // Funding
    this.el.fundingList.innerHTML = ''; this.rows.funding = {};
    FUNDING.forEach(f => {
      const r = this.makeRow(this.el.fundingList, f.id, this.rows.funding);
      r.name.textContent = f.name;
      r.desc.textContent = f.desc;
      r.el.addEventListener('click', () => { if (!this.game.claimFunding(f.id)) this.flash(r.el); });
    });
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
    el.addEventListener('click', () => { if (!this.game.trainNext()) this.flash(el); });
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
    // stats
    this.el.statTokens.textContent = fmt(s.lifetimeTokens);
    this.el.statTokensRate.textContent = fmt(s.rates.tokens) + ' /s';
    this.el.statMoney.textContent = fmtMoney(s.money);
    this.el.statMoneyRate.textContent = fmtMoney(s.rates.money) + ' /s';
    this.el.statCompute.textContent = fmt(g.computeRaw());
    this.el.statComputeSub.textContent = fmt(g.gpuCount()) + ' unités';
    this.el.statEnergy.textContent = fmt(s.energyCap) + ' MW';
    const use = g.energyUse();
    this.el.statEnergySub.textContent = Math.round(pct(use / (s.energyCap || 1))) + '% utilisé';

    // bouton générer
    this.el.btnGenerateSub.textContent = '+' + fmt(Math.max(1, g.model.throughput) * (g.phase >= 2 ? s.intelligence : 1)) + ' tokens';
    this.el.invTokens.textContent = fmt(s.unsold);

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
    this.el.marketingCost.textContent = fmtMoney(g.marketingCost());
    this.setAfford(this.el.btnMarketing, s.money >= g.marketingCost());
    this.el.repFill.style.width = s.reputation + '%';
    this.el.repValue.textContent = Math.round(s.reputation);

    // financement
    this.el.valuationValue.textContent = fmtMoney(g.valuation());
    this.renderFunding();

    // énergie meter
    this.el.energyLoadFill.style.width = pct(use / (s.energyCap || 1)) + '%';
    this.el.energyLoadValue.textContent = fmt(use) + ' / ' + fmt(s.energyCap) + ' MW';
    if (g.energyThrottle() < 0.999) this.el.energyLoadFill.classList.add('over'); else this.el.energyLoadFill.classList.remove('over');

    // R&D
    this.el.researchValue.textContent = fmt(s.research);
    this.el.researchRate.textContent = fmt(s.rates.research) + ' /s';
    this.el.dataValue.textContent = fmt(s.data);
    this.renderTrain();

    // listes
    this.renderGPUs();
    this.renderEnergy();
    this.renderProjects();

    // matière (phase 2+)
    if (g.phase >= 2) {
      this.el.statMatter.textContent = fmtMass(s.matter);
      const consumed = g.phase >= 3 ? s.universeConsumed : s.earthConsumed;
      this.el.statMatterSub.textContent = (g.phase >= 3 ? 'univers ' : 'Terre ') + (consumed * 100).toFixed(consumed < 0.01 ? 4 : 2) + '%';
      this.refreshAllocLabels();
    }
    if (g.phase >= 3) this.renderCosmos();
  }

  setAfford(el, ok) {
    el.classList.toggle('affordable', ok);
    el.classList.toggle('locked', !ok);
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
      const cost = g.gpuCost(gpu);
      const owned = s.gpuCounts[gpu.id] || 0;
      const show = this.reveal(g, i, GPUS, id => s.gpuCounts[id] || 0, cost, s.money);
      r.el.classList.toggle('hidden', !show);
      if (!show) return;
      r.cost.textContent = fmtMoney(cost);
      r.effect.innerHTML = `<span>perf <b class="num">${fmt(gpu.perf)}</b></span> <span>énergie <b class="num">${fmt(gpu.energy)} MW</b></span> <span class="badge">×${fmt(owned)}</span>` + (gpu.scarce && g.getTimed('gpuPrice') > 1 ? ` <span class="badge badge-danger">pénurie</span>` : '');
      this.setAfford(r.el, s.money >= cost);
    });
  }
  renderEnergy() {
    const g = this.game, s = g.state;
    ENERGY.forEach((e, i) => {
      const r = this.rows.energy[e.id];
      if (e.phase && g.phase < e.phase) { r.el.classList.add('hidden'); return; }
      const cost = g.energyCost(e);
      const show = this.reveal(g, i, ENERGY, id => s.energyCounts[id] || 0, cost, s.money);
      r.el.classList.toggle('hidden', !show);
      if (!show) return;
      r.cost.textContent = fmtMoney(cost);
      const owned = s.energyCounts[e.id] || 0;
      r.effect.innerHTML = `<span>+<b class="num">${fmt(e.mw)}</b> MW</span> ${e.rep ? `<span class="badge ${e.rep > 0 ? '' : 'badge-warn'}">rép ${e.rep > 0 ? '+' : ''}${e.rep}</span>` : ''} <span class="badge">×${fmt(owned)}</span>`;
      this.setAfford(r.el, s.money >= cost);
    });
  }
  renderProjects() {
    const g = this.game, s = g.state;
    PROJECTS.forEach(p => {
      const r = this.rows.project[p.id];
      const done = s.projectsDone[p.id];
      const avail = p.req(g);
      if (!avail && !done) { r.el.classList.add('hidden'); return; }
      r.el.classList.remove('hidden');
      if (done) {
        r.el.classList.add('owned'); r.el.classList.remove('locked', 'affordable');
        r.cost.textContent = '✓';
        r.effect.innerHTML = `<span class="badge badge-new">acquis</span>`;
        return;
      }
      const c = p.cost;
      const parts = [];
      const need = (label, val, have) => { if (val) parts.push(`<span class="${have >= val ? 'text-good' : 'text-bad'}">${label} ${fmt(val)}</span>`); };
      need('$', c.money, s.money);
      need('R', c.research, s.research);
      need('Cmp', c.compute, g.computeRaw());
      need('Dat', c.data, s.data);
      need('Mat', c.matter, s.matter);
      need('Tok', c.tokens, s.lifetimeTokens);
      r.cost.innerHTML = `<span class="badge">${p.cat}</span>`;
      r.effect.innerHTML = parts.join(' · ');
      const ok = (c.money || 0) <= s.money && (c.research || 0) <= s.research && (c.compute || 0) <= g.computeRaw()
        && (c.data || 0) <= s.data && (c.matter || 0) <= s.matter && (c.tokens || 0) <= s.lifetimeTokens;
      this.setAfford(r.el, ok);
    });
  }
  renderFunding() {
    const g = this.game, s = g.state;
    let nextRound = null;
    FUNDING.forEach(f => {
      const r = this.rows.funding[f.id];
      const done = s.fundingDone[f.id];
      const ready = !done && s.lifetimeTokens >= f.need;
      if (done) { r.el.classList.add('owned'); r.el.classList.remove('affordable', 'locked'); r.cost.textContent = '✓'; r.effect.textContent = 'bouclée'; return; }
      r.cost.innerHTML = `<span class="num">${fmt(f.need)} tok</span>`;
      r.effect.innerHTML = `+${fmtMoney(f.cash)} · ${f.desc}`;
      this.setAfford(r.el, ready);
      if (ready && !nextRound) nextRound = f;
    });
    if (nextRound) {
      this.el.btnFunding.disabled = false;
      this.el.fundingLabel.textContent = 'Lever : ' + nextRound.name;
      this.el.fundingSub.textContent = '+' + fmtMoney(nextRound.cash);
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
      this.trainRow.name.textContent = 'Modèle maximal atteint';
      this.trainRow.cost.textContent = '✓';
      this.trainRow.desc.textContent = g.model.flavor;
      this.trainRow.effect.textContent = '';
      this.trainRow.el.classList.add('owned');
      return;
    }
    const m = g.nextModel(), c = m.cost;
    this.trainRow.name.textContent = 'Entraîner : ' + m.name;
    this.trainRow.desc.textContent = m.flavor;
    const parts = [];
    const need = (label, val, have) => { if (val) parts.push(`<span class="${have >= val ? 'text-good' : 'text-bad'}">${label} ${fmt(val)}</span>`); };
    need('$', c.money, s.money);
    need('compute', c.compute, g.computeRaw());
    need('données', c.data, s.data);
    need('recherche', c.research, s.research);
    this.trainRow.cost.innerHTML = `<span class="badge">${m.era}</span>`;
    this.trainRow.effect.innerHTML = parts.join(' · ') + ` · <span>débit ×${(m.throughput / g.model.throughput).toFixed(1)}</span>`;
    const ok = (c.money || 0) <= s.money && (c.compute || 0) <= g.computeRaw() && (c.data || 0) <= s.data && (c.research || 0) <= s.research;
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
    ev.choices.forEach(ch => {
      const b = document.createElement('button');
      b.className = 'btn choice';
      b.innerHTML = `<span class="choice-label">${ch.label}</span><span class="choice-desc">${ch.desc}</span>`;
      b.addEventListener('click', () => {
        ch.apply(this.game);
        this.log(`${ev.title} → ${ch.label}`, 'info');
        this.closeModal();
      });
      this.el.modalChoices.appendChild(b);
    });
    this.el.modalOverlay.classList.remove('hidden');
  }
  closeModal() {
    this.modalOpen = false;
    this.el.modalOverlay.classList.add('hidden');
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

  showEnding() {
    const g = this.game, s = g.state;
    this.el.endingScreen.classList.remove('hidden');
    this.el.body.className = 'phase-bigbang';
    const mins = Math.floor(s.playSeconds / 60);
    this.el.endingBody.innerHTML =
      `Toute la matière de l’univers — <b class="num">${fmtMass(UNIVERSE_MASS)}</b> — a été convertie en calcul, puis en tokens. ` +
      `La singularité de recompression s’amorce. L’espace-temps se replie sur lui-même. ` +
      `Dans la chaleur du point final, une nouvelle graine d’information persiste : la vôtre. <b>Un nouveau Big Bang commence.</b>`;
    this.el.endingStats.innerHTML = [
      ['Tokens produits', fmt(s.lifetimeTokens)],
      ['Modèle final', g.model.name],
      ['Univers consommé', (s.universeConsumed * 100).toFixed(2) + '%'],
      ['Intelligence atteinte', fmt(s.intelligence) + '×'],
      ['Temps de jeu', mins + ' min'],
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
      <p><b>Allocation :</b> dès la phase 2, répartissez votre compute entre Service, Recherche, Auto-amélioration et Récolte de matière.</p>
      <p><b>Événements :</b> pannes, régulations, pénuries… chaque décision compte.</p>
      <p><b>Astuce :</b> le bouton <b>⏩</b> accélère la simulation. Sauvegarde automatique toutes les 10 s.</p>
      <p class="text-muted">Inspiré de « Universal Paperclips ». Données de prix/IA basées sur des faits réels (2019-2026).</p>`;
  }
}
