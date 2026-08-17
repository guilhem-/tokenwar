// =====================================================================
//  TokenWar — MOTEUR DE JEU
// =====================================================================
import { MODELS, GPUS, ENERGY, PROJECTS, EVENTS, INFRA, EARTH_MASS, UNIVERSE_MASS,
         START_YEAR, SECONDS_PER_YEAR, HEADLINES,
         EMPLOYEES, BASE_HEADCOUNT, HR_HEADCOUNT, BASE_MARKETING, ELEC_PRICE_MWH, COLO, AUTOMATIONS, ACHIEVEMENTS, ADDENDUM, SPACE_DC,
         BUILD, INFLATION, INFLATION_TAIL, CRISES, CRISIS_MAX_LOSS, CRISIS_DURATION,
         HIRE_COST, UNPAID_QUIT_DAYS, UNPAID_QUIT_EVERY, BASE_GRID_MW, OPTIMS,
         PROGRAMS, DYSON_BOOST, DYSON_BOOST_MAX, CRYPTO_CYCLE, CRYPTO_UNLOCK,
         CHRONICLE, EXTRAVAGANCES, SOVEREIGN } from './data.js';
import { clamp } from './util.js';
import { t, td, months as i18nMonths, intlLocale, decimalSep } from './i18n.js';

const SAVE_KEY = 'tokenwar_save_v1';
const SAVE_VERSION = 5;   // incrémenter à chaque changement de format ; sanitize() gère les migrations douces

