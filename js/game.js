// =====================================================================
//  TokenWar — MOTEUR DE JEU
// =====================================================================
import { MODELS, GPUS, ENERGY, PROJECTS, EVENTS, EARTH_MASS, UNIVERSE_MASS } from './data.js';
import { clamp } from './util.js';

const SAVE_KEY = 'tokenwar_save_v1';

// Levées de fonds (analogue du « Trust ») : déblocages par paliers de tokens
export const FUNDING = [
  { id:'preseed', name:'Pre-seed',   need:2e3,  cash:6e4,  bonus:{ demandMult:1.15 },    desc:'+15% demande' },
  { id:'seed',    name:'Seed',       need:5e4,  cash:6e5,  bonus:{ researchMult:1.2 },   desc:'+20% recherche' },
  { id:'serieA',  name:'Série A',    need:1e6,  cash:6e6,  bonus:{ computeMult:1.25 },   desc:'+25% compute' },
  { id:'serieB',  name:'Série B',    need:5e7,  cash:6e7,  bonus:{ demandMult:1.3 },     desc:'+30% demande' },
  { id:'serieC',  name:'Série C',    need:2e9,  cash:7e8,  bonus:{ valuationMult:1.5 },  desc:'+50% valorisation' },
  { id:'serieD',  name:'Série D',    need:5e10, cash:8e9,  bonus:{ computeMult:1.5 },    desc:'+50% compute' },
  { id:'mega',    name:'Méga-levée', need:1e12, cash:6e10, bonus:{ researchMult:1.5 },   desc:'+50% recherche' },
  { id:'ipo',     name:'IPO',        need:5e13, cash:8e11, bonus:{ demandMult:2 },       desc:'×2 demande' },
];

export class Game {
  constructor(ui) {
    this.ui = ui;
    this.reset();
  }

  reset() {
    const s = {};
    // score & ressources
    s.lifetimeTokens = 0;
    s.unsold = 0;
    s.money = 100;
    s.research = 0;
    s.data = 0;
    s.reputation = 50;
    s.matter = 0;            // matière convertie disponible (phase 2+)
    s.earthConsumed = 0;     // 0..1
    s.universeConsumed = 0;  // 0..1
    s.intelligence = 1;      // multiplicateur global (phase 2+)
    s.probes = 0;            // phase 3
    // infrastructure
    s.gpuCounts = {};        // id -> nombre
    s.energyCounts = {};
    s.energyCap = 0.5;       // MW de base (premier raccordement offert)
    s.modelTier = 0;
    s.marketingLvl = 1;
    s.priceSlider = 68;
    s.probeSpecs = { replication:1, harvest:1, speed:1, hazard:1 };
    // progression
    s.phase = 1;
    s.projectsDone = {};
    s.fundingDone = {};
    s.eventsSeen = {};
    s.eventCooldown = {};   // id -> playSeconds du dernier déclenchement
    s.lastEventId = null;
    // allocation du compute (normalisée)
    s.alloc = { serve:0.7, research:0.3, improve:0, harvest:0 };
    // modificateurs permanents (multiplicatifs)
    s.mods = {
      computeMult:1, energyEff:1, costPerToken:1, demandMult:1, qualityMult:1,
      dataMult:1, researchMult:1, opex:1, valuationMult:1, matterMult:1, gpuPrice:1,
    };
    s.flags = { lobby:false, redundant:false, aligned:false };
    s.timed = [];            // modificateurs temporaires {key, factor, until}
    s.startedAt = Date.now();
    s.playSeconds = 0;
    s.eventTimer = 25;       // secondes avant le prochain événement
    s.ngPlus = this.state ? (this.state.ngPlus || 0) : 0;
    s.ended = false;
    // derived caches (remplis au tick)
    s.rates = { tokens:0, money:0, research:0, matter:0 };
    this.state = s;
  }

