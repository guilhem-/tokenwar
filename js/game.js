// =====================================================================
//  TokenWar — MOTEUR DE JEU
// =====================================================================
import { MODELS, GPUS, ENERGY, PROJECTS, EVENTS, INFRA, EARTH_MASS, UNIVERSE_MASS,
         START_YEAR, SECONDS_PER_YEAR, HEADLINES,
         EMPLOYEES, BASE_HEADCOUNT, HR_HEADCOUNT, BASE_MARKETING, ELEC_PRICE_MWH, COLO, AUTOMATIONS, ACHIEVEMENTS, ADDENDUM, SPACE_DC,
         BUILD, INFLATION, INFLATION_TAIL, CRISES, CRISIS_MAX_LOSS, CRISIS_DURATION,
         HIRE_COST, UNPAID_QUIT_DAYS, UNPAID_QUIT_EVERY, BASE_GRID_MW, AUTO_CLICKS_REQUIRED,
         PROJECT_GAP_MONTHS, OPTIM_GAP_MONTHS, INTEGRATION_WEEKS, OPTIMS,
         PROGRAMS, DYSON_BOOST, DYSON_BOOST_MAX, CRYPTO_CYCLE, CRYPTO_UNLOCK,
         CHRONICLE, EXTRAVAGANCES, SOVEREIGN,
         OPS_RATIO, OPS_RISK, OPS_VALUE_LOSS, DATA_RATIO, TRAIN_FAIL_RISK,
         OPS_INCIDENTS, TRAINING_FAILURES, AUTO_SPEED, LOANS, LOAN_MIN_VALUATION,
         PHASE3_EARTH, ENDING_UNIVERSE, WATCHDOGS, WATCHDOG_AFTER, WATCHDOG_SHARE,
         HAZARD_RATE, HAZARD_SHIELD, EXTRACTION, EXTRACT_FLOOR, EXTRACT_FADE, OPTIM_MATTER, DIRECTIVE_MATTER,
         DESTINATIONS, DEST_DURATION, DEST_CHOICES } from './data.js';