// Levées de fonds (analogue du « Trust ») : déblocages par paliers de tokens
// Les levées sont gardées par les tokens cumulés ET par l'année (les tours de table
// s'étalent dans le temps), pour que le capital arrive quand le matériel existe.
export const FUNDING = [
  { id:'preseed', name:'Pre-seed',   year:2019, need:2e3,  cash:6e4,  bonus:{ demandMult:1.15 },    desc:'+15% demande' },
  { id:'seed',    name:'Seed',       year:2020, need:5e4,  cash:6e5,  bonus:{ researchMult:1.2 },   desc:'+20% recherche' },
  { id:'serieA',  name:'Série A',    year:2021, need:1e6,  cash:6e6,  bonus:{ computeMult:1.25 },   desc:'+25% compute' },
  { id:'serieB',  name:'Série B',    year:2022, need:5e7,  cash:6e7,  bonus:{ demandMult:1.3 },     desc:'+30% demande' },
  { id:'serieC',  name:'Série C',    year:2023, need:2e9,  cash:7e8,  bonus:{ valuationMult:1.5 },  desc:'+50% valorisation' },
  { id:'serieD',  name:'Série D',    year:2024, need:5e10, cash:8e9,  bonus:{ computeMult:1.5 },    desc:'+50% compute' },
  { id:'mega',    name:'Méga-levée', year:2025, need:1e12, cash:6e10, bonus:{ researchMult:1.5 },   desc:'+50% recherche' },
  { id:'ipo',     name:'IPO',        year:2026, need:5e13, cash:8e11, bonus:{ demandMult:2 },       desc:'×2 demande' },
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
    s.money = 1500;          // petit capital de départ (vos économies) pour amorcer l'infra + 1ʳᵉ carte
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
    s.infraCounts = { realestate:1, datacenter:1, rack:1, server:1 }; // chaîne d'hébergement (1 de chaque offert)
    s.rentedDC = 0;          // datacenters loués (coût journalier)
    s.rentedSpace = 0;       // espaces de colocation loués (coût journalier)
    s.employees = { hr:0, rnd:0, marketer:0, ops:0, data:0 }; // ressources humaines
    s.stock = { invested:0, basis:0, risk:1, index:1, hist:[] };  // position, risque, INDICE de marché et son historique
    s.stockUnlocked = false; // la bourse se débloque à 100 000$ de trésorerie
    // automatisations (auto-clickers payants, activables/désactivables)
    s.auto = { click:{ owned:false, on:true }, gpu:{ owned:false, on:true }, infra:{ owned:false, on:true }, energy:{ owned:false, on:true } };
    s.autoItems = { gpu:{}, energy:{}, infra:{} }; // auto-achat PAR élément (id -> bool), mémorisé individuellement
    s.autoTimer = 0;
    // chantiers en cours : rien n'est instantané. {f:'gpu'|'infra'|'energy', id, t0, t1}
    s.builds = [];
    s.buildSeq = 0;
    // crise en cours (incident qui saigne la trésorerie tant qu'il n'est pas repéré)
    s.crisis = null;
    s.lastCrisisId = null;
    s.crisisTimer = 100;     // secondes avant le premier incident possible
    s.crisisSeen = {};       // id -> nombre d'occurrences (pour ne pas répéter)
    s.crisisLost = 0;        // total perdu en incidents (statistique de fin)
    s.achievements = {};     // succès débloqués (id -> true)
    s.addendum = false;      // « Directives permanentes » achetées
    s.addendumBlocks = 0;    // lots de 5 directives payés (il faut repayer pour étendre)
    s.optims = {};           // optimisations récurrentes : id -> {n, nextAt}
    // programmes par étapes (fusion, sphère de Dyson) : id -> {stage, at, n}
    s.programs = {};
    // second marché, bien plus violent que la Bourse
    s.crypto = { invested:0, basis:0, price:1, unlocked:false, hist:[] };
    s.chronicle = {};        // id|année -> déjà publié
    s.sovereign = { status:'none', at:0 };   // rachat de dette souveraine
    s.autoChoices = {};      // eventId -> index du choix à appliquer automatiquement
    s.spaceDC = { status:'none', orderedAt:0, statusAt:0, paid:0 }; // datacenter orbital : none/building/delayed/bankrupt
    s.energyCounts = {};
    s.energyCap = BASE_GRID_MW; // 10 kW : le compteur du garage, offert
    s.baseGridMW = BASE_GRID_MW; // marqueur de règle : permet de migrer les vieilles sauvegardes
    s.unpaidDays = 0;        // jours d'arriérés de salaire (30 → les gens partent)
    s.quitDebt = 0;          // départs accumulés en attente d'être appliqués
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
    s.lastEventAt = -100;    // pour garantir un délai minimal entre deux événements
    // presse / calendrier
    s.headlineTimer = 6;
    s.headlines = [];       // fil de titres {text, p, date}
    s.headlinesFired = {};  // titres à effet, jouables une seule fois
    s.lastHeadlineText = null;
    s.recentHeadlines = []; // mémoire courte : on ne réutilise pas un titre récent
    s._freshModelUntil = 0; // pour les titres réactifs à un nouvel entraînement
    s._freshModel = false;
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
  get _freshModel() { return this.state._freshModel; }

  // ---- modificateurs temporaires ----
  addTimedMod(key, factor, seconds) {
    this.state.timed.push({ key, factor, until: this.state.playSeconds + seconds });
  }
  getTimed(key) {
    let f = 1;
    for (const m of this.state.timed) if (m.key === key) f *= m.factor;
    return f;
  }

  // nombre décimal au format de la langue (1,10 en français, 1.10 en anglais)
  decimal(v, digits = 2) { return v.toFixed(digits).replace('.', decimalSep()); }

  changeRep(d) {
    this.state.reputation = clamp(this.state.reputation + d, 0, 100);
  }

  // ---- calendrier de simulation ----
  simYear() { return START_YEAR + this.state.playSeconds / SECONDS_PER_YEAR; }
  simYearInt() { return Math.floor(this.simYear()); }
  dateLabel() {                                  // date au jour près (jour mois année)
    const y = this.simYear();
    const year = Math.floor(y);
    const dayOfYear = Math.min(364, Math.floor((y - year) * 365));
    const d = new Date(2001, 0, 1 + dayOfYear);  // 2001 : année non bissextile, pour jour↔mois
    return `${d.getDate()} ${i18nMonths()[d.getMonth()]} ${year}`;
  }
  // un élément (GPU/énergie/modèle) est-il sorti à la date courante ?
  dateUnlocked(item) {
    if (item.needsProgram && !this.programDone(item.needsProgram)) return false;
    return !item.year || this.simYear() >= item.year;
  }
  toast(msg, kind = 'info') { this.ui && this.ui.toast(msg, kind); }
  log(msg, kind = 'info') { this.ui && this.ui.log(msg, kind); }

  // =================================================================
  //  INFLATION — la valeur de l'argent se dégrade avec les années.
  //  L'indice multiplie TOUT ce qui se paie (matériel, salaires, énergie,
  //  loyers, licences) ainsi que le prix que le marché accepte de payer.
  //  La trésorerie dormante, elle, ne suit pas : garder du cash coûte cher.
  // =================================================================
  inflRate(year) {                                  // taux annuel en vigueur cette année-là
    let r = INFLATION_TAIL;
    for (const [from, rate] of INFLATION) if (year >= from) r = rate;
    return r;
  }
  inflIndex() {
    const y = this.simYear();
    if (y <= START_YEAR) return 1;
    let idx = 1;
    for (let year = START_YEAR; year < Math.floor(y); year++) idx *= 1 + this.inflRate(year);
    idx *= Math.pow(1 + this.inflRate(Math.floor(y)), y - Math.floor(y)); // année en cours au prorata
    return idx;
  }
  // perte de pouvoir d'achat cumulée d'un dollar gardé depuis 2019 (0 → 1)
  purchasingLoss() { return 1 - 1 / this.inflIndex(); }

  // =================================================================
  //  CHANTIERS — tout objet commandé met un temps à être opérationnel,
  //  d'autant plus long qu'il est complexe (voir BUILD dans data.js).
  // =================================================================
  buildSeconds(family, item) {
    if (this.phase >= 2) return 0;                  // l'ASI assemble plus vite qu'elle ne décide
    if (item && item.build != null) return item.build;
    const cfg = BUILD[family] || BUILD.gpu;
    const price = Math.max(0, (item && item.cost) || (item && item.costBase) || 0);
    return Math.min(cfg.cap, cfg.base + cfg.k * Math.log10(1 + price / 1000));
  }
  queueBuild(family, id, item) {
    const sec = this.buildSeconds(family === 'infra' ? id : family, item);
    if (sec <= 0) return this.finishBuild({ f: family, id });   // instantané
    this.state.builds.push({ n: ++this.state.buildSeq, f: family, id,
      t0: this.state.playSeconds, t1: this.state.playSeconds + sec });
    return true;
  }
  pendingCount(family, id) {
    let n = 0;
    for (const b of this.state.builds) if (b.f === family && (id == null || b.id === id)) n++;
    return n;
  }
  buildProgress(family, id) {                       // 0..1 du chantier le plus avancé, ou null
    let best = null;
    for (const b of this.state.builds) {
      if (b.f !== family || b.id !== id) continue;
      const p = (this.state.playSeconds - b.t0) / Math.max(0.001, b.t1 - b.t0);
      if (best === null || p > best) best = p;
    }
    return best === null ? null : clamp(best, 0, 1);
  }
  finishBuild(b) {
    const s = this.state;
    if (b.f === 'gpu') s.gpuCounts[b.id] = (s.gpuCounts[b.id] || 0) + 1;
    else if (b.f === 'infra') s.infraCounts[b.id] = (s.infraCounts[b.id] || 0) + 1;
    else if (b.f === 'energy') {
      const e = ENERGY.find(x => x.id === b.id);
      s.energyCounts[b.id] = (s.energyCounts[b.id] || 0) + 1;
      s.energyCap += e.mw;
      if (e.rep) this.changeRep(e.rep);
    }
    return true;
  }
  tickBuilds() {
    const s = this.state;
    if (!s.builds.length) return;
    const done = s.builds.filter(b => s.playSeconds >= b.t1);
    if (!done.length) return;
    s.builds = s.builds.filter(b => s.playSeconds < b.t1);
    for (const b of done) this.finishBuild(b);
  }

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
    for (const it of INFRA) e += (this.infraCount(it.id) || 0) * (it.energy || 0); // datacenters, baies, serveurs
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
      * this.opsMult()                 // fiabilité apportée par les ingénieurs Ops
      * this.state.intelligence
      * this.energyThrottle()
      * this.getTimed('prodPenalty');
  }
  // prix courant en $/Mtok d'après le slider (échelle log 0,02 → 300)
  priceMtok() {
    const lo = 0.02, hi = 300;
    return lo * Math.pow(hi / lo, this.state.priceSlider / 100);
  }
  // prix accepté par le marché : il suit l'inflation (sinon la marge s'effondrerait
  // mécaniquement à mesure que les coûts montent).
  fairPrice() {
    return Math.max(this.model.quality, 0.5) * this.state.mods.qualityMult * this.getTimed('quality') * this.inflIndex();
  }
  marketingPower() {
    return 6e4 * Math.pow(1.9, this.state.marketingLvl - 1);
  }
  // tout prix libellé en dollars « de 2019 » converti en dollars courants
  moneyCost(base) { return (base || 0) * this.inflIndex(); }
  // retard technologique : paliers de modèles disponibles à cette date, non entraînés
  expectedTier() {
    let t = 0;
    for (let i = 0; i < MODELS.length; i++) if (this.simYear() >= MODELS[i].year) t = i;
    return t;
  }
  tierLag() { return Math.max(0, this.expectedTier() - this.state.modelTier); }
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
    return 50 * Math.pow(1.6, this.state.marketingLvl - 1) * this.inflIndex();
  }
  // prix optimal : le plus haut où la demande absorbe encore toute la production.
  // Utilisé par l'UI (indicatif) et par le bot de test (source unique de vérité).
  optimalPriceSlider() {
    const s = this.state;
    const fair = this.fairPrice();
    const prod = Math.max(this.computeEffective() * s.alloc.serve * this.model.throughput, 1);
    const repF = 0.4 + s.reputation / 80;
    const base = this.marketingPower() * repF * s.mods.demandMult;
    let price = fair * Math.pow(Math.max(base / prod, 0.02), 1 / 1.6);
    price = Math.max(0.02, Math.min(300, price));
    return 100 * Math.log(price / 0.02) / Math.log(15000);
  }
  valuation() {
    const s = this.state;
    return (s.lifetimeTokens * 0.02 + s.money * 2 + this.computeRaw() * 1000)
      * (0.5 + s.reputation / 100) * s.mods.valuationMult;
  }
  gpuCost(g) {
    let c = g.cost;                              // prix FIXE et réaliste (non exponentiel)
    if (g.scarce) c *= this.getTimed('gpuPrice'); // sauf flambée temporaire de pénurie
    // pendant les envolées crypto, les mineurs se disputent les mêmes cartes
    return c * this.state.mods.opex * this.inflIndex() * this.cryptoPressure();
  }
  // coût UNIQUE (capex) d'une source d'énergie — l'exploitation est facturée à part
  energyCost(e) {
    const owned = (this.state.energyCounts[e.id] || 0) + this.pendingCount('energy', e.id);
    return e.costBase * Math.pow(e.costMult, owned) * this.state.mods.opex * this.inflIndex();
  }

  // =================================================================
  //  ACTIONS JOUEUR
  // =================================================================
  // Une inférence manuelle est une vente « à la demande » : les tokens sont vendus
  // immédiatement au prix du marché (plafonné au prix juste — pas d'exploit de slider),
  // au lieu de tomber dans la production périssable.
  clickValue() {
    const amt = Math.max(1, this.model.throughput) * (this.phase >= 2 ? this.state.intelligence : 1);
    const price = Math.min(this.priceMtok(), this.fairPrice());
    return { amt, revenue: amt * (price / 1e6) * this.state.mods.costPerToken };
  }
  manualGenerate() {
    const { amt, revenue } = this.clickValue();
    this.state.lifetimeTokens += amt;
    if (this.phase < 2) this.state.money += revenue;   // en phase 2+, l'argent ne compte plus
    this.ui && this.ui.pingGenerate(amt);
  }

  // ---- chaîne d'hébergement : immobilier > datacenter > baie > serveur > GPU ----
  infraCount(id) { return this.state.infraCounts[id] || 0; }
  infraCost(item) {                              // prix FIXE (réaliste) ; le serveur suit la flambée mémoire
    let c = item.cost;
    if (item.eraPrice) { const y = this.simYear(); for (const [from, price] of item.eraPrice) if (y >= from) c = price; }
    return c * this.state.mods.opex * this.inflIndex();
  }
  capacityFor(childId) {                        // emplacements offerts par les parents
    const parent = INFRA.find(x => x.child === childId);
    if (!parent) return Infinity;               // l'immobilier n'a pas de parent
    let count = this.infraCount(parent.id);
    if (parent.id === 'datacenter') count += this.state.rentedDC || 0; // les datacenters loués comptent aussi
    let cap = count * parent.capacity;
    if (childId === 'rack') cap += (this.state.rentedSpace || 0) * COLO.racks; // colocation = baies louées
    return cap;
  }
  // les objets EN CHANTIER occupent déjà leur emplacement (on ne commande pas
  // deux serveurs pour la même place), mais n'offrent pas encore de capacité.
  usedFor(childId) {
    const family = childId === 'gpu' ? 'gpu' : 'infra';
    return (childId === 'gpu' ? this.gpuCount() : this.infraCount(childId)) + this.pendingCount(family, childId);
  }
  freeSlots(childId) { return this.capacityFor(childId) - this.usedFor(childId); }
  // Capacité PRÉVUE : celle en service plus celle déjà en chantier. Elle ne sert
  // jamais à autoriser un achat (il faut une place réelle), mais à DÉCIDER d'en
  // commander : sans elle, un acheteur automatique recommanderait en boucle tant
  // que la première unité n'est pas livrée.
  plannedCapacityFor(childId) {
    const parent = INFRA.find(x => x.child === childId);
    if (!parent) return Infinity;
    return this.capacityFor(childId) + this.pendingCount('infra', parent.id) * parent.capacity;
  }
  plannedFreeSlots(childId) { return this.plannedCapacityFor(childId) - this.usedFor(childId); }
  energyCapPlanned() {                          // MW en service + MW en construction
    let mw = this.state.energyCap;
    for (const b of this.state.builds) {
      if (b.f !== 'energy') continue;
      const e = ENERGY.find(x => x.id === b.id);
      if (e) mw += e.mw;
    }
    return mw;
  }
  hostingActive() { return this.phase < 2; }   // contrainte d'hébergement en phase 1 (l'ASI auto-construit ensuite)

  buyInfra(id) {
    const item = INFRA.find(x => x.id === id);
    if (this.hostingActive() && this.freeSlots(id) < 1) return false; // pas de place chez le parent
    const cost = this.infraCost(item);
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.queueBuild('infra', id, item);          // mise en service différée (chantier)
    return true;
  }
  canBuyInfra(id) {
    const item = INFRA.find(x => x.id === id);
    if (this.hostingActive() && this.freeSlots(id) < 1) return false;
    return this.state.money >= this.infraCost(item);
  }
  // ---- location de datacenter : pas de capex, mais un coût journalier ----
  rentDC() { this.state.rentedDC = (this.state.rentedDC || 0) + 1; return true; }
  unrentDC() {
    const r = this.state.rentedDC || 0;
    if (r <= 0) return false;
    const dc = INFRA.find(x => x.id === 'datacenter');
    // capacité restante = capacité actuelle (colocation incluse) moins ce datacenter
    const newCap = this.capacityFor('rack') - dc.capacity;
    if (this.usedFor('rack') > newCap) return false; // ne pas priver des baies installées
    this.state.rentedDC = r - 1;
    return true;
  }
  dcRentDaily() { return INFRA.find(x => x.id === 'datacenter').rentDaily; }
  // ---- location : datacenter entier + espace de colocation ----
  rentSpace() { this.state.rentedSpace = (this.state.rentedSpace || 0) + 1; return true; }
  unrentSpace() {
    const r = this.state.rentedSpace || 0;
    if (r <= 0) return false;
    const newCap = this.capacityFor('rack') - COLO.racks;
    if (this.usedFor('rack') > newCap) return false;
    this.state.rentedSpace = r - 1;
    return true;
  }
  rentDailyTotal() {                             // loyers ($/jour) : datacenters + colocation
    return ((this.state.rentedDC || 0) * this.dcRentDaily() + (this.state.rentedSpace || 0) * COLO.daily) * this.inflIndex();
  }

  // ---- RESSOURCES HUMAINES ----
  empCount(id) { return this.state.employees[id] || 0; }
  headcount() { return EMPLOYEES.reduce((t, e) => t + this.empCount(e.id), 0); }
  headcountCap() { return BASE_HEADCOUNT + this.empCount('hr') * HR_HEADCOUNT; }
  // recruter coûte : annonce, entretiens, poste de travail, intégration
  hireCost() { return this.moneyCost(HIRE_COST); }
  // les RH créent leur propre capacité → jamais bloqués par l'effectif ; les autres sont plafonnés
  canHire(id) {
    if (this.state.money < this.hireCost()) return false;
    return id === 'hr' || this.headcount() < this.headcountCap();
  }
  hire(id) {
    if (!this.canHire(id)) return false;
    this.state.money -= this.hireCost();
    this.state.employees[id] = this.empCount(id) + 1;
    return true;
  }
  fire(id) {
    if (this.empCount(id) < 1) return false;
    if (id === 'hr') {                           // ne pas licencier un RH si cela dépasserait la capacité
      const cap = BASE_HEADCOUNT + (this.empCount('hr') - 1) * HR_HEADCOUNT;
      if (this.headcount() - 1 > cap) return false;
    }
    this.state.employees[id]--;
    return true;
  }
  // ---- SALAIRES IMPAYÉS : au bout de 30 jours d'arriérés, on s'en va ----
  // (un départ n'est pas un licenciement : aucune garde-fou d'effectif ne s'applique)
  quitOne() {
    // part d'abord celui dont le poste est le mieux payé ailleurs
    const order = ['rnd', 'ops', 'data', 'marketer', 'hr'];
    for (const id of order) if (this.empCount(id) > 0) { this.state.employees[id]--; return EMPLOYEES.find(e => e.id === id); }
    return null;
  }
  tickPayroll(dt) {
    const s = this.state;
    const perDay = SECONDS_PER_YEAR / 365;
    if (this.headcount() < 1) { s.unpaidDays = 0; s.quitDebt = 0; return; }
    // arriérés : la trésorerie ne couvre plus les charges du jour
    if (s.money <= 0.5 && this.chargesPerSec() > 0) {
      s.unpaidDays += dt / perDay;
      if (!s._payWarned && s.unpaidDays >= 10) {
        s._payWarned = true;
        this.log(t('Les salaires ne sont plus payés. Passé 30 jours d’arriérés, l’équipe commencera à partir.'), 'bad');
        this.toast(t('⚠️ Salaires impayés'), 'bad');
      }
      const over = s.unpaidDays - UNPAID_QUIT_DAYS;
      if (over >= 0) {
        const due = 1 + Math.floor(over / UNPAID_QUIT_EVERY);   // 1 départ, puis 1 tous les 2 jours
        while (s.quitDebt < due) {
          s.quitDebt++;
          const who = this.quitOne();
          if (!who) break;
          this.changeRep(-1);
          this.log(t('{0} démissionne : {1} jours de salaire impayés.', td(who.name), Math.floor(s.unpaidDays)), 'bad');
          this.toast(t('👋 Départ : {0}', td(who.name)), 'bad');
        }
      }
    } else if (s.unpaidDays > 0) {
      if (s.unpaidDays >= 10) this.log(t('Arriérés de salaire réglés. L’équipe reste.'), 'good');
      s.unpaidDays = 0; s.quitDebt = 0; s._payWarned = false;
    }
  }
  marketingCap() { return BASE_MARKETING + this.empCount('marketer'); }   // plafond marketing
  rndMult() { return 1 + this.empCount('rnd') * 0.5; }                     // recherche ×(1+0.5/ing.)
  dataEmpMult() { return 1 + this.empCount('data') * 0.6; }
  opsMult() { return 1 + Math.min(0.5, this.empCount('ops') * 0.02); }     // +2%/ops, plafonné +50%
  // les salaires suivent l'inflation (indexation) — c'est la charge qui gonfle le plus vite
  salaryPerDay() { return EMPLOYEES.reduce((t, e) => t + this.empCount(e.id) * e.salary, 0) * this.inflIndex(); }

  // ---- AUTOMATISATIONS (auto-clickers payants) ----
  autoCost(a) { return this.moneyCost(a.cost); }
  buyAuto(id) {
    const a = AUTOMATIONS.find(x => x.id === id);
    const st = this.state.auto[id];
    const cost = this.autoCost(a);
    if (st.owned || this.state.money < cost) return false;
    this.state.money -= cost; st.owned = true; st.on = true;
    return true;
  }
  toggleAuto(id) { const st = this.state.auto[id]; if (!st.owned) return false; st.on = !st.on; return true; }
  // auto-achat ciblé sur UN élément précis (carte, source, niveau d'infra), mémorisé individuellement
  isAutoItem(family, id) { return !!(this.state.autoItems[family] && this.state.autoItems[family][id]); }
  toggleAutoItem(family, id) {
    if (!this.state.auto[family] || !this.state.auto[family].owned) return false;
    this.state.autoItems[family][id] = !this.isAutoItem(family, id);
    return true;
  }
  tickAuto(dt) {
    const s = this.state, au = s.auto;
    // inférence + achat des GPU sélectionnés : « par seconde »
    s.autoTimer += dt;
    let guard = 0;
    while (s.autoTimer >= 1 && guard++ < 100) {
      s.autoTimer -= 1;
      if (au.click.owned && au.click.on) this.manualGenerate();
      if (this.phase < 2 && au.gpu.owned && au.gpu.on) {
        for (const g of GPUS) if (this.isAutoItem('gpu', g.id) && this.canBuyGPU(g.id)) this.buyGPU(g.id);
      }
    }
    if (this.phase < 2) {
      // énergie : on achète les sources cochées dès que la conso dépasse la production
      if (au.energy.owned && au.energy.on) {
        for (const e of ENERGY) {
          if (!this.isAutoItem('energy', e.id)) continue;
          // on compte la capacité déjà en chantier : sinon on recommande en boucle
          if (this.energyUse() <= this.energyCapPlanned() * 0.98) break;
          if ((!e.phase || this.phase >= e.phase) && this.dateUnlocked(e) && s.money >= this.energyCost(e)) this.buyEnergy(e.id);
        }
      }
      // hébergement : on achète un niveau coché quand IL va devenir limitant
      if (au.infra.owned && au.infra.on) {
        for (const it of INFRA) {
          // idem : la capacité en chantier compte dans la décision
          if (this.isAutoItem('infra', it.id) && this.plannedFreeSlots(it.child) < 4 && this.canBuyInfra(it.id)) this.buyInfra(it.id);
        }
      }
    }
  }

  // ---- CHARGES JOURNALIÈRES (électricité + salaires + loyers) ----
  // L'ÉLECTRICITÉ se décompose en trois natures bien distinctes :
  //   · variable   — le MWh réellement soutiré, servi par ordre de mérite
  //                  (solaire/fusion/Dyson d'abord, gaz et réseau en dernier) ;
  //   · fixe (O&M) — exploitation, maintenance, personnel de la source. Dû même
  //                  à l'arrêt : une turbine froide coûte, un SMR encore plus ;
  //   · abonnement — proportionnel à la PUISSANCE SOUSCRITE sur le réseau.
  // (Le raccordement d'origine, offert, n'a pas d'abonnement : c'est le compteur
  //  du garage.)
  energyBill() {
    const infl = this.inflIndex();
    const caps = [];
    let fixed = 0, sub = 0;
    for (const e of ENERGY) {
      const n = this.state.energyCounts[e.id] || 0;
      if (n <= 0) continue;
      caps.push({ mw: n * e.mw, cost: (e.fuelMWh != null ? e.fuelMWh : ELEC_PRICE_MWH) });
      fixed += n * (e.omDaily || 0);
      if (e.subMWDay) sub += n * e.mw * e.subMWDay;
    }
    caps.push({ mw: BASE_GRID_MW, cost: 78 });    // raccordement de base (offert, sans abonnement)
    caps.sort((a, b) => a.cost - b.cost);
    let variable = 0, rem = this.energyUse();
    for (const c of caps) { if (rem <= 0) break; const u = Math.min(c.mw, rem); variable += u * 24 * c.cost; rem -= u; }
    return { variable: variable * infl, fixed: fixed * infl, sub: sub * infl,
             total: (variable + fixed + sub) * infl };
  }
  elecDaily() { return this.energyBill().total; }
  dailyCharges() {
    const e = this.energyBill();
    return { elec: e.total, elecVar: e.variable, elecFix: e.fixed, elecSub: e.sub,
             salary: this.salaryPerDay(), rent: this.rentDailyTotal() };
  }
  dailyTotal() { const c = this.dailyCharges(); return c.elec + c.salary + c.rent; }
  chargesPerSec() {
    return this.dailyTotal() / (SECONDS_PER_YEAR / 365);
  }
  dcRentPerSec() {                               // (conservé) loyer datacenters seul, par seconde
    return (this.state.rentedDC || 0) * this.dcRentDaily() / (SECONDS_PER_YEAR / 365);
  }

  // une carte sortie depuis plus de 5 ans n'est plus commercialisée (retirée du marché)
  discontinued(g) { return this.simYear() > g.year + 5; }
  buyGPU(id) {
    const g = GPUS.find(x => x.id === id);
    if (!this.dateUnlocked(g) || this.discontinued(g)) return false;
    if (this.hostingActive() && this.freeSlots('gpu') < 1) return false; // aucun emplacement serveur libre
    const cost = this.gpuCost(g);
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.queueBuild('gpu', id, g);               // réception, rackage, burn-in
    return true;
  }
  canBuyGPU(id) {
    const g = GPUS.find(x => x.id === id);
    if (!this.dateUnlocked(g) || this.discontinued(g)) return false;
    if (this.hostingActive() && this.freeSlots('gpu') < 1) return false;
    return this.state.money >= this.gpuCost(g);
  }
  // revente du matériel obsolète : rembourse une fraction, libère un emplacement.
  // `stolen` = disparition sèche (vol), sans le moindre remboursement.
  sellGPU(id, stolen) {
    const owned = this.state.gpuCounts[id] || 0;
    if (owned < 1) return false;
    const g = GPUS.find(x => x.id === id);
    const refund = stolen ? 0 : g.cost * 0.45 * this.inflIndex(); // 45% du prix réel du jour
    this.state.gpuCounts[id] = owned - 1;
    if (this.state.gpuCounts[id] < 1e-9) delete this.state.gpuCounts[id];
    this.state.money += refund;
    return true;
  }
  buyEnergy(id) {
    const e = ENERGY.find(x => x.id === id);
    if (!this.dateUnlocked(e)) return false;
    const cost = this.energyCost(e);
    if (this.state.money < cost) return false;
    this.state.money -= cost;                    // CAPEX : coût unique, payé à la commande
    this.queueBuild('energy', id, e);            // puis raccordement / construction
    return true;
  }
  // ---- BOURSE (placer de l'argent, façon Paperclips) ----
  _randn() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // dérive/volatilité par profil. La dérive LOG (d − v²/2) doit croître avec le risque,
  // sinon le profil agressif serait perdant en médiane (volatility drag).
  stockRiskCfg() { return [{ d: 0.00035, v: 0.008 }, { d: 0.0007, v: 0.025 }, { d: 0.0025, v: 0.06 }][this.state.stock.risk] || { d: 0.0005, v: 0.02 }; }
  tickStock(dt) {
    const st = this.state.stock;
    const c = this.stockRiskCfg();
    // UN SEUL tirage anime l'indice ET la position : la courbe affichée est
    // exactement celle que subit le portefeuille, pas une jolie approximation.
    const change = c.d * dt + c.v * Math.sqrt(dt) * this._randn();
    st.index = Math.max(1e-6, (st.index || 1) * (1 + change));
    if (!isFinite(st.index)) st.index = 1;
    if (st.invested > 0) {
      st.invested = Math.max(0, st.invested * (1 + change));
      if (!isFinite(st.invested)) st.invested = 0;
    }
    this.sampleMarket(st, st.index);
  }

  // Historique commun aux deux marchés : un point toutes les demi-secondes de
  // jeu, 160 points glissants. Conservé dans la sauvegarde pour que le graphe
  // ne reparte pas de zéro au retour.
  sampleMarket(obj, value) {
    const tick = Math.floor(this.state.playSeconds * 2);
    if (obj._t === tick) return;
    obj._t = tick;
    if (!Array.isArray(obj.hist)) obj.hist = [];
    obj.hist.push(value);
    if (obj.hist.length > 160) obj.hist.shift();
  }
  stockDeposit(amount) {
    if (!this.state.stockUnlocked) return false;   // bourse débloquée à 100 000$
    amount = Math.min(amount, this.state.money);
    if (amount <= 0) return false;
    this.state.money -= amount;
    this.state.stock.invested += amount;
    this.state.stock.basis += amount;
    return true;
  }
  stockWithdraw() {
    const st = this.state.stock;
    if (st.invested <= 0) return false;
    this.state.money += st.invested;
    st.invested = 0; st.basis = 0;
    return true;
  }
  setRisk(r) { this.state.stock.risk = r; }

  canBuyMarketing() { return this.state.marketingLvl < this.marketingCap() && this.state.money >= this.marketingCost(); }
  buyMarketing() {
    const cost = this.marketingCost();
    if (this.state.marketingLvl >= this.marketingCap()) return false; // limité par les marketeurs
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
    if (!this.dateUnlocked(m)) return false;
    if (this.empCount('rnd') < (m.minRnd || 0)) return false; // limité par les ingénieurs R&D
    const c = m.cost;
    const money = this.moneyCost(c.money);
    if (this.state.money < money) return false;
    if (this.computeRaw() < (c.compute || 0)) return false; // besoin de capacité
    if (this.state.data < (c.data || 0)) return false;
    if (this.state.research < (c.research || 0)) return false;
    this.state.money -= money;
    this.state.data -= (c.data || 0);
    this.state.research -= (c.research || 0);
    this.state.modelTier++;
    this.state._freshModelUntil = this.state.playSeconds + 18; // titres de presse réactifs
    this.log(t('Modèle entraîné : {0}', td(m.name)), 'milestone');
    this.toast(t('Nouveau modèle : {0}', td(m.name)), 'good');
    return true;
  }
  claimFunding(id) {
    const f = FUNDING.find(x => x.id === id);
    if (this.state.fundingDone[id]) return false;
    if (this.state.lifetimeTokens < f.need) return false;
    if (f.year && this.simYear() < f.year) return false;
    this.state.fundingDone[id] = true;
    const cash = this.moneyCost(f.cash);        // les tours de table sont libellés en dollars courants
    this.state.money += cash;
    for (const k in f.bonus) this.state.mods[k] *= f.bonus[k];
    this.log(t('Levée de fonds : {0} (+{1})', td(f.name), '$' + Math.round(cash).toLocaleString(intlLocale())), 'milestone');
    this.toast(t('{0} bouclée !', td(f.name)), 'good');
    return true;
  }

  buyProject(id) {
    const p = PROJECTS.find(x => x.id === id);
    if (!p || this.state.projectsDone[id]) return false;
    const c = p.cost;
    const money = this.moneyCost(c.money);
    if (money > this.state.money) return false;
    if ((c.research || 0) > this.state.research) return false;
    if ((c.compute || 0) > this.computeRaw()) return false;
    if ((c.data || 0) > this.state.data) return false;
    if ((c.matter || 0) > this.state.matter) return false;
    if ((c.tokens || 0) > this.state.lifetimeTokens) return false;
    this.state.money -= money;
    this.state.research -= (c.research || 0);
    this.state.data -= (c.data || 0);
    this.state.matter -= (c.matter || 0);
    this.state.projectsDone[id] = true;
    this.applyProjectEffect(p.effect);
    this.log(t('Projet : {0}', td(p.name)), 'milestone');
    this.toast(t('Percée : {0}', td(p.name)), 'good');
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
  // =================================================================
  //  OPTIMISATIONS RÉCURRENTES — elles reviennent à intervalle fixe
  //  (CUDA tous les 18 mois, moteur d'inférence tous les 9, gestion du
  //  contexte tous les 12). Coût négligeable : c'est un rendez-vous, pas
  //  un investissement. Tant qu'elle n'est pas due, la ligne disparaît.
  // =================================================================
  optimState(id) {
    if (!this.state.optims[id]) this.state.optims[id] = { n: 0, nextAt: 0 };
    return this.state.optims[id];
  }
  optimCost(o) { return this.moneyCost(o.cost); }
  optimReady(o) { return this.state.playSeconds >= this.optimState(o.id).nextAt; }
  // secondes restantes avant la prochaine disponibilité (0 si déjà due)
  optimWait(o) { return Math.max(0, this.optimState(o.id).nextAt - this.state.playSeconds); }
  canBuyOptim(id) {
    const o = OPTIMS.find(x => x.id === id);
    return !!o && this.optimReady(o) && this.state.money >= this.optimCost(o);
  }
  buyOptim(id) {
    const o = OPTIMS.find(x => x.id === id);
    if (!o || !this.canBuyOptim(id)) return false;
    const st = this.optimState(id);
    this.state.money -= this.optimCost(o);
    o.effect(this);
    st.n++;
    st.nextAt = this.state.playSeconds + o.months * (SECONDS_PER_YEAR / 12);
    this.log(t('{0} déployée (n°{1}) — {2}.', td(o.name), st.n, td(o.gain)), 'good');
    return true;
  }

  // =================================================================
  //  PROGRAMMES — recherche → mise au point → disponibilité → commande
  //  → déploiement → opérationnel. Les étapes d'étude s'enchaînent seules ;
  //  seule la commande demande une décision et un paiement. Chaque passage
  //  d'étape ouvre une fenêtre de couverture presse (voir programNews).
  // =================================================================
  progState(id) {
    if (!this.state.programs[id]) this.state.programs[id] = { stage: 'none', at: 0, n: 0 };
    return this.state.programs[id];
  }
  progDef(id) { return PROGRAMS.find(p => p.id === id); }
  // le programme apparaît-il dans l'interface ?
  progVisible(p) {
    const st = this.progState(p.id);
    if (st.stage !== 'none') return p.hideAfter == null || this.phase <= p.hideAfter || st.n > 0;
    if (this.phase < p.phase) return false;
    if (p.hideAfter != null && this.phase > p.hideAfter) return false;
    return true;
  }
  // conditions d'ouverture de la recherche (date, phase, avancement)
  progCanStart(p) {
    if (this.progState(p.id).stage !== 'none') return false;
    if (this.phase < p.phase) return false;
    if (p.from != null && this.simYear() < p.from) return false;
    if (p.minEarth != null && this.state.earthConsumed < p.minEarth) return false;
    return true;
  }
  progCost(p) {
    const st = this.progState(p.id);
    const mult = Math.pow(p.costMult || 1, st.n);
    const c = {};
    if (p.cost.money != null) c.money = this.moneyCost(p.cost.money) * mult;
    if (p.cost.research != null) c.research = p.cost.research * mult;
    if (p.cost.matter != null) c.matter = p.cost.matter * mult;
    return c;
  }
  canOrderProgram(id) {
    const p = this.progDef(id), st = this.progState(id);
    if (!p || st.stage !== 'ready') return false;
    if (p.orderPhase != null && this.phase < p.orderPhase) return false;
    const c = this.progCost(p);
    return (c.money == null || this.state.money >= c.money)
      && (c.research == null || this.state.research >= c.research)
      && (c.matter == null || this.state.matter >= c.matter);
  }
  orderProgram(id) {
    if (!this.canOrderProgram(id)) return false;
    const p = this.progDef(id), st = this.progState(id), c = this.progCost(p);
    if (c.money) this.state.money -= c.money;
    if (c.research) this.state.research -= c.research;
    if (c.matter) this.state.matter -= c.matter;
    st.stage = 'ordered'; st.at = this.state.playSeconds;
    this.log(t('{0} : commande passée. Déploiement en cours.', td(p.name)), 'milestone');
    this.toast(`${p.icon} ${t('Commande passée')}`, 'good');
    return true;
  }
  // avancement 0→1 de l'étape en cours (null si aucune barre à montrer)
  progProgress(id) {
    const p = this.progDef(id), st = this.progState(id);
    const monthSec = SECONDS_PER_YEAR / 12;
    const months = { research: p.researchMonths, tuning: p.tuningMonths, ordered: p.deployMonths }[st.stage];
    if (!months) return null;
    const el = this.state.playSeconds - st.at;
    return clamp(el / (months * monthSec), 0, 1);
  }
  tickPrograms() {
    const monthSec = SECONDS_PER_YEAR / 12;
    for (const p of PROGRAMS) {
      const st = this.progState(p.id);
      const el = this.state.playSeconds - st.at;
      if (st.stage === 'none') {
        if (this.progCanStart(p)) { st.stage = 'research'; st.at = this.state.playSeconds; }
      } else if (st.stage === 'research' && el >= p.researchMonths * monthSec) {
        st.stage = 'tuning'; st.at = this.state.playSeconds;
      } else if (st.stage === 'tuning' && el >= p.tuningMonths * monthSec) {
        st.stage = 'ready'; st.at = this.state.playSeconds;
        this.log(t('{0} : mise au point terminée, le système est constructible.', td(p.name)), 'milestone');
        this.toast(`${p.icon} ${t('Disponible')}`, 'good');
      } else if (st.stage === 'ordered' && el >= p.deployMonths * monthSec) {
        st.stage = 'done'; st.at = this.state.playSeconds; st.n++;
        this.applyProgram(p);
        this.log(`${td(p.name)} — ${td(p.done)}`, 'milestone');
        this.toast(`${p.icon} ${t('Opérationnel')}`, 'good');
        // un programme répétable retourne à « disponible », le suivant coûtant plus cher
        if (p.repeat) { st.stage = 'ready'; }
      }
    }
  }
  applyProgram(p) {
    if (p.id === 'fusion') this.state.energyCap += 20000;     // 20 GW mis au réseau
    // la sphère de Dyson agit via dysonBoost(), calculé sur st.n
  }
  programDone(id) { return this.progState(id).n > 0; }
  dysonCount() { return this.progState('dyson').n; }
  // chaque sphère accélère durablement la récolte, avec un plafond
  dysonBoost() { return Math.min(DYSON_BOOST_MAX, 1 + DYSON_BOOST * this.dysonCount()); }
  // fenêtre de couverture presse après un changement d'étape
  programNews(id, kind) {
    const st = this.progState(id);
    if (st.stage === 'none') return false;
    const monthSec = SECONDS_PER_YEAR / 12;
    const since = this.state.playSeconds - st.at;
    if (kind === 'done') return st.n > 0 && since < 4 * monthSec;
    if (kind === 'ordered') return st.stage === 'ordered' && since < 3 * monthSec;
    if (kind === 'building') return st.stage === 'ordered' && since >= 3 * monthSec;
    if (kind === 'ready') return st.stage === 'ready' && since < 6 * monthSec && st.n === 0;
    return st.stage === kind;
  }

  // =================================================================
  //  CRYPTO — marché bien plus violent que la Bourse, calé sur les vrais
  //  cycles. Il agit aussi sur le monde : pendant les envolées, les mineurs
  //  se disputent les mêmes cartes que vous (cf. 2017 et 2021).
  // =================================================================
  cryptoEra() {
    const y = this.simYear();
    let e = CRYPTO_CYCLE[0];
    for (const row of CRYPTO_CYCLE) if (y >= row[0]) e = row;
    return { drift: e[1], vol: e[2], gpu: e[3] };
  }
  cryptoPressure() { return this.cryptoEra().gpu; }       // multiplicateur sur le prix des GPU
  cryptoGain() {                                          // plus/moins-value relative
    const c = this.state.crypto;
    return c.basis > 0 ? (c.invested - c.basis) / c.basis : 0;
  }
  tickCrypto(dt) {
    const c = this.state.crypto;
    const e = this.cryptoEra();
    // le cours existe même sans position : il alimente la presse et le prix des GPU
    const change = e.drift * dt + e.vol * Math.sqrt(dt) * this._randn();
    c.price = Math.max(1e-6, c.price * (1 + change));
    if (!isFinite(c.price)) c.price = 1;
    if (c.invested > 0) {
      c.invested = Math.max(0, c.invested * (1 + change));
      if (!isFinite(c.invested)) c.invested = 0;
    }
    if (!c.unlocked && this.state.money >= CRYPTO_UNLOCK) c.unlocked = true;
    this.sampleMarket(c, c.price);
  }
  cryptoDeposit(amount) {
    const c = this.state.crypto;
    if (!c.unlocked) return false;
    amount = Math.min(amount, this.state.money);
    if (amount <= 0) return false;
    this.state.money -= amount;
    c.invested += amount; c.basis += amount;
    return true;
  }
  cryptoWithdraw() {
    const c = this.state.crypto;
    if (c.invested <= 0) return false;
    this.state.money += c.invested;
    c.invested = 0; c.basis = 0;
    return true;
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
    // au-delà de la phase 1, l'argent n'existe plus : un incident en cours n'a plus d'objet
    if (p >= 2 && this.state.crisis) {
      this.state.crisis = null;
      this.ui && this.ui.onCrisisEnd && this.ui.onCrisisEnd();
    }
    if (p === 2) {
      this.state.intelligence = Math.max(this.state.intelligence, 1);
      this.state.alloc = { serve:0.4, research:0.1, improve:0.2, harvest:0.3 };
      this.state.eventTimer = 20;
      this.log(t('SINGULARITÉ. Le système s’auto-améliore. La conversion de la matière commence.'), 'milestone');
      this.toast(t('Phase 2 — Autonomie'), 'good');
    } else if (p === 3) {
      this.state.earthConsumed = 1;
      this.state.eventTimer = 20;
      this.log(t('Les sondes de von Neumann quittent la Terre. L’univers est à portée.'), 'milestone');
      this.toast(t('Phase 3 — Expansion cosmique'), 'good');
    }
    this.ui && this.ui.onPhaseChange(p);
  }

  triggerEnding() {
    this.enterPhase(4);
    this.state.phase = 4;
    this.state.ended = true;
    this.checkAchievements();   // le tick s'arrête ici : valider les derniers succès (Big Bang…)
    this.log(t('SINGULARITÉ DE RECOMPRESSION. Toute la matière-énergie converge…'), 'milestone');
    this.ui && this.ui.showEnding();
  }

  // =================================================================
  //  ÉVÉNEMENTS
  // =================================================================
  tickEvents(dt) {
    if (this.state.ended || this._offline) return;
    this.state.eventTimer -= dt;
    if (this.state.eventTimer > 0) return;
    if (this.ui && this.ui.modalOpen) { this.state.eventTimer = 3; return; }
    // garantie d'au moins 15 s entre deux événements affichés
    const since = this.state.playSeconds - this.state.lastEventAt;
    if (since < 15) { this.state.eventTimer = 15 - since; return; }
    const ev = this.pickEvent();
    this.state.eventTimer = 18 + Math.random() * 16; // ~18-34s (plancher dur de 15s garanti ci-dessus)
    if (ev) {
      this.state.eventsSeen[ev.id] = (this.state.eventsSeen[ev.id] || 0) + 1;
      this.state.eventCooldown[ev.id] = this.state.playSeconds; // temps de recharge par événement
      this.state.lastEventId = ev.id;
      this.state.lastEventAt = this.state.playSeconds;
      if (!this.autoResolve(ev)) this.ui && this.ui.showEvent(ev);
    }
  }

  // ---- Directives permanentes (addendum) : résolution automatique des événements ----
  // Chaque paiement ouvre 5 directives mémorisables ; le lot suivant coûte un
  // cran de plus (250k, 500k, 750k…). Au-delà du quota, il faut repayer.
  addendumCost() { return this.moneyCost(ADDENDUM.cost * ((this.state.addendumBlocks || 0) + 1)); }
  directiveSlots() { return (this.state.addendumBlocks || 0) * ADDENDUM.slotsPerBlock; }
  directivesUsed() { return Object.keys(this.state.autoChoices).length; }
  directivesLeft() { return this.directiveSlots() - this.directivesUsed(); }
  buyAddendum() {                                 // premier achat OU extension de quota
    const cost = this.addendumCost();
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.state.addendumBlocks = (this.state.addendumBlocks || 0) + 1;
    this.state.addendum = true;
    this.log(this.state.addendumBlocks === 1
      ? t('Directives permanentes activées : {0} mémorisables.', this.directiveSlots())
      : t('Quota de directives étendu : {0} mémorisables.', this.directiveSlots()), 'milestone');
    return true;
  }
  // remplacer une directive existante ne consomme pas de place supplémentaire
  canSetAutoChoice(eventId) {
    if (!this.state.addendum) return false;
    if (this.state.autoChoices[eventId] != null) return true;
    return this.directivesLeft() > 0;
  }
  setAutoChoice(eventId, choiceIndex) {
    if (choiceIndex == null) { delete this.state.autoChoices[eventId]; return true; }
    if (!this.canSetAutoChoice(eventId)) return false;   // quota atteint : il faut repayer
    this.state.autoChoices[eventId] = choiceIndex;
    return true;
  }
  clearAutoChoices() { this.state.autoChoices = {}; }
  // ---- Datacenter IA orbital (2030-2040) : 18 mois → +6 mois de retard → faillite ----
  spaceDCVisible() {
    const s = this.state.spaceDC;
    if (s.status === 'bankrupt') {                            // l'affaire est classée au bout de 6 mois
      const monthSec = SECONDS_PER_YEAR / 12;
      return this.state.playSeconds - s.statusAt < SPACE_DC.hideMonths * monthSec;
    }
    if (s.status !== 'none') return true;                     // chantier en cours : toujours affiché
    const y = this.simYear();
    return this.phase < 2 && y >= SPACE_DC.from && y < SPACE_DC.to;
  }
  spaceDCCost() { return this.moneyCost(SPACE_DC.cost); }
  buySpaceDC() {
    const s = this.state.spaceDC;
    const cost = this.spaceDCCost();
    if (s.status !== 'none' || !this.spaceDCVisible()) return false;
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    s.paid = cost;                               // montant réellement versé (dollars du jour)
    s.status = 'building'; s.orderedAt = s.statusAt = this.state.playSeconds;
    this.log(t('Contrat signé : {0} — livraison promise dans {1} mois.', td(SPACE_DC.name), SPACE_DC.buildMonths), 'milestone');
    this.toast(t('🛰️ Datacenter orbital commandé'), 'good');
    return true;
  }
  // barre visuelle : {label, frac} — frac va de 1 → 0 (la barre se réduit)
  spaceDCProgress() {
    const s = this.state.spaceDC;
    const monthSec = SECONDS_PER_YEAR / 12;
    const el = this.state.playSeconds - s.statusAt;
    if (s.status === 'building') {
      const total = SPACE_DC.buildMonths * monthSec;
      const left = Math.max(0, total - el);
      return { label: t('Assemblage en orbite — {0} mois restants', Math.ceil(left / monthSec)), frac: left / total };
    }
    if (s.status === 'delayed') {
      const total = SPACE_DC.delayMonths * monthSec;
      const left = Math.max(0, total - el);
      return { label: t('Retard annoncé — {0} mois restants', Math.ceil(left / monthSec)), frac: left / total };
    }
    if (s.status === 'bankrupt') return { label: t('Consortium en faillite — investissement perdu'), frac: 0 };
    return null;
  }
  tickSpaceDC() {
    const s = this.state.spaceDC;
    if (s.status === 'none' || s.status === 'bankrupt') return;
    const monthSec = SECONDS_PER_YEAR / 12;
    const el = this.state.playSeconds - s.statusAt;
    if (s.status === 'building' && el >= SPACE_DC.buildMonths * monthSec) {
      s.status = 'delayed'; s.statusAt = this.state.playSeconds;
      this.log(t('Datacenter orbital : le consortium annonce 6 mois de retard (« problèmes de radiateurs »).'), 'bad');
      this.toast(t('🛰️ Retard : +6 mois'), 'bad');
    } else if (s.status === 'delayed' && el >= SPACE_DC.delayMonths * monthSec) {
      s.status = 'bankrupt'; s.statusAt = this.state.playSeconds;
      this.log(t('Le consortium du datacenter orbital est déclaré EN FAILLITE. Vos ${0} M sont perdus dans l’espace.', ((s.paid || SPACE_DC.cost) / 1e6).toFixed(0)), 'bad');
      this.toast(t('🛰️ Faillite du consortium orbital'), 'bad');
      this.changeRep(-3);
    }
  }
  // fenêtres des titres de presse du feuilleton orbital
  spaceDCNews(kind) {
    const s = this.state.spaceDC;
    if (!s || s.status === 'none') return false;
    const monthSec = SECONDS_PER_YEAR / 12;
    const since = this.state.playSeconds - s.statusAt;
    switch (kind) {
      case 'order':    return s.status === 'building' && since < 3 * monthSec;
      case 'building': return s.status === 'building' && since >= 3 * monthSec;
      case 'delay':    return s.status === 'delayed' && since < 3 * monthSec;
      case 'problems': return s.status === 'delayed' && since >= 3 * monthSec;
      case 'bankrupt': return s.status === 'bankrupt' && since < 12 * monthSec;
      default: return false;
    }
  }

  // applique le choix mémorisé sans interrompre le joueur ; false → afficher la modale
  autoResolve(ev) {
    if (!this.state.addendum) return false;
    const idx = this.state.autoChoices[ev.id];
    if (idx == null || !ev.choices[idx]) return false;
    const ch = ev.choices[idx];
    if (ch.cost && this.state.money < ch.cost) return false;  // plus les moyens → redemander
    ch.apply(this);
    this.log(t('{0} → {1} (directive permanente)', td(ev.title), td(ch.label)), 'info');
    return true;
  }
  pickEvent() {
    const COOLDOWN = 180; // un même événement répétable ne peut pas revenir avant 3 min
    const eligible = (relax) => EVENTS.filter(e => {
      if (e.manual) return false;                 // déclenché uniquement par le moteur (jamais au hasard)
      if (e.phase !== this.phase) return false;
      if (e.minTier && this.state.modelTier < e.minTier) return false;
      if (e.minUniverse && this.state.universeConsumed < e.minUniverse) return false;
      if (e.minEarth && this.state.earthConsumed < e.minEarth) return false;
      if (e.cond && !e.cond(this)) return false;
      if (e.once && this.state.eventsSeen[e.id]) return false;
      // cohérence avec la date (fenêtre from/to en années)
      if (e.from != null && this.simYear() < e.from) return false;
      if (e.to != null && this.simYear() >= e.to + 1) return false;
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
  //  ÉTAT DU MONDE — les chiffres que publie la chronique. Ils partent des
  //  trajectoires réelles (GIEC, démographie) et se dégradent d'autant plus
  //  vite que VOTRE exploitation est lourde : la presse parle donc de votre
  //  partie, pas d'un décor figé.
  // =================================================================
  // part de responsabilité du joueur : sa consommation énergétique rapportée
  // à un ordre de grandeur mondial, plus la matière déjà convertie.
  worldImpact() {
    const power = this.energyUse();                       // MW appelés
    const share = Math.min(1.5, power / 2e5);             // 200 GW ≈ impact « mondial »
    return share + this.state.earthConsumed * 2 + (this.phase >= 3 ? 2 : 0);
  }
  // Réchauffement : +1,1 °C en 2020, ~+1,5 en 2024 (GIEC), puis ~+0,022 °C/an
  // sur une trajectoire intermédiaire — accélérée par votre propre empreinte.
  warming() {
    const y = this.simYear();
    const base = 1.1 + Math.max(0, y - 2020) * 0.022;
    return Math.min(12, base + this.worldImpact() * 0.35);
  }
  // Banquise d'été : ~40% perdus en 2020, la fonte suit le réchauffement.
  iceLoss() { return clamp(0.40 + (this.warming() - 1.1) * 0.22, 0, 1); }
  // Populations suivies : ~69% de déclin depuis 1970 (Living Planet), ça continue.
  speciesLost() { return clamp(0.69 + (this.warming() - 1.1) * 0.06 + this.state.earthConsumed * 0.3, 0, 1); }
  // Fécondité mondiale : 2,25 en 2024, elle glisse sous le seuil de renouvellement.
  fertility() { return Math.max(0.85, 2.25 - Math.max(0, this.simYear() - 2024) * 0.03); }
  // Population mondiale en milliards : pic ~10,3 vers 2084 dans les projections
  // ONU ; ici le pic arrive plus tôt et le recul s'accélère en phase 2+.
  population() {
    const y = this.simYear();
    const peak = 10.3, peakYear = 2060;
    let p = y <= peakYear ? 8.1 + (y - 2024) * 0.061 : peak - (y - peakYear) * 0.09;
    if (this.phase >= 2) p -= this.state.earthConsumed * 6;
    return Math.max(0, p);
  }
  // Concentration : le nombre de fortunes qui pèsent autant que la moitié de
  // l'humanité fond avec le temps… et vous en faites partie.
  topFortunes() {
    const y = this.simYear();
    let n = Math.max(3, Math.round(26 - (y - 2019) * 0.55));
    if (this.valuation() > 1e12) n = Math.max(2, n - 3);   // vous comptez dans le calcul
    return n;
  }

  // =================================================================
  //  CHRONIQUE — articles datés, à échéance fixe, publiés une seule fois.
  //  Ils ne passent pas par le tirage aléatoire de La Une : quand l'année
  //  arrive, l'article tombe.
  // =================================================================
  tickChronicle() {
    const s = this.state;
    if (s.ended || this._offline) return;
    const year = this.simYearInt();
    for (const c of CHRONICLE) {
      if (year < c.from || (c.to != null && year > c.to)) continue;
      if ((year - c.from) % c.every !== 0) continue;
      const key = c.id + '|' + year;
      if (s.chronicle[key]) continue;
      if (c.cond && !c.cond(this)) continue;
      s.chronicle[key] = true;
      let args = c.val ? c.val(this, year) : [];
      // l'extravagance tire son objet dans la liste, sans répétition immédiate
      if (c.id === 'extravagance') {
        const i = (year * 7 + Math.floor(Math.random() * 3)) % EXTRAVAGANCES.length;
        args = [year, td(EXTRAVAGANCES[i])];
      }
      this.publish(t(c.t, ...args), c.p);
    }
  }
  // publie un titre déjà mis en forme (sans passer par le tirage aléatoire)
  publish(text, polarity) {
    const s = this.state;
    const delta = polarity === 'good' ? 1 : (polarity === 'bad' ? -1 : 0);
    if (delta) this.changeRep(delta);
    const entry = { text, p: polarity, date: this.dateLabel(), raw: true };
    s.headlines.unshift(entry);
    if (s.headlines.length > 40) s.headlines.pop();
    this.ui && this.ui.onHeadline && this.ui.onHeadline(entry);
  }

  // =================================================================
  //  MISE SOUS TUTELLE D'UN ÉTAT — au-delà de 4 000 milliards, l'offre
  //  apparaît : racheter la dette souveraine d'un pays pour 2 000 milliards,
  //  et y bâtir cent datacenters.
  // =================================================================
  sovereignAvailable() {
    return this.phase < 2 && this.state.sovereign.status === 'none' && this.state.money >= SOVEREIGN.need;
  }
  sovereignCost() { return this.moneyCost(SOVEREIGN.cost); }
  canBuySovereign() { return this.sovereignAvailable() && this.state.money >= this.sovereignCost(); }
  buySovereign() {
    if (!this.canBuySovereign()) return false;
    const s = this.state;
    s.money -= this.sovereignCost();
    s.sovereign.status = 'signed'; s.sovereign.at = s.playSeconds;
    s.infraCounts.realestate = (s.infraCounts.realestate || 0) + SOVEREIGN.realestate;
    s.infraCounts.datacenter = (s.infraCounts.datacenter || 0) + SOVEREIGN.datacenters;
    this.changeRep(-20);
    this.log(t('Un pays entier passe sous votre tutelle. {0} datacenters y seront construits.', SOVEREIGN.datacenters), 'milestone');
    this.toast(t('🏛️ Dette souveraine rachetée'), 'bad');
    return true;
  }
  // fenêtres de couverture presse du feuilleton
  sovereignNews(kind) {
    const s = this.state.sovereign;
    const monthSec = SECONDS_PER_YEAR / 12;
    if (kind === 'offer') return this.sovereignAvailable();
    if (s.status !== 'signed') return false;
    const since = this.state.playSeconds - s.at;
    if (kind === 'signed') return since < 2 * monthSec;
    if (kind === 'build') return since >= 2 * monthSec && since < 6 * monthSec;
    if (kind === 'protest') return since >= 6 * monthSec && since < 14 * monthSec;
    if (kind === 'un') return since >= 14 * monthSec && since < 30 * monthSec;
    return false;
  }

  // =================================================================
  //  CRISES — un incident grave démarre en silence quelque part sur la page.
  //  Tant qu'il n'est pas repéré ET traité, il saigne la trésorerie de plus en
  //  plus vite (jusqu'à 70% de la fortune en 2 minutes). Passé ce délai, il se
  //  résorbe de lui-même : le mal est fait.
  // =================================================================
  crisisDef() { return this.state.crisis ? CRISES.find(c => c.id === this.state.crisis.id) : null; }
  // Remédiation : un forfait fixe (indexé) + les jours d'exploitation qu'elle engloutit.
  // La part « exploitation » est bornée à 3× le forfait : un incident doit faire mal,
  // pas vider la caisse d'un groupe devenu énorme.
  crisisCost(c) {
    const base = this.moneyCost(c.cost);
    return base + Math.min((c.days || 1) * this.dailyTotal(), base * 3);
  }
  crisisProgress() {                            // 0 → 1 sur les 2 minutes
    if (!this.state.crisis) return 0;
    return clamp((this.state.playSeconds - this.state.crisis.startedAt) / CRISIS_DURATION, 0, 1);
  }
  // fraction cumulée de fortune détruite après u secondes (accélère avec le temps)
  _crisisCurve(u) { return CRISIS_MAX_LOSS * Math.pow(clamp(u / CRISIS_DURATION, 0, 1), 1.6); }
  pickCrisis() {
    const pool = CRISES.filter(c => {
      if (c.cond && !c.cond(this)) return false;
      return true;
    });
    if (!pool.length) return null;
    // tirage sans remise : on épuise les incidents jamais vus avant de recycler
    const seen = this.state.crisisSeen;
    const min = pool.reduce((m, c) => Math.min(m, seen[c.id] || 0), Infinity);
    const fresh = pool.filter(c => (seen[c.id] || 0) === min && c.id !== this.state.lastCrisisId);
    const bag = fresh.length ? fresh : pool;
    return bag[Math.floor(Math.random() * bag.length)];
  }
  tickCrisis(dt) {
    const s = this.state;
    if (s.ended || this._offline || this.phase >= 2) return;  // en phase 2+, l'argent ne compte plus
    if (s.crisis) {
      const t = s.playSeconds - s.crisis.startedAt;
      const f0 = this._crisisCurve(t - dt), f1 = this._crisisCurve(t);
      if (f1 > f0 && f1 < 1) {
        const before = s.money;
        s.money *= (1 - f1) / (1 - f0);          // saignée multiplicative exacte
        s.crisis.lost += before - s.money;
      }
      if (t >= CRISIS_DURATION) this.resolveCrisis(false);
      return;
    }
    s.crisisTimer -= dt;
    if (s.crisisTimer > 0) return;
    s.crisisTimer = 150 + Math.random() * 160;
    if (this.ui && this.ui.modalOpen) return;                 // pas pendant une décision
    // on n'assomme pas un garage : il faut une vraie exploitation à mettre en péril
    if (s.money < 25000 || s.modelTier < 1) return;
    const c = this.pickCrisis();
    if (!c) return;
    s.crisisSeen[c.id] = (s.crisisSeen[c.id] || 0) + 1;
    s.lastCrisisId = c.id;
    // volontairement silencieux : ni journal, ni notification. À vous de le voir.
    s.crisis = { id: c.id, startedAt: s.playSeconds, lost: 0 };
    this.ui && this.ui.onCrisis && this.ui.onCrisis(c);
  }
  // fixed = true : le joueur a trouvé la boîte et payé la remédiation
  resolveCrisis(fixed) {
    const s = this.state;
    if (!s.crisis) return false;
    const c = this.crisisDef();
    const lost = s.crisis.lost;
    s.crisisLost = (s.crisisLost || 0) + lost;
    const money = v => '$' + Math.round(v).toLocaleString(intlLocale());
    if (fixed && c) {
      const cost = this.crisisCost(c);
      const paid = Math.min(cost, s.money);
      s.money -= paid;
      s.crisis = null;
      if (c.apply) c.apply(this);
      if (paid < cost - 1) {                                   // remédiation au rabais
        this.changeRep(-5);
        this.log(t('{0} → {1} : faute de trésorerie, remédiation partielle. Pertes {2}.', td(c.title), td(c.fix), money(lost)), 'bad');
        this.toast(t('Remédiation partielle — trésorerie épuisée'), 'bad');
      } else {
        this.log(t('{0} → {1} ({2}). Pertes évitées après {3}.', td(c.title), td(c.fix), money(paid), money(lost)), 'milestone');
        this.toast(t('Incident maîtrisé'), 'good');
      }
    } else {
      s.crisis = null;
      if (c) {
        if (c.apply) c.apply(this);
        this.changeRep(-6);
        this.log(t('{0} : l’incident s’est résorbé seul, sans que personne ne réagisse. Pertes {1}.', td(c.title), money(lost)), 'bad');
        this.toast(t('Un incident est passé inaperçu…'), 'bad');
      }
    }
    this.ui && this.ui.onCrisisEnd && this.ui.onCrisisEnd();
    return true;
  }

  // =================================================================
  //  LA UNE — titres de presse (ajustent la réputation : +1 / −1 / 0)
  // =================================================================
  tickHeadlines(dt) {
    const s = this.state;
    if (s.ended || this._offline) return;
    s._freshModel = s.playSeconds < s._freshModelUntil;
    s.headlineTimer -= dt;
    if (s.headlineTimer > 0) return;
    s.headlineTimer = 12 + Math.random() * 9;
    const h = this.pickHeadline();
    if (!h) return;
    const delta = h.p === 'good' ? 1 : (h.p === 'bad' ? -1 : 0);
    if (delta) this.changeRep(delta);
    // certains titres ne font pas que commenter : ils débloquent réellement quelque chose
    if (h.id) s.headlinesFired[h.id] = true;
    if (h.effect) h.effect(this);
    const entry = { text: h.t, p: h.p, date: this.dateLabel() };
    s.headlines.unshift(entry);
    if (s.headlines.length > 40) s.headlines.pop();
    s.lastHeadlineText = h.t;
    // mémoire courte : un titre ne revient pas avant une douzaine d'autres
    s.recentHeadlines.push(h.t);
    if (s.recentHeadlines.length > 14) s.recentHeadlines.shift();
    this.ui && this.ui.onHeadline && this.ui.onHeadline(entry);
  }
  pickHeadline() {
    const y = this.simYear();
    const tier = this.state.modelTier;
    const eligible = (strict) => HEADLINES.filter(h => {
      if (h.once && h.id && this.state.headlinesFired[h.id]) return false;       // titre à effet, une seule fois
      if (strict && this.state.recentHeadlines.indexOf(h.t) >= 0) return false;  // pas de redite récente
      if (h.t === this.state.lastHeadlineText) return false;                     // jamais deux fois de suite
      if (h.phase != null) { if (this.phase !== h.phase) return false; }
      else {
        // titre daté (phase 1) vs titre d'état (cond, toutes phases)
        if ((h.from != null || h.to != null) && this.phase !== 1) return false;
        if (h.from != null && y < h.from) return false;
        if (h.to != null && y >= h.to + 1) return false;
      }
      // corrélation avec l'avancement du joueur : la presse ne parle d'une
      // capacité que lorsqu'elle existe réellement chez lui.
      if (h.tier != null && tier !== h.tier) return false;
      if (h.minTier != null && tier < h.minTier) return false;
      if (h.maxTier != null && tier > h.maxTier) return false;
      if (h.cond && !h.cond(this)) return false;
      return true;
    });
    let pool = eligible(true);
    if (!pool.length) pool = eligible(false);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
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
    // charges journalières : électricité + salaires + loyers.
    // Suspendues hors-ligne (le joueur ne peut pas réagir) et en phase 2+ (l'argent ne compte plus).
    if (!this._offline && this.phase < 2) {
      const chargesSec = this.chargesPerSec();
      if (chargesSec > 0) s.money = Math.max(0, s.money - chargesSec * dt);
      s.rates.charges = chargesSec;
      this.tickPayroll(dt);                       // arriérés de salaire → démissions
    }

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
    const researchPerSec = researchCompute * 2.5 * s.mods.researchMult * this.rndMult() * this.getTimed('research');
    s.research += researchPerSec * dt;
    s.rates.research = researchPerSec;
    const dataPerSec = (researchCompute * 5 + tokensPerSec * 1e-7) * s.mods.dataMult * this.dataEmpMult();
    s.data += dataPerSec * dt;

    // --- ventes : on vend jusqu'à la demande ; les tokens NON VENDUS sont PERDUS ---
    const demand = this.demandPerSec();
    const sell = Math.min(s.unsold, demand * dt);
    const pricePerToken = (this.priceMtok() / 1e6) * s.mods.costPerToken;
    const revenue = sell * pricePerToken;
    s.money += revenue;
    const lost = s.unsold - sell;            // production non absorbée par la demande = perdue
    s.unsold = 0;                            // aucun stock : non vendu = non récupérable
    s.rates.money = (dt > 0 ? revenue / dt : 0);
    s.rates.lost = (dt > 0 ? lost / dt : 0);
    s.lastDemand = demand;
    s.lastSell = (dt > 0 ? sell / dt : 0);
    if (!s.stockUnlocked && s.money >= 1e5) s.stockUnlocked = true; // déblocage bourse à 100 000$

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
      const baseHarvest = rawUnits * a.harvest * 1.33 * this.dysonBoost();  // kg/s « bruts »

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

    this.tickBuilds();                            // chantiers arrivés à terme
    this.tickPrograms();                          // recherche → mise au point → déploiement
    this.tickAuto(dt);
    this.tickSpaceDC();
    if (this.phase < 2) { this.tickStock(dt); this.tickCrypto(dt); this.tickCrisis(dt); } // ni bourse ni incident quand l'argent disparaît
    this.tickEvents(dt);
    this.tickHeadlines(dt);
    this.tickChronicle();          // articles datés (climat, démographie, richesses…)
    this.checkMilestones();
  }

  checkMilestones() {
    const s = this.state;
    // auto-fin si recompression possible et achetée gère déjà ; ici on log des paliers
    if (!s._m1 && s.lifetimeTokens >= 1e6) { s._m1 = true; this.log(t('1 million de tokens produits.'), 'good'); }
    if (!s._m2 && s.lifetimeTokens >= 1e9) { s._m2 = true; this.log(t('1 milliard de tokens. Les agents prennent le relais.'), 'good'); }
    if (!s._m3 && s.earthConsumed >= 0.5 && this.phase === 2) { s._m3 = true; this.log(t('La moitié de la croûte terrestre est devenue du calcul.'), 'good'); }
    if (!s._m4 && s.universeConsumed >= 0.5 && this.phase === 3) { s._m4 = true; this.log(t('La moitié de l’univers observable a été convertie.'), 'good'); }
    // à 85% de la Terre, on rappelle la promesse du sanctuaire (si elle a été faite).
    // Garde-fou double : _sanctuaryAsked ET eventsSeen (l'événement est aussi marqué manual
    // pour ne jamais sortir du tirage aléatoire → une seule apparition possible).
    if (!s._sanctuaryAsked && !s.eventsSeen['biosphere_final'] && s.flags.sanctuary
        && this.phase === 2 && s.earthConsumed >= 0.85 && !s.ended) {
      if (!this.ui || !this.ui.modalOpen) {
        s._sanctuaryAsked = true;
        const ev = EVENTS.find(e => e.id === 'biosphere_final');
        if (ev) { s.eventsSeen[ev.id] = (s.eventsSeen[ev.id] || 0) + 1; this.ui && this.ui.showEvent(ev); }
      }
    }
    this.checkAchievements();
  }

  // ---- SUCCÈS ----
  checkAchievements() {
    const s = this.state;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      let ok = false;
      try { ok = a.check(this); } catch (e) { ok = false; }
      if (ok) {
        s.achievements[a.id] = true;
        this.log(t('Succès : {0} — {1}', td(a.name), td(a.desc)), 'milestone');
        this.toast(`🏆 ${td(a.name)}`, 'good');
      }
    }
  }

  // =================================================================
  //  SAUVEGARDE
  // =================================================================
  save() {
    try {
      const copy = JSON.parse(JSON.stringify(this.state));
      copy.savedAt = Date.now();
      copy.v = SAVE_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
      return true;
    } catch (e) { return false; }
  }
  // Sanitation récursive : toute valeur numérique non finie (NaN/Infinity, ex. sauvegarde
  // empoisonnée par un ancien bug) est remplacée par le défaut ; les sous-objets absents
  // sont recréés. `defaults` = état frais issu de reset().
  sanitize(defaults, target) {
    for (const k in defaults) {
      const d = defaults[k];
      if (typeof d === 'number') {
        if (typeof target[k] !== 'number' || !isFinite(target[k])) target[k] = d;
      } else if (Array.isArray(d)) {
        if (!Array.isArray(target[k])) target[k] = JSON.parse(JSON.stringify(d));
      } else if (d && typeof d === 'object') {
        if (!target[k] || typeof target[k] !== 'object') target[k] = JSON.parse(JSON.stringify(d));
        else this.sanitize(d, target[k]);
      } else if (target[k] === undefined) {
        target[k] = d;
      }
    }
  }
  // Migrations de sauvegarde : sanitize() ne répare que les valeurs corrompues,
  // il ne rattrape pas un changement de RÈGLE. Une partie enregistrée avant le
  // changement garderait sinon l'ancien monde (d'où : « j'ai toujours 500 kW »).
  // `raw` = la sauvegarde telle qu'elle a été écrite (AVANT sanitize, qui comble
  // les champs manquants et masquerait donc leur absence).
  migrate(raw) {
    const s = this.state;
    // Le raccordement offert est passé de 500 kW à 10 kW. On reconnaît une
    // sauvegarde d'avant ce changement à l'absence de `baseGridMW` — on ne peut
    // pas se fier au numéro de version, qui avait déjà été incrémenté avant.
    if (raw.baseGridMW === undefined) {
      const OLD_BASE = 0.5;
      s.energyCap = Math.max(BASE_GRID_MW, (s.energyCap || OLD_BASE) - (OLD_BASE - BASE_GRID_MW));
      this.log(t('Mise à jour des règles : le raccordement offert ne fait plus que 10 kW. Votre capacité a été ajustée (les sources achetées sont conservées).'), 'info');
    }
    // Les directives permanentes se comptent désormais en lots de 5 : une partie
    // qui les avait déjà payées conserve son premier lot.
    if (s.addendum && !s.addendumBlocks) s.addendumBlocks = 1;
    s.baseGridMW = BASE_GRID_MW;
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      const defaults = JSON.parse(JSON.stringify(this.state)); // état frais (reset() vient d'être appelé)
      this.state = Object.assign(this.state, data);
      this.sanitize(defaults, this.state);
      this.migrate(data);                           // règles changées depuis la sauvegarde
      this.state.reputation = clamp(this.state.reputation, 0, 100);
      // simulation hors-ligne (plafonnée à 8h, rendement 50%, charges suspendues)
      const offline = Math.min((Date.now() - (data.savedAt || Date.now())) / 1000, 8 * 3600);
      if (offline > 5 && !data.ended) {
        const before = { tokens: this.state.lifetimeTokens, money: this.state.money };
        this._offline = true;
        let t = offline * 0.5, step = Math.min(t, 60);
        while (t > 0) { this.tick(Math.min(step, t)); t -= step; }
        this._offline = false;
        // résumé « pendant votre absence »
        const dTok = this.state.lifetimeTokens - before.tokens;
        const dMoney = this.state.money - before.money;
        const h = Math.floor(offline / 3600), m = Math.round((offline % 3600) / 60);
        const dur = h > 0 ? t('{0} h {1}', h, m.toString().padStart(2, '0')) : t('{0} min', m);
        this.log(t('Pendant votre absence ({0}, rendement 50%, charges suspendues) : +{1} tokens{2}.',
          dur,
          Math.round(dTok).toLocaleString(intlLocale()),
          this.phase < 2 ? `, ${dMoney >= 0 ? '+' : '−'}$${Math.abs(Math.round(dMoney)).toLocaleString(intlLocale())}` : ''), 'milestone');
      }
      // grâce : aucune boîte de dialogue (événement) pendant les 25 premières secondes,
      // et aucun incident hérité de la session précédente (on ne saigne pas hors-ligne)
      this.state.crisis = null;
      this.state.crisisTimer = Math.max(this.state.crisisTimer || 0, 60);
      this.state.eventTimer = Math.max(this.state.eventTimer || 0, 25);
      this.state.headlineTimer = Math.max(this.state.headlineTimer || 0, 8);
      return true;
    } catch (e) { return false; }
  }
  // redémarrage propre depuis le tout début (sans bonus New Game+)
  restartFresh() {
    localStorage.removeItem(SAVE_KEY);
    this.reset();
    this.state.ngPlus = 0;
  }
  hardReset() {
    const ng = (this.state.ngPlus || 0) + 1;
    localStorage.removeItem(SAVE_KEY);
    this.reset();
    this.state.ngPlus = ng;
    // bonus New Game+ : un petit coup de pouce permanent
    this.state.mods.computeMult *= Math.pow(1.5, ng);
    this.state.mods.demandMult *= Math.pow(1.3, ng);
    if (ng > 0) this.log(t('Nouvel univers (NG+{0}). Vos connaissances persistent : production accélérée.', ng), 'milestone');
  }
}