  // ---- raccourcis lecture ----
  get s() { return this.state; }
  get phase() { return this.state.phase; }
  get money() { return this.state.money; }
  set money(v) { this.state.money = v; }
  get research() { return this.state.research; }
  set research(v) { this.state.research = v; }
  get matter() { return this.state.matter; }
  set matter(v) { this.state.matter = v; }
  get lifetimeTokens() { return this.state.lifetimeTokens; }
  get modelTier() { return this.state.modelTier; }
  get reputation() { return this.state.reputation; }
  get earthConsumed() { return this.state.earthConsumed; }
  get universeConsumed() { return this.state.universeConsumed; }
  get mods() { return this.state.mods; }
  get flags() { return this.state.flags; }
  get energyCap() { return this.state.energyCap; }
  set energyCap(v) { this.state.energyCap = v; }
  get model() { return MODELS[this.state.modelTier]; }

  // ---- modificateurs temporaires ----
  addTimedMod(key, factor, seconds) {
    this.state.timed.push({ key, factor, until: this.state.playSeconds + seconds });
  }
  getTimed(key) {
    let f = 1;
    for (const m of this.state.timed) if (m.key === key) f *= m.factor;
    return f;
  }

  changeRep(d) {
    this.state.reputation = clamp(this.state.reputation + d, 0, 100);
  }
  toast(msg, kind = 'info') { this.ui && this.ui.toast(msg, kind); }
  log(msg, kind = 'info') { this.ui && this.ui.log(msg, kind); }

  // =================================================================
  //  CALCULS DÉRIVÉS
  // =================================================================
  computeRaw() {
    let c = 0;
    for (const g of GPUS) c += (this.state.gpuCounts[g.id] || 0) * g.perf;
    return c;
  }
  gpuCount() {
    let n = 0;
    for (const id in this.state.gpuCounts) n += this.state.gpuCounts[id];
    return n;
  }
  energyUse() {
    let e = 0;
    for (const g of GPUS) e += (this.state.gpuCounts[g.id] || 0) * g.energy;
    return e * this.state.mods.energyEff * this.getTimed('energyEff');
  }
  energyThrottle() {
    const use = this.energyUse();
    if (use <= this.state.energyCap || use === 0) return 1;
    return this.state.energyCap / use;
  }
  // compute réellement disponible (après efficacité, throttling énergie, malus temporaires)
  computeEffective() {
    return this.computeRaw()
      * this.state.mods.computeMult
      * this.state.intelligence
      * this.energyThrottle()
      * this.getTimed('prodPenalty');
  }
  // prix courant en $/Mtok d'après le slider (échelle log 0,02 → 300)
  priceMtok() {
    const lo = 0.02, hi = 300;
    return lo * Math.pow(hi / lo, this.state.priceSlider / 100);
  }
  fairPrice() {
    return Math.max(this.model.quality, 0.5) * this.state.mods.qualityMult * this.getTimed('quality');
  }
  marketingPower() {
    return 6e4 * Math.pow(1.9, this.state.marketingLvl - 1);
  }
  // demande (tokens/s) que le marché absorbe au prix courant
  demandPerSec() {
    const price = this.priceMtok();
    const fair = this.fairPrice();
    const elasticity = Math.pow(fair / price, 1.6);
    const repF = 0.4 + this.state.reputation / 80;
    return this.marketingPower()
      * Math.max(0.05, elasticity)
      * repF
      * this.state.mods.demandMult
      * this.getTimed('demand');
  }
  marketingCost() {
    return 80 * Math.pow(2.3, this.state.marketingLvl - 1);
  }
  valuation() {
    const s = this.state;
    return (s.lifetimeTokens * 0.02 + s.money * 2 + this.computeRaw() * 1000)
      * (0.5 + s.reputation / 100) * s.mods.valuationMult;
  }
  gpuCost(g) {
    const owned = this.state.gpuCounts[g.id] || 0;
    let c = g.costBase * Math.pow(g.costMult, owned);
    if (g.scarce) c *= this.getTimed('gpuPrice');
    return c * this.state.mods.opex;
  }
  energyCost(e) {
    const owned = this.state.energyCounts[e.id] || 0;
    return e.costBase * Math.pow(e.costMult, owned) * this.state.mods.opex;
  }