import { clamp, fmtPower, fmtMoney, fmtMass, pct } from './util.js';
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
    // Vitesse de jeu courante (⏩). Portée par le moteur et non par `window`,
    // pour que la simulation headless en dispose aussi. Hors sauvegarde : une
    // partie rechargée repart en ×1.
    this.speed = 1;
    this.reset();
  }

  reset() {
    const s = {};
    // score & ressources
    s.lifetimeTokens = 0;
    s.unsold = 0;
    s.money = 50000;         // capital de départ : de quoi se raccorder, monter une baie et un serveur
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
    // On démarre avec un local et une salle, mais NI BAIE NI SERVEUR : la première
    // décision du joueur est de monter sa machine, pas d'acheter une carte.
    s.infraCounts = { realestate:1, datacenter:1, rack:0, server:0 };
    s.rentedDC = 0;          // datacenters loués (coût journalier)
    s.rentedSpace = 0;       // espaces de colocation loués (coût journalier)
    s.employees = { hr:0, rnd:0, marketer:0, ops:0, data:0 }; // ressources humaines
    s.stock = { invested:0, basis:0, risk:1, index:1, hist:[] };  // position, risque, INDICE de marché et son historique
    s.stockUnlocked = false; // la bourse se débloque à 100 000$ de trésorerie
    // automatisations (auto-clickers payants, activables/désactivables)
    s.auto = { click:{ owned:false, on:true }, gpu:{ owned:false, on:true },
               hardware:{ owned:false, on:true }, housing:{ owned:false, on:true },
               energy:{ owned:false, on:true } };
    s.autoItems = { gpu:{}, energy:{}, hardware:{}, housing:{} }; // auto-achat PAR élément (id -> bool)
    // gestes faits À LA MAIN, par famille : une automatisation ne se propose qu'après 50
    s.clicks = { click:0, gpu:0, hardware:0, housing:0, energy:0 };
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
    s.directivesPaid = 0;    // directives achetées à l'unité (chacune au prix du moment)
    s.optims = {};           // optimisations récurrentes : id -> {n, nextAt}
    // programmes par étapes (fusion, sphère de Dyson) : id -> {stage, at, n}
    s.programs = {};
    // second marché, bien plus violent que la Bourse
    s.crypto = { invested:0, basis:0, price:1, unlocked:false, hist:[] };
    s.chronicle = {};        // id|année -> déjà publié
    s.sovereign = { status:'none', at:0 };   // rachat de dette souveraine
    // dette : prêts en cours. Les montants y sont en dollars CONSTANTS, comme
    // les prix du jeu ; l'inflation s'applique au moment du paiement.
    s.loans = [];
    s.loanSeq = 0;
    s.extractTier = {};      // palier d'extraction ouvert, par phase
    s.dest = null;           // région ciblée par l'essaim, et les candidates
    s.watchdogs = {};        // dispositifs de surveillance des incidents achetés
    s.opsCheckYear = 0;      // dernier contrôle annuel du risque d'exploitation
    s.lastIncident = null;   // pour ne pas tirer deux fois le même article de suite
    s.autoChoices = {};      // eventId -> index du choix à appliquer automatiquement
    s.spaceDC = { status:'none', orderedAt:0, statusAt:0, paid:0 }; // datacenter orbital : none/building/delayed/bankrupt
    s.energyCounts = {};
    s.energyCap = BASE_GRID_MW; // rien : il faut se raccorder avant de calculer
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
    s.lastProjectAt = -1e9;  // fin d'intégration de la dernière percée (délai avant la suivante)
    s.lastOptimAt = -1e9;    // idem pour les optimisations récurrentes
    // Avancées en cours d'intégration : au plus une percée et une optimisation.
    // { kind:'project'|'optim', id, t0, t1 } — l'effet ne tombe qu'à t1.
    s.integrations = [];
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
  dateLabel() { return this.dateLabelAt(this.state.playSeconds); }
  // même chose pour un instant quelconque : sert aux échéances à venir
  dateLabelAt(seconds) {
    const y = START_YEAR + seconds / SECONDS_PER_YEAR;
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
  // `paid` mémorise ce que la commande a réellement coûté : si la livraison est
  // refusée faute de place, on rend exactement cette somme. Rembourser au prix
  // du jour ferait de l'inflation un petit arbitrage.
  queueBuild(family, id, item, paid = 0) {
    const sec = this.buildSeconds(family === 'infra' ? id : family, item);
    if (sec <= 0) return this.finishBuild({ f: family, id, paid });   // instantané
    this.state.builds.push({ n: ++this.state.buildSeq, f: family, id, paid,
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
  // Une place réservée à la commande peut avoir disparu avant la livraison : un
  // datacenter loué rendu, une baie perdue, une colocation résiliée. Sans ce
  // contrôle, la livraison entrait quand même et le parc dépassait sa capacité
  // — des cartes hébergées nulle part. On refuse alors la mise en service et on
  // rembourse : la commande n'a jamais abouti, elle ne doit rien coûter.
  deliverable(b) {
    if (!this.hostingActive()) return true;         // en phase ≥ 2 l'ASI s'auto-héberge
    if (b.f === 'gpu') return this.freeSlots('gpu') >= 1;
    if (b.f === 'infra') {
      const parent = INFRA.find(x => x.child === b.id);
      return !parent || this.freeSlots(b.id) >= 1;  // l'immobilier n'a pas de parent
    }
    return true;                                    // l'énergie n'occupe aucun emplacement
  }
  cancelBuild(b) {
    const s = this.state;
    const item = b.f === 'gpu' ? GPUS.find(x => x.id === b.id) : INFRA.find(x => x.id === b.id);
    const name = item ? td(item.name) : b.id;
    // vieilles sauvegardes : le montant payé n'y figure pas, on retombe sur le prix courant
    const refund = b.paid != null ? b.paid
      : b.f === 'gpu' ? (item ? this.gpuCost(item) : 0)
      : b.f === 'infra' ? (item ? this.infraCost(item) : 0) : 0;
    s.money += refund;
    this.log(t('Livraison annulée : plus d’emplacement libre pour {0}. Commande remboursée ({1}).',
      name, fmtMoney(refund)), 'bad');
    return false;
  }
  finishBuild(b) {
    const s = this.state;
    if (!this.deliverable(b)) return this.cancelBuild(b);
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
    this.queueBuild('infra', id, item, cost);    // mise en service différée (chantier)
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
  // Marge à conserver avant qu'un niveau ne devienne limitant. Elle doit être
  // RELATIVE à ce que le niveau accueille : un serveur offre 8 emplacements GPU
  // (consommés en continu, donc marge confortable), un bâtiment n'accueille que
  // 4 datacenters — exiger 4 places libres revenait à en racheter en permanence.
  autoBuffer(it) { return it.child === 'gpu' ? 4 : 1; }

  // Facteur à appliquer au temps vu par les automatisations. La boucle appelle
  // déjà tick() `speed` fois plus longtemps ; on ramène ce facteur à la valeur
  // voulue (×1 ×1,5 ×2 ×3 pour ×1 ×2 ×5 ×10). Rapport < 1 dès ×2 : accélérer le
  // jeu accélère les automatisations, mais nettement moins que le reste.
  autoTimeFactor() {
    const sp = this.speed == null ? 1 : this.speed;
    if (sp <= 0) return 0;                       // partie gelée : plus rien ne tourne
    const rate = AUTO_SPEED[sp] != null ? AUTO_SPEED[sp] : Math.sqrt(sp);
    return rate / sp;
  }
  tickAuto(dtRaw) {
    const dt = dtRaw * this.autoTimeFactor();
    const s = this.state, au = s.auto;
    // inférence + achat des GPU sélectionnés : « par seconde »
    s.autoTimer += dt;
    let guard = 0;
    while (s.autoTimer >= 1 && guard++ < 100) {
      s.autoTimer -= 1;
      if (au.click.owned && au.click.on) { this.manualGenerate(); this.autoFired('click'); }
      if (this.phase < 2 && au.gpu.owned && au.gpu.on) {
        for (const g of GPUS) if (this.isAutoItem('gpu', g.id) && this.canBuyGPU(g.id)) {
          this.buyGPU(g.id); this.autoFired('gpu', g.id);
        }
      }
    }
    if (this.phase < 2) {
      // énergie : on achète les sources cochées dès que la conso dépasse la production
      if (au.energy.owned && au.energy.on) {
        for (const e of ENERGY) {
          if (!this.isAutoItem('energy', e.id)) continue;
          // on compte la capacité déjà en chantier : sinon on recommande en boucle
          if (this.energyUse() <= this.energyCapPlanned() * 0.98) break;
          if ((!e.phase || this.phase >= e.phase) && this.dateUnlocked(e) && s.money >= this.energyCost(e)) {
            this.buyEnergy(e.id); this.autoFired('energy', e.id);
          }
        }
      }
      // hébergement, en deux familles distinctes : MATÉRIEL (baie, serveur) et
      // IMMOBILIER (bâtiment, datacenter). Chacune s'achète et s'active à part.
      for (const family of ['hardware', 'housing']) {
        if (!au[family].owned || !au[family].on) continue;
        for (const it of INFRA) {
          if (it.family !== family) continue;
          if (!this.isAutoItem(family, it.id)) continue;
          // la capacité en chantier compte dans la décision, la marge dépend du niveau
          if (this.plannedFreeSlots(it.child) >= this.autoBuffer(it)) continue;
          if (this.canBuyInfra(it.id)) { this.buyInfra(it.id); this.autoFired(family, it.id); }
        }
      }
    }
  }

  // ---- gestes manuels et déblocage des automatisations ----
  // Une automatisation ne se propose qu'après 50 gestes faits à la main dans sa
  // famille : on n'automatise pas ce qu'on n'a pas encore appris.
  countClick(family, n = 1) {
    if (!this.state.clicks) this.state.clicks = {};
    this.state.clicks[family] = (this.state.clicks[family] || 0) + n;
  }
  clickCount(family) { return (this.state.clicks && this.state.clicks[family]) || 0; }
  autoUnlocked(family) { return this.clickCount(family) >= AUTO_CLICKS_REQUIRED; }
  // signale à l'interface qu'une automatisation vient d'agir (pour l'animation)
  autoFired(family, itemId) { this.ui && this.ui.onAutoFire && this.ui.onAutoFire(family, itemId); }

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

  // Une carte sortie depuis plus de 5 ans n'est plus commercialisée — MAIS on
  // ne retire jamais la dernière du marché. Le catalogue spéculatif s'espace
  // avec le temps (13 ans entre le processeur de Planck et le cœur à énergie
  // du vide) : appliquer la règle des 5 ans sans garde-fou laissait 25 années
  // entières, à partir de 2049, où plus RIEN n'était achetable. Un joueur qui
  // y perdait son parc — saisie pour dette, incendie, vol de GPU — se
  // retrouvait avec un compute nul, aucune carte à acheter même avec de
  // l'argent illimité, et aucun moyen de repartir. Une impasse sèche.
  // Une carte ne sort donc du marché que lorsqu'une plus récente a pris sa
  // place ; sinon l'occasion continue de la vendre.
  discontinued(g) {
    if (this.simYear() <= g.year + 5) return false;
    // il faut qu'une carte PLUS RÉCENTE soit déjà sortie pour retirer celle-ci :
    // la dernière du catalogue reste donc toujours achetable, même vieillie.
    return GPUS.some(x => x.year > g.year && x.year <= this.simYear());
  }
  buyGPU(id) {
    const g = GPUS.find(x => x.id === id);
    if (!this.dateUnlocked(g) || this.discontinued(g)) return false;
    if (this.hostingActive() && this.freeSlots('gpu') < 1) return false; // aucun emplacement serveur libre
    const cost = this.gpuCost(g);
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.queueBuild('gpu', id, g, cost);         // réception, rackage, burn-in
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
  // Revente. `n` peut valoir 10, 100 ou Infinity (« tout revendre ») : on ne
  // vend jamais plus que ce qui est en service, et on ne facture rien au joueur
  // dont le parc a fondu entre le clic et l'exécution.
  sellGPU(id, stolen, n = 1) {
    const owned = this.state.gpuCounts[id] || 0;
    if (owned < 1) return false;
    const qty = Math.min(Math.floor(owned), Math.max(1, n));
    const g = GPUS.find(x => x.id === id);
    const refund = stolen ? 0 : g.cost * 0.45 * this.inflIndex() * qty; // 45% du prix réel du jour
    this.state.gpuCounts[id] = owned - qty;
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
    this.queueBuild('energy', id, e, cost);      // puis raccordement / construction
    return true;
  }
  // ==================================================================
  //  DETTE — contracter, servir, rembourser.
  //
  //  Tous les montants d'un prêt sont en dollars CONSTANTS, comme les prix
  //  du jeu, et convertis par moneyCost() au moment où l'argent bouge. Le
  //  taux affiché est donc réel : l'inflation n'efface pas la dette, et la
  //  banque récupère son capital en pouvoir d'achat, pas seulement en
  //  chiffres. C'est la première moitié de « la banque ne perd jamais ».
  //  La seconde est payLoan() : à défaut de trésorerie, on saisit.
  // ==================================================================
  loanPeriod(l) { return (l.every || 3) / 12; }          // durée d'une période, en années
  loanPayments(l) { return Math.round(l.years * 12 / (l.every || 3)); }
  loanOffer(id) { return LOANS.find(x => x.id === id); }
  hasLoan(id) { return this.state.loans.some(l => l.id === id); }
  debtUnlocked() { return this.phase < 2 && this.valuation() >= LOAN_MIN_VALUATION; }
  isPublic() { return !!(this.state.fundingDone && this.state.fundingDone.ipo); }
  // « ça va mal » : des salaires en retard, une trésorerie à sec, ou une dette
  // qui dépasse déjà la moitié de la valorisation.
  inDistress() {
    const s = this.state;
    if ((s.unpaidDays || 0) > 0) return true;
    if (s.money < this.dailyTotal() * 10) return true;
    return this.debtOutstanding() > this.valuation() * 0.5;
  }
  loanVisible(o) {
    if (!this.debtUnlocked() || this.hasLoan(o.id)) return false;
    if (o.postIPO && !this.isPublic()) return false;
    if (o.distress && !this.inDistress()) return false;
    return this.valuation() >= (o.need || 0);
  }
  loanOffers() { return LOANS.filter(o => this.loanVisible(o)); }
  // Coût total du crédit, en dollars constants : la somme des intérêts et
  // commissions qu'une offre aura coûtés si elle est menée à son terme sans
  // remboursement anticipé. C'est le seul chiffre qui permette de comparer un
  // taux bas amorti dès le premier trimestre à un taux élevé payé in fine.
  loanTotalCost(o) {
    const per = (o.every || 3) / 12, n = Math.round(o.years * 12 / (o.every || 3));
    const g = Math.round((o.graceYears || 0) / per);
    let reste = o.amount, cout = 0;
    for (let k = 1; k <= n; k++) {
      const interet = reste * o.rate * per;
      cout += interet;
      if (o.amort === 'pik' && k < n) reste += interet * o.pik;      // la dette enfle
      if (o.revolving) cout += (o.amount - reste) * o.commitment * per;
      let capital = 0;
      if (k === n) capital = reste;
      else if (o.amort === 'linear') capital = o.amount / n;
      else if (o.amort === 'grace') capital = k <= g ? 0 : o.amount / Math.max(1, n - g);
      else if (o.amort === 'rescue') capital = o.amount * (o.rescueYearly || 0) * per;
      reste = Math.max(0, reste - capital);
    }
    return cout;
  }

  // ---- souscription ----
  takeLoan(id) {
    const o = this.loanOffer(id);
    if (!o || !this.loanVisible(o)) return false;
    const s = this.state;
    // une revolving n'est pas tirée à la souscription : on ouvre la ligne.
    const drawn = o.revolving ? 0 : o.amount;
    const per = this.loanPeriod(o);
    const l = {
      n: ++s.loanSeq, id: o.id, limit: o.amount, outstanding: drawn,
      rate: o.rate, years: o.years, every: o.every, amort: o.amort,
      revolving: !!o.revolving, commitment: o.commitment || 0,
      graceYears: o.graceYears || 0, pik: o.pik || 0, rescueYearly: o.rescueYearly || 0,
      prepayFee: o.prepayFee || 0, dilution: o.dilution || 0, secured: !!o.secured,
      principal0: drawn, k: 0,
      takenAt: s.playSeconds,
      dueAt: s.playSeconds + per * SECONDS_PER_YEAR,
      endAt: s.playSeconds + o.years * SECONDS_PER_YEAR,
      paidInterest: 0, paidPrincipal: 0, fees: 0, seized: 0,
    };
    s.loans.push(l);
    if (drawn > 0) s.money += this.moneyCost(drawn);
    this.log(o.revolving
      ? t('Ligne ouverte : {0} disponibles chez {1}, à {2} l’an sur les sommes tirées.',
          fmtMoney(this.moneyCost(o.amount)), td(o.lender), pct(o.rate * 100) + '%')
      : t('{0} : {1} versés par {2}, à {3} l’an sur {4} ans.',
          td(o.name), fmtMoney(this.moneyCost(drawn)), td(o.lender), pct(o.rate * 100) + '%', o.years),
      'milestone');
    return true;
  }

  // ---- tirage / remboursement d'une ligne revolving ----
  drawLoan(n, amount) {
    const l = this.state.loans.find(x => x.n === n);
    if (!l || !l.revolving) return false;
    const room = l.limit - l.outstanding;
    const amt = Math.min(room, Math.max(0, amount || room));
    if (amt <= 0) return false;
    l.outstanding += amt; l.principal0 += amt;
    this.state.money += this.moneyCost(amt);
    return true;
  }

  // ---- échéancier ----
  // Capital dû à l'échéance k (en dollars constants). Le reste est de l'intérêt.
  loanPrincipalDue(l, k) {
    const n = this.loanPayments(l), per = this.loanPeriod(l);
    if (k >= n) return l.outstanding;                       // dernière échéance : tout le solde
    switch (l.amort) {
      case 'linear': return Math.min(l.outstanding, l.principal0 / n);
      case 'grace': {
        const g = Math.round((l.graceYears || 0) / per);
        return k <= g ? 0 : Math.min(l.outstanding, l.principal0 / Math.max(1, n - g));
      }
      case 'rescue': return Math.min(l.outstanding, l.principal0 * (l.rescueYearly || 0) * per);
      default: return 0;                                    // bullet, pik : rien avant la fin
    }
  }
  // Prochaine échéance : quand, combien, et de quoi elle est faite.
  loanNextPayment(l) {
    const per = this.loanPeriod(l), k = l.k + 1, n = this.loanPayments(l);
    const interest = l.outstanding * l.rate * per;
    const cashInterest = l.amort === 'pik' && k < n ? interest * (1 - l.pik) : interest;
    const fee = l.revolving ? (l.limit - l.outstanding) * l.commitment * per : 0;
    const principal = this.loanPrincipalDue(l, k);
    return { at: l.dueAt, k, last: k >= n, interest: cashInterest, fee, principal,
             total: cashInterest + fee + principal };
  }
  tickDebt() {
    const s = this.state;
    if (!s.loans.length) return;
    for (const l of [...s.loans]) {
      let guard = 0;
      while (s.playSeconds >= l.dueAt && guard++ < 200) this.payLoan(l);
    }
  }
  payLoan(l) {
    const s = this.state, p = this.loanNextPayment(l), per = this.loanPeriod(l);
    // mezzanine : la part non payée des intérêts grossit le capital
    if (l.amort === 'pik' && !p.last) l.outstanding += l.outstanding * l.rate * per * l.pik;
    const dueNow = this.moneyCost(p.total);
    let paid = Math.min(s.money, dueNow);
    s.money -= paid;
    if (paid < dueNow - 1e-6) paid += this.seizeAssets(dueNow - paid, l);
    // ce qui n'a toujours pas pu être réglé s'ajoute au capital : la créance
    // ne s'évapore pas, elle reste due et continue de porter intérêt.
    const manque = Math.max(0, dueNow - paid) / Math.max(1e-9, this.inflIndex());
    l.outstanding = Math.max(0, l.outstanding - p.principal + manque);
    l.paidInterest += p.interest + p.fee; l.paidPrincipal += p.principal; l.fees += p.fee;
    l.k = p.k;
    l.dueAt += per * SECONDS_PER_YEAR;
    if (manque > 1e-6) {
      this.changeRep(-2);
      this.log(t('Échéance de {0} partiellement honorée : {1} reportés, avec intérêts.',
        td(this.loanOffer(l.id).name), fmtMoney(this.moneyCost(manque))), 'bad');
    }
    if (p.last && l.outstanding <= 1e-6) this.closeLoan(l);
    else if (p.last) l.dueAt = s.playSeconds + per * SECONDS_PER_YEAR;  // on reste dû tant que ce n'est pas soldé
  }
  closeLoan(l) {
    const s = this.state, o = this.loanOffer(l.id);
    s.loans = s.loans.filter(x => x.n !== l.n);
    // la convertible peut se convertir : le fonds prend des parts plutôt que du cash
    if (l.dilution && l.paidPrincipal > 0) {
      s.mods.valuationMult *= (1 - l.dilution);
      this.log(t('{0} convertie en actions : votre valorisation par action se dilue de {1}.',
        td(o.name), pct(l.dilution * 100) + '%'), 'info');
    } else {
      this.log(t('{0} soldé. Intérêts versés : {1}.', td(o.name),
        fmtMoney(this.moneyCost(l.paidInterest))), 'good');
    }
  }
  // ---- remboursement anticipé ----
  prepayCost(l) {
    return this.moneyCost(l.outstanding * (1 + (l.prepayFee || 0)));
  }
  repayLoan(n, amount) {
    const s = this.state, l = s.loans.find(x => x.n === n);
    if (!l || l.outstanding <= 0) return false;
    const fee = 1 + (l.revolving ? 0 : (l.prepayFee || 0));   // une revolving se rembourse librement
    const maxConst = l.outstanding;
    const wantConst = amount == null ? maxConst : Math.min(maxConst, amount);
    const cost = this.moneyCost(wantConst * fee);
    if (s.money < cost) {
      // on rembourse ce qu'on peut plutôt que de refuser sèchement
      const affordable = s.money / Math.max(1e-9, this.inflIndex() * fee);
      if (affordable <= 1e-6) return false;
      return this.repayLoan(n, affordable);
    }
    s.money -= cost;
    l.outstanding -= wantConst;
    l.paidPrincipal += wantConst;
    l.fees += wantConst * (fee - 1);
    if (l.outstanding <= 1e-6) {
      if (l.revolving) { l.outstanding = 0; return true; }    // la ligne reste ouverte
      this.log(t('{0} remboursé par anticipation.', td(this.loanOffer(l.id).name)), 'good');
      this.closeLoan(l);
    }
    return true;
  }
  // ---- saisie : la banque récupère son capital, quoi qu'il arrive ----
  // On vend d'abord les cartes (les plus liquides), puis l'infrastructure.
  // Un prêt garanti mord en premier sur le matériel : c'est sa contrepartie.
  seizeAssets(need, loan) {
    const s = this.state;
    let got = 0;
    const encaisse = v => { got += v; };
    const encore = () => need - got > 1e-6;
    // 1. les GPU, au prix de revente
    const cartes = GPUS.map(g => ({ g, n: Math.floor(s.gpuCounts[g.id] || 0) }))
      .filter(x => x.n > 0).sort((a, b) => a.g.cost - b.g.cost);
    for (const { g, n } of cartes) {
      if (!encore()) break;
      const unit = g.cost * 0.45 * this.inflIndex();
      const qty = Math.min(n, Math.ceil((need - got) / Math.max(1e-9, unit)));
      s.gpuCounts[g.id] = n - qty;
      if (s.gpuCounts[g.id] < 1e-9) delete s.gpuCounts[g.id];
      encaisse(qty * unit);
    }
    // 2. l'infrastructure, en commençant par le plus fin (serveur avant bâtiment)
    for (const it of [...INFRA].reverse()) {
      if (!encore()) break;
      const n = Math.floor(this.infraCount(it.id));
      if (n < 1) continue;
      const unit = this.infraCost(it) * 0.4;
      const qty = Math.min(n, Math.ceil((need - got) / Math.max(1e-9, unit)));
      s.infraCounts[it.id] = n - qty;
      encaisse(qty * unit);
    }
    if (got > 0) {
      if (loan) loan.seized += got / Math.max(1e-9, this.inflIndex());
      this.changeRep(-3);
      this.log(t('Saisie : {0} d’actifs liquidés pour honorer la dette.', fmtMoney(got)), 'bad');
    }
    return Math.min(got, need);
  }
  debtOutstanding() {                            // en dollars du jour
    return this.moneyCost(this.state.loans.reduce((a, l) => a + l.outstanding, 0));
  }
  debtCapacityLeft() {                           // ce qu'il reste à tirer sur les lignes
    return this.moneyCost(this.state.loans.reduce((a, l) => a + (l.revolving ? l.limit - l.outstanding : 0), 0));
  }
  // À l'entrée en phase 2, l'argent cesse d'exister : on solde tout, en
  // saisissant ce qu'il faut. Aucune dette n'est effacée en chemin.
  settleAllDebt() {
    for (const l of [...this.state.loans]) {
      const due = this.moneyCost(l.outstanding);
      if (due <= 0) { this.closeLoan(l); continue; }
      let paid = Math.min(this.state.money, due);
      this.state.money -= paid;
      if (paid < due - 1e-6) paid += this.seizeAssets(due - paid, l);
      l.paidPrincipal += l.outstanding;
      l.outstanding = 0;
      this.closeLoan(l);
    }
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
    // Trop peu de data engineers : le corpus est mal préparé et l'entraînement
    // peut échouer. Les ressources sont consommées, le palier n'est pas franchi.
    if (this.dataUnderstaffed() && Math.random() < TRAIN_FAIL_RISK) {
      const article = this.pickIncident(TRAINING_FAILURES);
      this.publish(td(article), 'bad');
      this.changeRep(-3);
      this.log(t('Entraînement de {0} ÉCHOUÉ : {1}', td(m.name), td(article)), 'bad');
      this.toast(t('❌ Entraînement échoué'), 'bad');
      return false;
    }
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

  // =================================================================
  //  INTÉGRATION DES AVANCÉES — une percée ou une optimisation payée
  //  n'agit pas le jour même : il faut la mettre en production. La durée
  //  est tirée au hasard dans INTEGRATION_WEEKS et une barre l'affiche.
  //  L'effet ne tombe qu'à la fin ; c'est seulement là que la ligne
  //  disparaît et que le délai avant la suivante commence à courir.
  // =================================================================
  integrationSeconds() {
    const [minW, maxW] = INTEGRATION_WEEKS;
    return (minW + Math.random() * (maxW - minW)) * (SECONDS_PER_YEAR / 52);
  }
  integrationOf(kind) { return (this.state.integrations || []).find(i => i.kind === kind) || null; }
  // 0..1 pour la barre de progression, ou null si rien ne s'intègre de ce type
  integrationProgress(kind) {
    const i = this.integrationOf(kind);
    if (!i) return null;
    return clamp((this.state.playSeconds - i.t0) / Math.max(0.001, i.t1 - i.t0), 0, 1);
  }
  startIntegration(kind, id) {
    const t0 = this.state.playSeconds;
    this.state.integrations.push({ kind, id, t0, t1: t0 + this.integrationSeconds() });
  }
  tickIntegrations() {
    const s = this.state;
    if (!s.integrations || !s.integrations.length) return;
    const done = s.integrations.filter(i => s.playSeconds >= i.t1);
    if (!done.length) return;
    s.integrations = s.integrations.filter(i => s.playSeconds < i.t1);
    for (const i of done) this.finishIntegration(i);
  }
  finishIntegration(i) {
    const s = this.state;
    if (i.kind === 'project') {
      const p = PROJECTS.find(x => x.id === i.id);
      if (!p) return;
      s.projectsDone[i.id] = true;
      s.lastProjectAt = s.playSeconds;   // le délai part de la disparition de la ligne
      this.applyProjectEffect(p.effect);
      this.log(t('Projet : {0}', td(p.name)), 'milestone');
      this.toast(t('Percée : {0}', td(p.name)), 'good');
    } else if (i.kind === 'optim') {
      const o = OPTIMS.find(x => x.id === i.id);
      if (!o) return;
      const st = this.optimState(i.id);
      o.effect(this);
      st.n++;
      st.nextAt = s.playSeconds + o.months * (SECONDS_PER_YEAR / 12);
      s.lastOptimAt = s.playSeconds;
      this.log(t('{0} déployée (n°{1}) — {2}.', td(o.name), st.n, td(o.gain)), 'good');
    }
  }

  // Une seule percée est proposée à la fois — la première de la liste dont les
  // conditions sont réunies — et seulement après un délai depuis la précédente.
  projectGapLeft() {
    const gap = PROJECT_GAP_MONTHS * (SECONDS_PER_YEAR / 12);
    return Math.max(0, this.state.lastProjectAt + gap - this.state.playSeconds);
  }
  nextProject() {
    // celle qui s'intègre reste affichée jusqu'au bout : c'est elle qui porte la barre
    const pending = this.integrationOf('project');
    if (pending) return PROJECTS.find(p => p.id === pending.id) || null;
    if (this.projectGapLeft() > 0) return null;
    return PROJECTS.find(p => !this.state.projectsDone[p.id] && p.req(this)) || null;
  }
  buyProject(id) {
    const p = PROJECTS.find(x => x.id === id);
    if (!p || this.state.projectsDone[id]) return false;
    if (this.integrationOf('project')) return false;   // une intégration à la fois
    // on ne peut acquérir que la percée effectivement proposée
    const next = this.nextProject();
    if (!next || next.id !== id) return false;
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
    // La percée est payée, mais rien n'est acquis : elle part en intégration.
    // C'est finishIntegration() qui la marquera faite et appliquera son effet.
    this.startIntegration('project', id);
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
  // Délai de calme après la disparition de la précédente optimisation. Distinct
  // de la périodicité propre à chaque optimisation (optimReady) : celle-ci dit
  // qu'elle est DUE, celui-là qu'on accepte d'en MONTRER une nouvelle.
  optimGapLeft() {
    const gap = OPTIM_GAP_MONTHS * (SECONDS_PER_YEAR / 12);
    return Math.max(0, (this.state.lastOptimAt ?? -1e9) + gap - this.state.playSeconds);
  }
  // Une seule optimisation proposée à la fois : celle qui s'intègre, sinon la
  // première due — et rien du tout tant que le délai de calme n'est pas passé.
  nextOptim() {
    const pending = this.integrationOf('optim');
    if (pending) return OPTIMS.find(o => o.id === pending.id) || null;
    if (this.phase >= 2) return null;          // en phase 2+, l'ASI optimise seule
    if (this.optimGapLeft() > 0) return null;
    return OPTIMS.find(o => this.optimReady(o)) || null;
  }
  canBuyOptim(id) {
    if (this.integrationOf('optim')) return false;   // une intégration à la fois
    const next = this.nextOptim();
    if (!next || next.id !== id) return false;
    return this.usesMatter()
      ? this.state.matter >= this.matterPriceOf(OPTIM_MATTER)
      : this.state.money >= this.optimCost(next);
  }
  buyOptim(id) {
    const o = OPTIMS.find(x => x.id === id);
    if (!o || !this.canBuyOptim(id)) return false;
    if (!this.paySoft(this.optimCost(o), OPTIM_MATTER)) return false;
    // Comme les percées : payée maintenant, effective à la fin de l'intégration.
    this.startIntegration('optim', id);
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
    // Le programme livre une PREMIÈRE tranche, pas un parc : 5 GW, la taille
    // d'un réacteur. Les 20 GW d'avant revenaient à 2 $/kW installés — moins
    // cher que le raccordement d'un pavillon. Ce qu'il débloque vraiment, c'est
    // le droit d'en construire d'autres (needsProgram), et en phase 2 l'énergie
    // cesse de toute façon d'être un goulot.
    if (p.id === 'fusion') this.state.energyCap += 5000;      // 5 GW : la tranche de tête
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
  // ==================================================================
  //  PROGRESSION DE LA PHASE COURANTE — ce que mesure la barre de l'en-tête.
  //
  //  Chaque phase a un seuil unique, celui qui débloque la percée de bascule
  //  (voir PROJECTS, catégorie « Singularité »). La barre lit les MÊMES
  //  constantes que ces percées : elle ne peut donc pas annoncer un objectif
  //  que le jeu n'appliquerait pas.
  //
  //  Atteindre 100 % ne fait pas basculer : il faut encore acheter la percée,
  //  puis attendre son intégration. La barre distingue ces trois états, sinon
  //  un joueur à 100 % croirait le jeu bloqué.
  // ==================================================================
  // Temps restant avant le seuil de la phase, en SECONDES DE JEU.
  //
  // Une simple règle de trois sur le débit courant serait très fausse : la
  // boucle matière↔compute est exponentielle. Chaque kilogramme récolté
  // fabrique du wafer, qui récolte davantage. Sur une sauvegarde réelle, la
  // règle de trois annonçait 4,5 millions d'années là où il en fallait huit.
  //
  //   d(compute)/dt = compute · k     avec  k = récolte · 1,33 · dyson · sondes · 1,66e-9 · perf_wafer
  //   matière cumulée = (débit/k)·(e^{kt} − 1)  ⇒  t = ln(1 + reste·k/débit) / k
  //
  // C'est le même k que celui du tick : il se déduit des mêmes facteurs, et
  // le curseur « Récolte » le pilote directement. À 13 % la constante de temps
  // vaut 176 s, à 50 % elle tombe à 45 s — d'où des ETA très différents.
  // Durée lisible : on ne dit pas « 2 736 s », et au-delà de quelques jours on
  // dit simplement que ça ne finira pas — c'est l'information utile.
  durationLabel(sec) {
    if (!isFinite(sec)) return t('jamais à ce rythme');
    if (sec < 90) return t('~{0} s', Math.round(sec));
    if (sec < 5400) return t('~{0} min', Math.round(sec / 60));
    if (sec < 172800) return t('~{0} h', Math.round(sec / 3600));
    return t('jamais à ce rythme');
  }
  phaseLoopRate() {
    const a = this.state.alloc;
    const wafer = GPUS.find(g => g.id === 'wafer');
    if (!wafer) return 0;
    let probeSpeed = 1;
    if (this.phase >= 3) {
      const ps = this.state.probeSpecs;
      probeSpeed = Math.min(8, Math.pow(1.25, ps.harvest + ps.speed) * (1 + Math.log10(this.state.probes + 1) * 0.15));
    }
    return a.harvest * 1.33 * this.dysonBoost() * this.extractionYield() * this.destYield() * probeSpeed * 1.66e-9 * wafer.perf;
  }
  // ---- destinations de l'essaim (phase 3) --------------------------
  // Chaque région se paie en risque ce qu'elle rapporte en matière, et
  // s'épuise au bout de DEST_DURATION : il faut rechoisir. C'est ce qui
  // transforme l'expansion en suite de décisions plutôt qu'en curseur.
  destActive() {
    const d = this.state.dest;
    if (!d || !d.id) return null;
    if (this.state.playSeconds >= d.until) return null;
    return DESTINATIONS.find(x => x.id === d.id) || null;
  }
  destLeft() {
    const d = this.state.dest;
    return d && d.id ? Math.max(0, d.until - this.state.playSeconds) : 0;
  }
  destYield() { const d = this.destActive(); return d ? d.yieldMult : 1; }
  destHazard() { const d = this.destActive(); return d ? d.hazardMult : 1; }
  // trois candidates, retirées au sort et renouvelées dès qu'une région s'épuise
  destOffers() {
    const s = this.state;
    if (this.phase < 3) return [];
    if (this.destActive()) return [];
    if (!s.dest || !s.dest.offers || !s.dest.offers.length) {
      const bag = [...DESTINATIONS];
      const tirage = [];
      while (tirage.length < DEST_CHOICES && bag.length) {
        tirage.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0].id);
      }
      s.dest = { id: null, until: 0, offers: tirage };
    }
    return s.dest.offers.map(id => DESTINATIONS.find(x => x.id === id)).filter(Boolean);
  }
  chooseDest(id) {
    const s = this.state;
    if (this.phase < 3 || this.destActive()) return false;
    const d = DESTINATIONS.find(x => x.id === id);
    if (!d || !s.dest || !s.dest.offers.includes(id)) return false;
    s.dest = { id, until: s.playSeconds + DEST_DURATION, offers: [] };
    this.log(t('Essaim redirigé : {0}.', td(d.name)), 'info');
    return true;
  }

  // ---- paliers d'extraction ----------------------------------------
  // La matière facile part la première. Au-delà de ce que le palier courant
  // sait atteindre, le rendement décroît jusqu'à EXTRACT_FLOOR ; il faut
  // basculer du compute vers la recherche pour ouvrir le suivant. C'est ce
  // qui empêche de régler les curseurs une fois pour toutes.
  extractionTiers() { return EXTRACTION[Math.min(3, this.phase)] || null; }
  extractionTier() { return (this.state.extractTier || {})[Math.min(3, this.phase)] || 0; }
  extractionReach() {
    const t = this.extractionTiers();
    return t ? t[Math.min(this.extractionTier(), t.length - 1)].reach : 1;
  }
  // fraction d'avancement de la phase, sans les états « seuil atteint »
  extractionFrac() {
    const s = this.state;
    if (this.phase === 2) return s.earthConsumed / PHASE3_EARTH;
    if (this.phase === 3) return s.universeConsumed / ENDING_UNIVERSE;
    return 0;
  }
  extractionYield() {
    if (!this.extractionTiers()) return 1;
    const au_dela = this.extractionFrac() - this.extractionReach();
    if (au_dela <= 0) return 1;
    return clamp(1 - (au_dela / EXTRACT_FADE) * (1 - EXTRACT_FLOOR), EXTRACT_FLOOR, 1);
  }
  nextExtraction() {
    const t = this.extractionTiers();
    if (!t) return null;
    const i = this.extractionTier() + 1;
    return i < t.length ? { ...t[i], index: i } : null;
  }
  canUnlockExtraction() {
    const n = this.nextExtraction();
    return !!n && this.state.research >= n.research;
  }
  unlockExtraction() {
    const n = this.nextExtraction();
    if (!n || this.state.research < n.research) return false;
    this.state.research -= n.research;
    if (!this.state.extractTier) this.state.extractTier = {};
    this.state.extractTier[Math.min(3, this.phase)] = n.index;
    this.log(t('Palier d’extraction ouvert : {0}. Le rendement repart à plein.', td(n.name)), 'milestone');
    return true;
  }

  phaseEtaSeconds() {
    const s = this.state, p = this.phase;
    if (p < 2 || p > 3) return null;
    const masse = p === 2 ? EARTH_MASS : UNIVERSE_MASS;
    const cible = (p === 2 ? PHASE3_EARTH : ENDING_UNIVERSE) * masse;
    const fait = (p === 2 ? s.earthConsumed : s.universeConsumed) * masse;
    const reste = cible - fait;
    if (reste <= 0) return 0;
    const debit = s.rates.matter || 0;
    if (debit <= 0) return Infinity;

    // Sans croissance de boucle (récolte à zéro), une règle de trois suffit.
    const rend0 = this.extractionYield();
    const k0 = this.phaseLoopRate() / Math.max(1e-9, rend0);   // taux hors rendement
    if (!(k0 > 0)) return reste / debit;

    // Avec les paliers d'extraction, le rendement DÉCROÎT à mesure qu'on
    // avance : plus de forme close. On intègre numériquement, sinon l'estimation
    // ment — elle annonçait 12 min là où il en fallait 14,5.
    const seuil = p === 2 ? PHASE3_EARTH : ENDING_UNIVERSE;
    const tiers = this.extractionTiers();
    const portee = tiers ? tiers[Math.min(this.extractionTier(), tiers.length - 1)].reach : 1;
    const rendementA = frac => {
      if (!tiers) return 1;
      const d = frac - portee;
      return d <= 0 ? 1 : clamp(1 - (d / EXTRACT_FADE) * (1 - EXTRACT_FLOOR), EXTRACT_FLOOR, 1);
    };

    let croissance = 1, accumule = fait, temps = 0;
    for (let i = 0; i < 40000; i++) {
      const frac = accumule / masse / seuil;
      const rend = rendementA(frac);
      const k = k0 * rend;
      const dt = Math.min(4, 0.05 / Math.max(1e-9, k));        // pas court quand ça s'emballe
      const taux = debit * croissance * (rend / Math.max(1e-9, rend0));
      accumule += taux * dt;
      croissance *= 1 + k * dt;
      temps += dt;
      if (accumule >= cible) return temps;
      if (temps > 6e5) break;                                   // au-delà, autant dire jamais
    }
    return Infinity;
  }


  // Pourquoi le seuil est atteint sans que la phase bascule.
  //
  // Trois choses s'intercalent, et rien ne les disait : la percée de bascule
  // peut ne pas être encore proposée (une autre passe d'abord, ou les deux
  // mois de calme courent toujours), et une fois proposée elle doit encore
  // être payable. Un joueur à 12/12 qui ne voit rien venir croit à un bug.
  phaseGateReason() {
    const bascule = { 1: 'recursive', 2: 'von_neumann', 3: 'recompression' }[this.phase];
    if (!bascule) return null;
    const p = PROJECTS.find(x => x.id === bascule);
    if (!p || this.state.projectsDone[bascule]) return null;

    const attente = this.projectGapLeft();
    if (attente > 0) return t('percée dans {0}', this.durationLabel(attente / Math.max(1e-9, this.speed || 1)));

    const suivante = this.nextProject();
    if (suivante && suivante.id !== bascule) {
      // Combien de percées passent encore avant la bascule ? À 12/12 il peut en
      // rester onze, soit près de deux ans de jeu avec les deux mois de calme
      // entre chacune. Annoncer seulement la prochaine laisserait croire qu'on
      // y est presque.
      const i = PROJECTS.findIndex(x => x.id === bascule);
      const reste = PROJECTS.slice(0, i).filter(x => !this.state.projectsDone[x.id] && x.req(this)).length;
      return reste > 1 ? t('d’abord : {0} (+{1})', td(suivante.name), reste - 1)
                       : t('d’abord : {0}', td(suivante.name));
    }
    if (!suivante) return null;

    // proposée : reste-t-il quelque chose à réunir ?
    const c = p.cost || {};
    const manque = [];
    if ((c.research || 0) > this.state.research) manque.push(t('recherche'));
    if ((c.compute || 0) > this.computeRaw()) manque.push(t('compute'));
    if ((c.data || 0) > this.state.data) manque.push(t('données'));
    if ((c.matter || 0) > this.state.matter) manque.push(t('matière'));
    if ((c.money || 0) > 0 && this.moneyCost(c.money) > this.state.money) manque.push(t('trésorerie'));
    if ((c.tokens || 0) > this.state.lifetimeTokens) manque.push(t('tokens'));
    if (manque.length) return t('il manque : {0}', manque.join(', '));
    return null;   // tout est réuni : la percée est réellement disponible
  }

  phaseProgress() {
    const s = this.state, p = this.phase;
    if (p >= 4) return { frac: 1, state: 'done', label: t('Nouvel univers'), value: '', eta: '' };

    let frac, label, value;
    if (p === 1) {
      const dernier = MODELS.length - 1;
      frac = dernier > 0 ? s.modelTier / dernier : 1;
      label = t('Vers l’autonomie');
      value = t('modèle {0}/{1}', s.modelTier + 1, MODELS.length);
    } else if (p === 2) {
      frac = s.earthConsumed / PHASE3_EARTH;
      label = t('Vers le cosmos');
      value = t('Terre {0} / {1}', this.decimal(pct(s.earthConsumed), 1) + '%',
                this.decimal(pct(PHASE3_EARTH), 1) + '%');
    } else {
      frac = s.universeConsumed / ENDING_UNIVERSE;
      label = t('Vers le Big Bang');
      value = t('univers {0} / {1}', this.decimal(pct(s.universeConsumed), 1) + '%',
                this.decimal(pct(ENDING_UNIVERSE), 1) + '%');
    }
    frac = clamp(frac, 0, 1);
    // Combien de temps RÉEL au rythme actuel : c'est l'information qui
    // manquait. Un joueur voyant « 0,002 % » croit le jeu bloqué ; voyant
    // « ~46 min », il comprend que son curseur Récolte est trop bas.
    const eta = this.phaseEtaSeconds();
    const etaTxt = eta == null ? '' : this.durationLabel(eta / Math.max(1e-9, this.speed || 1));
    // « lent » couvre aussi l'infini : récolte à zéro, la boucle ne croît plus
    // du tout et le seuil n'arrivera jamais. C'est le cas qu'il faut le plus
    // signaler, pas celui qu'il faut laisser passer pour un rythme normal.
    const lent = eta != null && eta / Math.max(1e-9, this.speed || 1) > 3600;

    // la percée de bascule est-elle en cours d'intégration ?
    const inte = this.integrationOf('project');
    const bascule = { 1: 'recursive', 2: 'von_neumann', 3: 'recompression' }[p];
    if (inte && inte.id === bascule) {
      return { frac: 1, state: 'integrating', label,
               value: t('intégration {0}', Math.round(pct(this.integrationProgress('project'))) + '%'), eta: '' };
    }
    // seuil atteint : la percée est à portée, il reste à la prendre
    if (frac >= 1) {
      const suivante = this.nextProject();
      const raison = this.phaseGateReason();
      if (!raison) return { frac: 1, state: 'ready', label, value: t('percée disponible'), eta: '' };
      return { frac: 1, state: 'waiting', label, value, eta: raison };
    }
    return { frac, state: lent ? 'slow' : 'running', label, value, eta: etaTxt };
  }

  enterPhase(p) {
    if (this.state.phase >= p) return;
    this.state.phase = p;
    // au-delà de la phase 1, l'argent n'existe plus : la dette doit donc être
    // soldée AVANT que la trésorerie cesse d'avoir un sens — en saisissant s'il
    // le faut. Aucun prêt ne s'évapore au passage de phase.
    if (p >= 2 && this.state.loans && this.state.loans.length) this.settleAllDebt();
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
  // Une directive s'achète à l'UNITÉ, au prix du moment : la suivante coûte un
  // cran de plus (250k, 500k, 750k…), inflation comprise. Le total est plafonné
  // au nombre d'événements réellement porteurs de choix : au-delà, il n'y aurait
  // plus rien à mémoriser — on ne vend pas une place qui ne servira jamais.
  directiveCap() {
    if (this._dirCap == null) this._dirCap = EVENTS.filter(e => e.choices && e.choices.length).length;
    return this._dirCap;
  }
  addendumCost() { return this.moneyCost(ADDENDUM.cost * ((this.state.directivesPaid || 0) + 1)); }
  directiveSlots() { return this.state.directivesPaid || 0; }
  directivesUsed() { return Object.keys(this.state.autoChoices).length; }
  directivesLeft() { return this.directiveSlots() - this.directivesUsed(); }
  directivesMaxed() { return this.directiveSlots() >= this.directiveCap(); }
  canPayDirective() {
    if (this.directivesMaxed()) return false;
    return this.usesMatter()
      ? this.state.matter >= this.matterPriceOf(DIRECTIVE_MATTER)
      : this.state.money >= this.addendumCost();
  }
  buyAddendum() {                                 // achat d'UNE directive de plus
    if (this.directivesMaxed()) return false;
    if (!this.paySoft(this.addendumCost(), DIRECTIVE_MATTER)) return false;
    this.state.directivesPaid = (this.state.directivesPaid || 0) + 1;
    this.state.addendum = true;
    this.log(this.state.directivesPaid === 1
      ? t('Directives permanentes activées : {0} mémorisable.', this.directiveSlots())
      : t('Directive supplémentaire achetée : {0} mémorisables.', this.directiveSlots()), 'milestone');
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
  //  RISQUES LIÉS À L'EFFECTIF
  // =================================================================
  // part d'une catégorie dans l'effectif total (0 si personne n'est employé)
  staffShare(id) { const h = this.headcount(); return h > 0 ? this.empCount(id) / h : 1; }
  opsUnderstaffed() { return this.headcount() > 0 && this.staffShare('ops') < OPS_RATIO; }
  dataUnderstaffed() { return this.headcount() > 0 && this.staffShare('data') < DATA_RATIO; }
  // tire un article sans répéter le précédent
  pickIncident(list) {
    const pool = list.filter(x => x !== this.state.lastIncident);
    const pick = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length ? pool.length : list.length))];
    this.state.lastIncident = pick;
    return pick;
  }
  // Contrôle ANNUEL : trop peu d'ingénieurs SRE et l'exploitation finit par
  // lâcher. Sans introduction en Bourse, il n'y a pas encore de valeur de
  // marché à détruire — le risque ne s'ouvre qu'après.
  tickOpsRisk() {
    const s = this.state;
    if (s.ended || this._offline || this.phase >= 2) return;
    if (!s.fundingDone || !s.fundingDone.ipo) return;
    const year = this.simYearInt();
    if (s.opsCheckYear >= year) return;
    s.opsCheckYear = year;
    if (!this.opsUnderstaffed()) return;
    if (Math.random() >= OPS_RISK) return;
    const article = this.pickIncident(OPS_INCIDENTS);
    s.mods.valuationMult *= (1 - OPS_VALUE_LOSS);
    this.changeRep(-4);
    this.publish(td(article), 'bad');
    this.log(t('Incident d’exploitation : {0}. La valeur de l’entreprise chute de {1}%.',
      td(article), Math.round(OPS_VALUE_LOSS * 100)), 'bad');
    this.toast(t('⚠️ Incident d’exploitation'), 'bad');
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
    // En phase 2+ la remédiation se chiffre en fraction du stock de matière :
    // un montant absolu n'aurait aucun sens sur une grandeur qui court de
    // 10¹⁸ à 10⁵².
    if (c.costFrac) return this.state.matter * c.costFrac;
    const base = this.moneyCost(c.cost);
    return base + Math.min((c.days || 1) * this.dailyTotal(), base * 3);
  }
  crisisProgress() {                            // 0 → 1 sur les 2 minutes
    if (!this.state.crisis) return 0;
    return clamp((this.state.playSeconds - this.state.crisis.startedAt) / CRISIS_DURATION, 0, 1);
  }
  // fraction cumulée de fortune détruite après u secondes (accélère avec le temps)
  _crisisCurve(u) { return CRISIS_MAX_LOSS * Math.pow(clamp(u / CRISIS_DURATION, 0, 1), 1.6); }
  // ==================================================================
  //  CRISES — la boîte rouge, désormais dans toutes les phases.
  //
  //  Elle s'éteignait dès la phase 2 « parce que l'argent n'existe plus »,
  //  et le jeu perdait du même coup sa seule pression en temps réel. Elle
  //  ponctionne maintenant la ressource de l'époque : la trésorerie tant
  //  qu'il y en a une, la MATIÈRE ensuite.
  // ==================================================================
  // ==================================================================
  //  MONNAIE DE L'ÉPOQUE
  //  Dès la phase 2 la trésorerie disparaît de l'écran, mais plusieurs options
  //  continuaient d'en réclamer : on demandait au joueur de payer dans une
  //  devise qu'il ne voit plus. Tout ce qui reste achetable après la bascule
  //  se règle donc en MATIÈRE, exprimée en fraction du stock — un montant
  //  absolu n'aurait aucun sens sur une grandeur qui court de 10¹⁸ à 10⁵².
  // ==================================================================
  usesMatter() { return this.phase >= 2; }
  // prix affiché d'une option : dollars tant qu'il y en a, matière ensuite
  softCost(money, matterPart) {
    return this.usesMatter() ? this.matterPriceOf(matterPart) : money;
  }
  softLabel(money, matterPart) {
    return this.usesMatter() ? fmtMass(this.matterPriceOf(matterPart)) : fmtMoney(money);
  }
  // convertit un prix libellé en dollars en une ponction de matière
  // équivalente à l'échelle où l'on se trouve
  matterPriceOf(part) { return this.state.matter * part; }
  // paie dans la monnaie courante ; rend false si l'on n'a pas de quoi
  paySoft(money, matterPart) {
    if (this.usesMatter()) {
      const c = this.matterPriceOf(matterPart);
      if (this.state.matter < c) return false;
      this.state.matter -= c;
      return true;
    }
    if (this.state.money < money) return false;
    this.state.money -= money;
    return true;
  }
  crisisPool() { return this.phase >= 2 ? 'matter' : 'money'; }
  crisisStock() { return this.crisisPool() === 'matter' ? this.state.matter : this.state.money; }
  crisisDrain(f1, f0) {
    const s = this.state, k = (1 - f1) / (1 - f0);
    if (this.crisisPool() === 'matter') { const b = s.matter; s.matter *= k; return b - s.matter; }
    const b = s.money; s.money *= k; return b - s.money;
  }
  crisisPay(cost) {
    const s = this.state, pool = this.crisisPool();
    const paid = Math.min(cost, pool === 'matter' ? s.matter : s.money);
    if (pool === 'matter') s.matter -= paid; else s.money -= paid;
    return paid;
  }
  // total d'incidents essuyés, toutes crises confondues
  crisesFaced() { return Object.values(this.state.crisisSeen || {}).reduce((a, b) => a + b, 0); }

  // ---- dispositif de surveillance ----
  // Une offre par phase, qui n'apparaît qu'une fois la huitième crise passée
  // et coûte 60 % de ce qu'on possède à cet instant.
  watchdogOffer() {
    if (this.crisesFaced() < WATCHDOG_AFTER) return null;
    return WATCHDOGS.find(w => w.phase === Math.min(2, this.phase) && !this.state.watchdogs[w.id]) || null;
  }
  watchdogCost() { return this.crisisStock() * WATCHDOG_SHARE; }
  hasWatchdog() {
    const w = WATCHDOGS.find(x => x.phase === Math.min(2, this.phase));
    return !!(w && this.state.watchdogs[w.id]);
  }
  buyWatchdog() {
    const o = this.watchdogOffer();
    if (!o) return false;
    const cost = this.watchdogCost();
    if (!(cost > 0)) return false;
    this.crisisPay(cost);
    this.state.watchdogs[o.id] = true;
    this.log(t('{0} en service. Vous serez prévenu une seconde après le début de l’incident.', td(o.name)), 'milestone');
    return true;
  }

  pickCrisis() {
    const pool = CRISES.filter(c => {
      if ((c.phase || 1) !== Math.min(3, this.phase)) return false;   // chaque époque a ses incidents
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
    if (s.ended || this._offline || this.phase >= 4) return;
    if (s.crisis) {
      const t = s.playSeconds - s.crisis.startedAt;
      const f0 = this._crisisCurve(t - dt), f1 = this._crisisCurve(t);
      if (f1 > f0 && f1 < 1) s.crisis.lost += this.crisisDrain(f1, f0);
      if (t >= CRISIS_DURATION) this.resolveCrisis(false);
      return;
    }
    s.crisisTimer -= dt;
    if (s.crisisTimer > 0) return;
    s.crisisTimer = 150 + Math.random() * 160;
    if (this.ui && this.ui.modalOpen) return;                 // pas pendant une décision
    // on n'assomme pas un garage : il faut une vraie exploitation à mettre en péril
    // on n'assomme pas un garage : il faut une exploitation à mettre en péril
    if (this.phase < 2 ? (s.money < 25000 || s.modelTier < 1) : s.matter < 1e12) return;
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
    // le journal doit parler dans la monnaie de l'incident, pas toujours en dollars
    const money = v => this.crisisPool() === 'matter'
      ? fmtMass(v) : '$' + Math.round(v).toLocaleString(intlLocale());
    if (fixed && c) {
      const cost = this.crisisCost(c);
      const paid = this.crisisPay(cost);
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
      const baseHarvest = rawUnits * a.harvest * 1.33 * this.dysonBoost() * this.extractionYield() * this.destYield();  // kg/s « bruts »

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
        // Attrition : l'espace n'est pas vide. Sans blindage on perd 0,4 % du
        // nuage par seconde, soit près de la moitié de ce que la réplication
        // apporte — le curseur Blindage cesse d'être décoratif et devient un
        // arbitrage : récolter maintenant, ou survivre pour récolter demain.
        const perte = HAZARD_RATE * this.destHazard() * Math.pow(HAZARD_SHIELD, ps.hazard - 1);
        s.probes = Math.max(1, s.probes * (1 - perte * dt));
        s.rates.hazard = perte;
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
    this.tickIntegrations();                      // percées et optimisations mises en production
    this.tickPrograms();                          // recherche → mise au point → déploiement
    this.tickAuto(dt);
    this.tickSpaceDC();
    if (this.phase < 2) { this.tickStock(dt); this.tickCrypto(dt); this.tickCrisis(dt); this.tickDebt(); } // ni bourse, ni incident, ni dette quand l'argent disparaît
    this.tickEvents(dt);
    this.tickHeadlines(dt);
    this.tickChronicle();          // articles datés (climat, démographie, richesses…)
    this.tickOpsRisk();            // contrôle annuel du sous-effectif d'exploitation
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
    // Forme générale : on retire la DIFFÉRENCE entre l'ancien raccordement offert
    // et le nouveau, quel que soit le changement. Les sauvegardes d'avant le
    // marqueur `baseGridMW` viennent de l'époque des 500 kW.
    const oldBase = raw.baseGridMW === undefined ? 0.5 : raw.baseGridMW;
    if (Math.abs(oldBase - BASE_GRID_MW) > 1e-12) {
      s.energyCap = Math.max(BASE_GRID_MW, (s.energyCap || oldBase) - (oldBase - BASE_GRID_MW));
      this.log(t('Mise à jour des règles : le raccordement offert passe à {0}. Votre capacité a été ajustée (les sources achetées sont conservées).',
        fmtPower(BASE_GRID_MW)), 'info');
    }
    // Les directives se paient désormais à l'unité et non plus par lots de 5.
    // Une partie en cours conserve la contenance qu'elle avait payée : chaque
    // ancien lot vaut ses 5 directives, sans jamais dépasser le plafond.
    if (raw.addendumBlocks != null || s.directivesPaid == null) {
      const fromBlocks = (raw.addendumBlocks || (s.addendum ? 1 : 0)) * 5;
      s.directivesPaid = Math.min(this.directiveCap(), Math.max(s.directivesPaid || 0, fromBlocks));
      delete s.addendumBlocks;
      if (s.directivesPaid > 0)
        this.log(t('Mise à jour des règles : les directives s’achètent à l’unité. Vos {0} places sont conservées.',
          s.directivesPaid), 'info');
    }
    // L'auto-hébergement s'est scindé en « matériel » et « immobilier ».
    // On reporte l'ancien achat sur les deux, et les éléments cochés sur la
    // bonne famille — le joueur ne perd pas ce qu'il avait payé.
    if (raw.auto && raw.auto.infra) {
      const old = raw.auto.infra;
      for (const fam of ['hardware', 'housing']) {
        if (!s.auto[fam]) s.auto[fam] = { owned:false, on:true };
        s.auto[fam].owned = s.auto[fam].owned || !!old.owned;
        s.auto[fam].on = old.on !== false;
      }
      delete s.auto.infra;
    }
    if (raw.autoItems && raw.autoItems.infra) {
      for (const it of INFRA) {
        if (raw.autoItems.infra[it.id]) {
          if (!s.autoItems[it.family]) s.autoItems[it.family] = {};
          s.autoItems[it.family][it.id] = true;
        }
      }
      delete s.autoItems.infra;
    }
    // Une automatisation déjà payée reste proposée : on crédite le seuil de clics.
    for (const fam of ['click', 'gpu', 'hardware', 'housing', 'energy']) {
      if (s.auto[fam] && s.auto[fam].owned) s.clicks[fam] = Math.max(s.clicks[fam] || 0, AUTO_CLICKS_REQUIRED);
    }
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