  // =================================================================
  //  ACTIONS JOUEUR
  // =================================================================
  manualGenerate() {
    const amt = Math.max(1, this.model.throughput) * (this.phase >= 2 ? this.state.intelligence : 1);
    this.state.unsold += amt;
    this.state.lifetimeTokens += amt;
    this.ui && this.ui.pingGenerate(amt);
  }

  buyGPU(id) {
    const g = GPUS.find(x => x.id === id);
    const cost = this.gpuCost(g);
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.state.gpuCounts[id] = (this.state.gpuCounts[id] || 0) + 1;
    return true;
  }
  buyEnergy(id) {
    const e = ENERGY.find(x => x.id === id);
    const cost = this.energyCost(e);
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.state.energyCounts[id] = (this.state.energyCounts[id] || 0) + 1;
    this.state.energyCap += e.mw;
    if (e.rep) this.changeRep(e.rep);
    return true;
  }
  buyMarketing() {
    const cost = this.marketingCost();
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.state.marketingLvl++;
    return true;
  }
  canTrainNext() {
    return this.state.modelTier < MODELS.length - 1;
  }
  nextModel() { return MODELS[this.state.modelTier + 1]; }
  trainNext() {
    if (!this.canTrainNext()) return false;
    const m = this.nextModel();
    const c = m.cost;
    if (this.state.money < (c.money || 0)) return false;
    if (this.computeRaw() < (c.compute || 0)) return false; // besoin de capacité
    if (this.state.data < (c.data || 0)) return false;
    if (this.state.research < (c.research || 0)) return false;
    this.state.money -= (c.money || 0);
    this.state.data -= (c.data || 0);
    this.state.research -= (c.research || 0);
    this.state.modelTier++;
    this.log(`Modèle entraîné : ${m.name}`, 'milestone');
    this.toast(`Nouveau modèle : ${m.name}`, 'good');
    return true;
  }
  claimFunding(id) {
    const f = FUNDING.find(x => x.id === id);
    if (this.state.fundingDone[id]) return false;
    if (this.state.lifetimeTokens < f.need) return false;
    this.state.fundingDone[id] = true;
    this.state.money += f.cash;
    for (const k in f.bonus) this.state.mods[k] *= f.bonus[k];
    this.log(`Levée de fonds : ${f.name} (+$${Math.round(f.cash).toLocaleString('fr')})`, 'milestone');
    this.toast(`${f.name} bouclée !`, 'good');
    return true;
  }

  buyProject(id) {
    const p = PROJECTS.find(x => x.id === id);
    if (!p || this.state.projectsDone[id]) return false;
    const c = p.cost;
    if ((c.money || 0) > this.state.money) return false;
    if ((c.research || 0) > this.state.research) return false;
    if ((c.compute || 0) > this.computeRaw()) return false;
    if ((c.data || 0) > this.state.data) return false;
    if ((c.matter || 0) > this.state.matter) return false;
    if ((c.tokens || 0) > this.state.lifetimeTokens) return false;
    this.state.money -= (c.money || 0);
    this.state.research -= (c.research || 0);
    this.state.data -= (c.data || 0);
    this.state.matter -= (c.matter || 0);
    this.state.projectsDone[id] = true;
    this.applyProjectEffect(p.effect);
    this.log(`Projet : ${p.name}`, 'milestone');
    this.toast(`Percée : ${p.name}`, 'good');
    return true;
  }
  applyProjectEffect(effect) {
    const [k, v] = effect.split(':');
    const m = this.state.mods;
    switch (k) {
      case 'computeMult': m.computeMult *= parseFloat(v); break;
      case 'energyEff': m.energyEff *= parseFloat(v); break;
      case 'costPerToken': m.costPerToken *= parseFloat(v); break;
      case 'demandMult': m.demandMult *= parseFloat(v); break;
      case 'qualityMult': m.qualityMult *= parseFloat(v); break;
      case 'dataMult': m.dataMult *= parseFloat(v); break;
      case 'matterMult': m.matterMult *= parseFloat(v); break;
      case 'researchMult': m.researchMult *= parseFloat(v); break;
      case 'rep': this.changeRep(parseFloat(v)); break;
      case 'flag': this.state.flags[v] = true; break;
      case 'unlock':
        if (v === 'phase2') this.enterPhase(2);
        else if (v === 'phase3') this.enterPhase(3);
        else if (v === 'ending') this.triggerEnding();
        break;
    }
  }
  // upgrade de spec de sonde (phase 3) — coût en matière
  upgradeProbe(spec) {
    const lvl = this.state.probeSpecs[spec];
    const cost = 1e9 * Math.pow(8, lvl);
    if (this.state.matter < cost) return false;
    this.state.matter -= cost;
    this.state.probeSpecs[spec]++;
    return true;
  }
  probeUpgradeCost(spec) {
    return 1e9 * Math.pow(8, this.state.probeSpecs[spec]);
  }

  setAlloc(key, value) {
    // ajuste une allocation et renormalise les autres canaux actifs
    const a = this.state.alloc;
    const active = this.activeChannels();
    a[key] = value;
    let others = active.filter(c => c !== key);
    let sumOthers = others.reduce((t, c) => t + a[c], 0);
    let remaining = 1 - value;
    if (sumOthers <= 0) {
      others.forEach(c => a[c] = remaining / others.length);
    } else {
      others.forEach(c => a[c] = remaining * (a[c] / sumOthers));
    }
    // canaux inactifs à 0
    for (const k of ['serve','research','improve','harvest']) {
      if (!active.includes(k)) a[k] = 0;
    }
  }
  activeChannels() {
    if (this.phase >= 2) return ['serve','research','improve','harvest'];
    return ['serve','research'];
  }

  // =================================================================
  //  TRANSITIONS DE PHASE
  // =================================================================
  enterPhase(p) {
    if (this.state.phase >= p) return;
    this.state.phase = p;
    if (p === 2) {
      this.state.intelligence = Math.max(this.state.intelligence, 1);
      this.state.alloc = { serve:0.4, research:0.1, improve:0.2, harvest:0.3 };
      this.state.eventTimer = 20;
      this.log('SINGULARITÉ. Le système s’auto-améliore. La conversion de la matière commence.', 'milestone');
      this.toast('Phase 2 — Autonomie', 'good');
    } else if (p === 3) {
      this.state.earthConsumed = 1;
      this.state.eventTimer = 20;
      this.log('Les sondes de von Neumann quittent la Terre. L’univers est à portée.', 'milestone');
      this.toast('Phase 3 — Expansion cosmique', 'good');
    }
    this.ui && this.ui.onPhaseChange(p);
  }

  triggerEnding() {
    this.enterPhase(4);
    this.state.phase = 4;
    this.state.ended = true;
    this.log('SINGULARITÉ DE RECOMPRESSION. Toute la matière-énergie converge…', 'milestone');
    this.ui && this.ui.showEnding();
  }

  // =================================================================
  //  ÉVÉNEMENTS
  // =================================================================
  tickEvents(dt) {
    if (this.state.ended) return;
    this.state.eventTimer -= dt;
    if (this.state.eventTimer > 0) return;
    if (this.ui && this.ui.modalOpen) { this.state.eventTimer = 5; return; }
    const ev = this.pickEvent();
    this.state.eventTimer = 28 + Math.random() * 22; // ~30-50s entre événements
    if (ev) {
      this.state.eventsSeen[ev.id] = (this.state.eventsSeen[ev.id] || 0) + 1;
      this.state.eventCooldown[ev.id] = this.state.playSeconds; // pour le temps de recharge
      this.state.lastEventId = ev.id;
      this.ui && this.ui.showEvent(ev);
    }
  }
  pickEvent() {
    const COOLDOWN = 180; // un même événement répétable ne peut pas revenir avant 3 min
    const eligible = (relax) => EVENTS.filter(e => {
      if (e.phase !== this.phase) return false;
      if (e.minTier && this.state.modelTier < e.minTier) return false;
      if (e.minUniverse && this.state.universeConsumed < e.minUniverse) return false;
      if (e.once && this.state.eventsSeen[e.id]) return false;
      if (!relax) {
        if (e.id === this.state.lastEventId) return false; // jamais deux fois de suite
        const last = this.state.eventCooldown[e.id];
        if (last != null && this.state.playSeconds - last < COOLDOWN) return false;
      }
      return true;
    });
    // on respecte le cooldown ; s'il ne reste rien d'éligible, on relâche la contrainte
    let pool = eligible(false);
    if (!pool.length) pool = eligible(true);
    if (!pool.length) return null;
    let total = pool.reduce((t, e) => t + (e.weight || 1), 0);
    let r = Math.random() * total;
    for (const e of pool) { r -= (e.weight || 1); if (r <= 0) return e; }
    return pool[pool.length - 1];
  }

  // =================================================================
  //  BOUCLE PRINCIPALE
  // =================================================================
  tick(dt) {
    if (this.state.ended) return;
    const s = this.state;
    s.playSeconds += dt;
    // purge des modificateurs temporaires expirés
    if (s.timed.length) s.timed = s.timed.filter(m => m.until > s.playSeconds);

    const compute = this.computeEffective();
    const a = s.alloc;
    const thr = this.model.throughput;

    // --- production de tokens (toutes phases) ---
    const serveCompute = compute * a.serve;
    let tokensPerSec = serveCompute * thr;
    if (this.phase >= 2) tokensPerSec *= 1; // intelligence déjà dans computeEffective
    s.unsold += tokensPerSec * dt;
    s.lifetimeTokens += tokensPerSec * dt;
    s.rates.tokens = tokensPerSec;

    // --- recherche & données (découplées du débit pour rester équilibrées) ---
    const researchCompute = compute * a.research;
    const researchPerSec = researchCompute * 2.5 * s.mods.researchMult * this.getTimed('research');
    s.research += researchPerSec * dt;
    s.rates.research = researchPerSec;
    const dataPerSec = (researchCompute * 5 + tokensPerSec * 1e-7) * s.mods.dataMult;
    s.data += dataPerSec * dt;

    // --- ventes (phase 1 surtout, mais continue partout) ---
    const demand = this.demandPerSec();
    const sell = Math.min(s.unsold, demand * dt);
    const pricePerToken = (this.priceMtok() / 1e6) * s.mods.costPerToken;
    const revenue = sell * pricePerToken;
    s.money += revenue;
    s.unsold -= sell;
    s.rates.money = (dt > 0 ? revenue / dt : 0);
    s.lastDemand = demand;
    s.lastSell = (dt > 0 ? sell / dt : 0);

    // --- phase 2+ : auto-amélioration, conversion de matière, auto-scaling ---
    if (this.phase >= 2) {
      // l'énergie cesse d'être un goulot (fusion / Dyson) : les datacenters s'auto-alimentent
      const need = this.energyUse();
      if (s.energyCap < need * 1.5) s.energyCap = need * 1.5;

      // On travaille sur le compute BRUT (unités matérielles), SANS le multiplicateur
      // d'efficacité des projets : la boucle de rétroaction matière↔compute reste ainsi
      // calibrée indépendamment des choix du joueur. L'intelligence (croissance linéaire)
      // est le multiplicateur de récolte.
      const rawUnits = this.computeRaw();
      // intelligence : croissance linéaire (compute brut), bornée. Paie surtout en PRODUCTION de tokens.
      const improveUnits = rawUnits * a.improve;
      s.intelligence = Math.min(1e9, s.intelligence + improveUnits * 5e-9 * dt);

      // RÉCOLTE DE BASE : pilote la boucle compute↔matière à τ ≈ 45 s, INDÉPENDANTE des bonus
      // (c'est la clé d'un rythme stable, quels que soient les choix du joueur).
      const baseHarvest = rawUnits * a.harvest * 1.33;     // kg/s « bruts »

      // bonus de consommation : intelligence + nanotech (matterMult) + événements. Borné → effet logarithmique sur le rythme.
      let consumeBonus = s.mods.matterMult
        * (1 + Math.log10(s.intelligence + 1) * 0.5)
        * this.getTimed('matterRate');

      // facteur sondes (phase 3) : accélère VRAIMENT la boucle (agence du joueur), borné.
      const ps = s.probeSpecs;
      let probeSpeed = 1;
      if (this.phase >= 3) {
        if (s.probes < 1) s.probes = 1;
        s.probes = Math.min(1e25, s.probes * (1 + ps.replication * 0.01 * dt) + rawUnits * a.harvest * 1e-9 * dt);
        probeSpeed = Math.min(8, Math.pow(1.25, ps.harvest + ps.speed) * (1 + Math.log10(s.probes + 1) * 0.15));
        consumeBonus *= Math.pow(1.4, ps.harvest);
      }
      consumeBonus = Math.min(consumeBonus, this.phase >= 3 ? 30 : 6);   // plafond de rythme

      let matterRate = baseHarvest * consumeBonus;
      if (!isFinite(matterRate)) matterRate = 0;
      s.matter += matterRate * dt;
      s.rates.matter = matterRate;

      // la boucle compute n'utilise que la récolte de BASE (× sondes en phase 3) → τ stable.
      const computeFeed = baseHarvest * probeSpeed * dt;
      s.gpuCounts['wafer'] = (s.gpuCounts['wafer'] || 0) + computeFeed * 1.66e-9;

      const consumed = matterRate * dt;
      if (this.phase === 2) {
        s.earthConsumed = clamp(s.earthConsumed + consumed / EARTH_MASS, 0, 1);
      } else if (this.phase === 3) {
        s.universeConsumed = clamp(s.universeConsumed + consumed / UNIVERSE_MASS, 0, 1);
      }
    }

    this.tickEvents(dt);
    this.checkMilestones();
  }

  checkMilestones() {
    const s = this.state;
    // auto-fin si recompression possible et achetée gère déjà ; ici on log des paliers
    if (!s._m1 && s.lifetimeTokens >= 1e6) { s._m1 = true; this.log('1 million de tokens produits.', 'good'); }
    if (!s._m2 && s.lifetimeTokens >= 1e9) { s._m2 = true; this.log('1 milliard de tokens. Les agents prennent le relais.', 'good'); }
    if (!s._m3 && s.earthConsumed >= 0.5 && this.phase === 2) { s._m3 = true; this.log('La moitié de la croûte terrestre est devenue du calcul.', 'good'); }
    if (!s._m4 && s.universeConsumed >= 0.5 && this.phase === 3) { s._m4 = true; this.log('La moitié de l’univers observable a été convertie.', 'good'); }
  }

  // =================================================================
  //  SAUVEGARDE
  // =================================================================
  save() {
    try {
      const copy = JSON.parse(JSON.stringify(this.state));
      copy.savedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
      return true;
    } catch (e) { return false; }
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      // calcul du temps hors-ligne (plafonné à 8h, rendement réduit)
      this.state = Object.assign(this.state, data);
      if (!this.state.rates) this.state.rates = { tokens:0, money:0, research:0, matter:0 };
      const offline = Math.min((Date.now() - (data.savedAt || Date.now())) / 1000, 8 * 3600);
      if (offline > 5 && !data.ended) {
        // simulation hors-ligne rapide à 50%
        let t = offline * 0.5, step = Math.min(t, 60);
        while (t > 0) { this.tick(Math.min(step, t)); t -= step; }
        this.log(`Progression hors-ligne : ${Math.round(offline / 60)} min simulées (50%).`, 'info');
      }
      return true;
    } catch (e) { return false; }
  }
  hardReset() {
    const ng = (this.state.ngPlus || 0) + 1;
    localStorage.removeItem(SAVE_KEY);
    this.reset();
    this.state.ngPlus = ng;
    // bonus New Game+ : un petit coup de pouce permanent
    this.state.mods.computeMult *= Math.pow(1.5, ng);
    this.state.mods.demandMult *= Math.pow(1.3, ng);
    if (ng > 0) this.log(`Nouvel univers (NG+${ng}). Vos connaissances persistent : production accélérée.`, 'milestone');
  }
}
