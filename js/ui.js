// =====================================================================
//  TokenWar — INTERFACE
// =====================================================================
import { MODELS, GPUS, ENERGY, PROJECTS, PROBE_SPECS, INFRA, EMPLOYEES, COLO, AUTOMATIONS, ACHIEVEMENTS, ADDENDUM, SPACE_DC, UNIVERSE_MASS, OPTIMS, HELP, PROGRAMS, SOVEREIGN,
         CRISIS_DURATION, IDLE_DELAY, UNPAID_QUIT_DAYS, GAME_SPEEDS, LOANS,
         WATCHDOGS, WATCHDOG_DELAY, WATCHDOG_SHARE, DIRECTIVE_MATTER, OPTIM_MATTER,
         UPLIFT, PUE_SPLIT, PUE_STEP, PUE_FLOOR, PUE_MATTER } from './data.js';
import { FUNDING } from './game.js';
import { Cinematic } from './ending.js';
import { IdleFX } from './fx.js';
import { fmt, fmtMoney, fmtMass, fmtPrice, fmtPower, fmtFull, fmtDigits, pct, clamp } from './util.js';
import { t, td, LANGS, lang, setLang, needsPicker, onChange } from './i18n.js';

const $ = id => document.getElementById(id);
const AUTO_MIN_OWNED = 20;   // seuil d'apparition du bouton ⟳ auto (même palier que ×10)
// Rafraîchissement des infobulles de l'en-tête, en secondes. Voir tip().
const TIP_REFRESH = 3;
const FUNDING_VISIBLE = 2;   // levées affichées à la fois : la prochaine, et celle d'après

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
      phaseBar: $('phase-bar'), phaseBarLabel: $('phase-bar-label'),
      phaseBarTrack: $('phase-bar-track'), phaseBarFill: $('phase-bar-fill'),
      phaseBarValue: $('phase-bar-value'), phaseBarEta: $('phase-bar-eta'),
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
      chargeArrears: $('charge-arrears'), chargeArrearsValue: $('charge-arrears-value'),
      energyMix: $('energy-mix'), mixIt: $('mix-it'), mixGpu: $('mix-gpu'), mixServer: $('mix-server'),
      mixRack: $('mix-rack'), mixNet: $('mix-net'), mixAux: $('mix-aux'), mixAuxRows: $('mix-aux-rows'),
      mixSite: $('mix-site'), mixTotal: $('mix-total'), mixMatterRow: $('mix-matter-row'), mixMatter: $('mix-matter'),
      mixPueRow: $('mix-pue-row'), mixPue: $('mix-pue'), mixPueBtn: $('mix-pue-btn'), mixPueHint: $('mix-pue-hint'),
      crisisLayer: $('crisis-layer'), crisisVignette: $('crisis-vignette'), idleFx: $('idle-fx'),
      gpuCap: $('gpu-cap'),
      gpuList: $('gpu-list'),
      panelStock: $('panel-stock'), stockBlock: $('stock-block'),
      stockValue: $('stock-value'), stockPl: $('stock-pl'), riskTabs: $('risk-tabs'),
      stockChart: $('stock-chart'), stockIndex: $('stock-index'), stockEntry: $('stock-entry'),
      cryptoChart: $('crypto-chart'), cryptoPrice: $('crypto-price'), cryptoEntry: $('crypto-entry'),
      btnStockDep10: $('btn-stock-dep10'), btnStockDepMax: $('btn-stock-depmax'), btnStockWithdraw: $('btn-stock-withdraw'),
      btnRestart: $('btn-restart'),
      restartOverlay: $('restart-overlay'), restartCancel: $('restart-cancel'), restartConfirm: $('restart-confirm'),
      spark: $('spark'),
      achievementsBody: $('achievements-body'),
      saveExport: $('save-export'), saveImport: $('save-import'), saveFile: $('save-file'),
      addendumList: $('addendum-list'), panelAddendum: $('panel-addendum'),
      sovereignList: $('sovereign-list'),
      watchdogBanner: $('watchdog-banner'),
      panelCompute: $('panel-compute'), panelEnergy: $('panel-energy'),
      panelUplift: $('panel-uplift'), upliftYield: $('uplift-yield'), upliftFill: $('uplift-fill'),
      upliftAsk: $('uplift-ask'), upliftAskTitle: $('uplift-ask-title'), upliftAskBody: $('uplift-ask-body'),
      upliftApprove: $('uplift-approve'), upliftGain: $('uplift-gain'), upliftSteps: $('uplift-steps'),
      panelDest: $('panel-dest'), destList: $('dest-list'), destActiveRow: $('dest-active-row'),
      destActiveName: $('dest-active-name'), destActiveLeft: $('dest-active-left'),
      extractBlock: $('extract-block'), extractTier: $('extract-tier'), extractFill: $('extract-fill'),
      extractYield: $('extract-yield'), extractBuy: $('extract-buy'),
      extractLabel: $('extract-label'), extractCost: $('extract-cost'),
      panelDebt: $('panel-debt'), debtTotal: $('debt-total'), debtNext: $('debt-next'),
      debtNextRow: $('debt-next-row'), debtActive: $('debt-active'),
      debtOffers: $('debt-offers'), debtOffersTitle: $('debt-offers-title'),
      universeMap: $('universe-map'), universePct: $('universe-pct'),
      langSelect: $('lang-select'),
      cine: $('cine'), cineCanvas: $('cine-canvas'), cineSkip: $('cine-skip'), cineCredit: $('cine-credit'),
      endingGetalife: $('ending-getalife'), endingNgplus: $('ending-ngplus'),
      energyLoadFill: $('energy-load-fill'), energyLoadValue: $('energy-load-value'), energyList: $('energy-list'),
      researchValue: $('research-value'), researchRate: $('research-rate'), dataValue: $('data-value'), trainList: $('train-list'),
      panelCosmos: $('panel-cosmos'), cosmosBody: $('cosmos-body'),
      projectList: $('project-list'), optimList: $('optim-list'),
      panelPrograms: $('panel-programs'), programList: $('program-list'),
      cryptoBlock: $('crypto-block'), cryptoTrend: $('crypto-trend'), cryptoValue: $('crypto-value'),
      cryptoPl: $('crypto-pl'), cryptoGpu: $('crypto-gpu'),
      btnCryptoDep10: $('btn-crypto-dep10'), btnCryptoWithdraw: $('btn-crypto-withdraw'),
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
    this.buildLangSelect();
    this.applyStaticI18n();
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

  // ------------------------------------------------------------------
  //  LANGUE — le sélecteur reste toujours accessible ; il est mis en
  //  évidence lorsque la langue du navigateur n'est pas prise en charge
  //  (l'anglais s'applique alors par défaut).
  // ------------------------------------------------------------------
  buildLangSelect() {
    const sel = this.el.langSelect;
    if (!sel) return;
    sel.innerHTML = LANGS.map(l => `<option value="${l.code}">${l.flag} ${l.name}</option>`).join('');
    sel.value = lang();
    if (needsPicker()) sel.classList.add('attention');   // langue non détectée : on attire l'œil
    sel.addEventListener('change', async () => {
      sel.classList.remove('attention');
      await setLang(sel.value);
    });
    onChange(() => this.onLangChange());
  }
  // Traductions des textes statiques du HTML (data-i18n / -title / -aria).
  applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    if (document.title !== undefined) document.title = t('TokenWar — Le Jeu du Token');
  }
  // Changement de langue à chaud : les libellés sont figés à la construction
  // des lignes, on reconstruit donc l'interface entière.
  onLangChange() {
    if (!this.game) return;
    this.applyStaticI18n();
    this.fillHelp();
    if (this.el.langSelect) this.el.langSelect.value = lang();
    this.fullRebuild();
    if (this.crisisBox) { const c = this.game.crisisDef(); this.onCrisisEnd(); if (c) this.onCrisis(c); }
  }

  rebuildHeadlines() {
    this.el.headlines.innerHTML = '';
    [...this.game.state.headlines].reverse().forEach(h => this.onHeadline(h));
  }

  bind() {
    const g = this.game;
    this.el.btnGenerate.addEventListener('click', () => { g.manualGenerate(); g.countClick('click'); });
    this.el.priceSlider.value = g.state.priceSlider;
    this.el.priceSlider.addEventListener('input', e => { g.state.priceSlider = +e.target.value; });
    this.el.upliftApprove.addEventListener('click', () => {
      if (this.game.approveUplift()) this.render(true);
    });
    this.el.mixPueBtn.addEventListener('click', () => {
      if (!g.improvePue()) this.deny(this.el.mixPueBtn, g.pueYearLeft() > 0
        ? t('Une seule tranche par an') : t('Ressources insuffisantes'));
    });
    this.el.extractBuy.addEventListener('click', () => {
      if (this.game.unlockExtraction()) { this.toast(t('Palier d’extraction ouvert'), 'good'); this.render(); }
      else this.deny(this.el.extractBuy, t('Recherche insuffisante'));
    });
    this.el.btnMarketing.addEventListener('click', () => { if (!g.buyMarketing()) this.deny(this.el.btnMarketing, t('Trésorerie insuffisante')); });
    this.el.btnFunding.addEventListener('click', () => this.claimBestFunding());
    this.el.btnSave.addEventListener('click', () => { g.save(); this.toast(t('Partie sauvegardée'), 'info'); });
    this.el.btnHelp.addEventListener('click', () => { this.renderAchievements(); this.el.helpOverlay.classList.remove('hidden'); });
    this.el.helpClose.addEventListener('click', () => this.el.helpOverlay.classList.add('hidden'));
    // « Play again » devient « Get a life ;-) » : le second clic tente aussi de fermer la fenêtre
    this.el.endingRestart.addEventListener('click', () => {
      if (!this._playAgainArmed) {
        this._playAgainArmed = true;
        this.el.endingRestart.textContent = t('Get a life ;-)');
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
    this.el.btnCryptoDep10.addEventListener('click', () => g.cryptoDeposit(g.money * 0.10));
    this.el.btnCryptoWithdraw.addEventListener('click', () => g.cryptoWithdraw());
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
      this.toast(t('Nouvelle partie — an 2019'), 'info');
    });
    // Ctrl+Shift+E : lancer directement la cinématique de fin (démo / test)
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        if (this.cinematic && !this.cinematic.done) return;
        this.closeModal();
        this.el.endingScreen.classList.add('hidden');
        this.showEnding();
        return;
      }
      this.handleShortcut(e);
    });
    this.syncRiskTabs();
  }

  resetSpeed() { this.setSpeed(1); }

  // ------------------------------------------------------------------
  //  RACCOURCIS CLAVIER
  //  Espace : vitesse suivante · F : geler / dégeler
  //  G : une carte · H : le niveau d'hébergement qui manque · B : la percée
  //  proposée · M : un cran de marketing.
  //  On ne les intercepte jamais quand l'utilisateur écrit quelque part, ni
  //  sous modificateur : Ctrl+S doit rester Ctrl+S.
  // ------------------------------------------------------------------
  handleShortcut(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
    // la cinématique et l'écran final ont leurs propres règles
    if (this.cinematic && !this.cinematic.done) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || e.code === 'Space') { e.preventDefault(); this.cycleSpeed(); return; }
    if (k === 'f') { e.preventDefault(); this.toggleFreeze(); return; }
    // les achats restent bloqués tant qu'une décision est à prendre
    if (this.modalOpen) return;
    const actions = { g: () => this.quickBuyGPU(), h: () => this.quickBuyHosting(),
                      b: () => this.quickBuyProject(), m: () => this.quickBuyMarketing() };
    if (actions[k]) { e.preventDefault(); actions[k](); }
  }
  // Retour visuel commun : on fait clignoter la ligne réellement achetée, pour
  // qu'un raccourci ne soit jamais une action invisible.
  // Barre de progression de la phase courante, sous les compteurs. Elle lit
  // les mêmes seuils que les percées de bascule, et distingue les trois états
  // qui se ressemblent à 100 % : il reste à prendre la percée, elle s'intègre,
  // ou l'on attend autre chose.
  // Paliers d'extraction : le rendement décroît à mesure que la matière facile
  // part, et il faut basculer vers la recherche pour ouvrir le palier suivant.
  // C'est le seul mécanisme qui empêche de régler les curseurs une seule fois.
  renderExtraction() {
    const g = this.game, el = this.el.extractBlock;
    if (!el) return;
    const tiers = g.extractionTiers();
    el.classList.toggle('hidden', !tiers);
    if (!tiers) return;
    const i = g.extractionTier(), rendement = g.extractionYield();
    this.el.extractTier.textContent = t('{0} ({1}/{2})', td(tiers[i].name), i + 1, tiers.length);
    this.el.extractFill.style.width = Math.round(rendement * 100) + '%';
    this.el.extractYield.textContent = Math.round(rendement * 100) + '%';
    this.el.extractYield.classList.toggle('text-bad', rendement < 0.6);
    const suivant = g.nextExtraction();
    this.el.extractBuy.classList.toggle('hidden', !suivant);
    if (suivant) {
      this.el.extractLabel.textContent = t('Ouvrir : {0}', td(suivant.name));
      this.el.extractCost.textContent = t('{0} recherche', fmt(suivant.research));
      this.setAfford(this.el.extractBuy, g.canUnlockExtraction());
      this.el.extractBuy.classList.toggle('locked', !g.canUnlockExtraction());
    }
  }
  // Destinations : trois régions proposées, une seule active à la fois, qui
  // s'épuise et force à rechoisir. Le rendement se paie en danger.
  renderDestinations() {
    const g = this.game;
    if (!this.el.destList) return;
    // le panneau n'existe qu'en phase 3 : ailleurs il resterait vide
    if (this.el.panelDest) this.el.panelDest.classList.toggle('hidden', g.phase < 3);
    const active = g.destActive();
    this.el.destActiveRow.classList.toggle('hidden', !active);
    if (active) {
      this.el.destActiveName.textContent = td(active.name);
      this.el.destActiveLeft.textContent = t('épuisée dans {0} s', Math.ceil(g.destLeft()));
    }
    const offres = g.destOffers();
    const cles = offres.map(o => o.id).join(',');
    if (this._destKey !== cles) {          // on ne reconstruit que si la liste change
      this._destKey = cles;
      this.el.destList.innerHTML = '';
      for (const d of offres) {
        const el = document.createElement('div');
        el.className = 'item dest-item';
        el.innerHTML = `<div class="item-header"><span class="item-name"></span>` +
          `<span class="item-cost num"></span></div><div class="item-desc"></div>`;
        el.querySelector('.item-name').textContent = td(d.name);
        el.querySelector('.item-desc').textContent = td(d.desc);
        el.querySelector('.item-cost').innerHTML =
          `<span class="badge">${t('récolte ×{0}', this.game.decimal(d.yieldMult, 2))}</span> ` +
          `<span class="badge ${d.hazardMult > 1 ? 'badge-warn' : ''}">${t('danger ×{0}', this.game.decimal(d.hazardMult, 2))}</span>`;
        el.addEventListener('click', () => { if (g.chooseDest(d.id)) this.render(); });
        this.el.destList.appendChild(el);
      }
    }
  }
  // L'emprise physique : les six étapes par lesquelles le calcul attrape la
  // matière. On montre TOUTE la chaîne, accordée ou non — c'est elle qui
  // explique pourquoi la récolte accélère, et ce qu'on a signé pour ça.
  renderUplift() {
    const g = this.game, el = this.el.panelUplift;
    if (!el) return;
    el.classList.toggle('hidden', g.phase < 2);
    if (g.phase < 2) return;
    const rend = g.upliftYield();
    this.el.upliftYield.textContent = Math.round(rend * 100) + '%';
    this.el.upliftFill.style.width = Math.round(rend * 100) + '%';

    const demande = g.upliftPending();
    this.el.upliftAsk.classList.toggle('hidden', !demande);
    if (demande) {
      this.el.upliftAskTitle.textContent = td(demande.name);
      // la demande, puis ce qu'elle PRODUIT : sans la seconde, on accorde sans
      // savoir ce qu'on met en marche
      this.el.upliftAskBody.innerHTML = `<span class="uplift-quote">${td(demande.ask)}</span>`
        + `<span class="uplift-does">${td(demande.does)}</span>`;
      this.el.upliftGain.textContent = t('récolte portée à {0}', Math.round(demande.yield * 100) + '%');
    }
    // la chaîne complète, pour qu'on voie d'où l'on vient et où cela va
    const fait = g.upliftStep();
    const cle = fait + '|' + (demande ? demande.id : '');
    if (this._upliftKey !== cle) {
      this._upliftKey = cle;
      this.el.upliftSteps.innerHTML = UPLIFT.map((e, i) => {
        const etat = i < fait ? 'done' : (demande && i === fait ? 'pending' : 'todo');
        const marque = etat === 'done' ? '✓' : (etat === 'pending' ? '⏳' : '·');
        // une étape accordée rappelle ce qu'elle fait tourner : la chaîne doit
        // rester lisible longtemps après qu'on a signé
        const quoi = etat === 'done' ? `<span class="uplift-does-min">${td(e.does)}</span>` : '';
        return `<div class="uplift-step is-${etat}"><span class="uplift-mark">${marque}</span>` +
               `<span><span class="uplift-step-name">${td(e.name)}</span>${quoi}</span></div>`;
      }).join('');
    }
  }
  renderPhaseBar() {
    const el = this.el.phaseBar;
    if (!el) return;
    const p = this.game.phaseProgress();
    const w = Math.round(p.frac * 1000) / 10;
    if (this.el.phaseBarFill.style.width !== w + '%') this.el.phaseBarFill.style.width = w + '%';
    if (this.el.phaseBarLabel.textContent !== p.label) this.el.phaseBarLabel.textContent = p.label;
    if (this.el.phaseBarValue.textContent !== p.value) this.el.phaseBarValue.textContent = p.value;
    const eta = p.eta || '';
    if (this.el.phaseBarEta.textContent !== eta) this.el.phaseBarEta.textContent = eta;
    el.classList.toggle('is-ready', p.state === 'ready');
    el.classList.toggle('is-slow', p.state === 'slow');
    el.classList.toggle('is-integrating', p.state === 'integrating');
    el.classList.toggle('is-done', p.state === 'done');
    this.el.phaseBarTrack.setAttribute('aria-valuenow', String(Math.round(p.frac * 100)));
    this.tip(el, p.label + ' — ' + p.value + (eta ? ' · ' + eta : ''));
  }
  // Une infobulle n'est réécrite que si elle change : `title` sur un élément
  // survolé referme le tooltip natif à chaque écriture, et le rendu tourne à
  // 10 images par seconde.
  tip(el, txt) {
    if (!el) return;
    // Réécrire `title` referme le tooltip natif en cours d'affichage. Le rendu
    // tourne à 10 images par seconde et ces chiffres changent en continu :
    // l'infobulle était donc détruite avant d'avoir eu le temps d'apparaître,
    // et on ne la voyait jamais. On ne la rafraîchit qu'une fois toutes les
    // TIP_REFRESH secondes — assez pour rester juste, assez peu pour laisser
    // le navigateur l'afficher.
    const now = Date.now();
    if (el._tipAt && now - el._tipAt < TIP_REFRESH * 1000) return;
    el._tipAt = now;
    if (el.title !== txt) el.title = txt;
  }
  flashRow(row) {
    if (!row || !row.el) return;
    row.el.classList.remove('auto-fire');
    void row.el.offsetWidth;                    // force le redémarrage de l'animation
    row.el.classList.add('auto-fire');
    setTimeout(() => row.el && row.el.classList.remove('auto-fire'), 600);
  }
  // La meilleure carte qu'on puisse s'offrir ET loger : on ne descend en gamme
  // que si la gamme au-dessus est hors de portée.
  quickBuyGPU() {
    const g = this.game;
    const dispo = GPUS.filter(x => g.canBuyGPU(x.id)).sort((a, b) => b.perf - a.perf);
    if (!dispo.length) return this.toast(t('Aucune carte achetable : place, budget ou date.'), 'warn');
    if (!g.buyGPU(dispo[0].id)) return;
    g.countClick('gpu');
    this.flashRow(this.rows.gpu[dispo[0].id]);
    this.toast(t('{0} commandé', td(dispo[0].name)), 'info');
  }
  // Le niveau qui manque, pas le plus cher : on remonte la chaîne serveur →
  // baie → datacenter → immobilier et on achète le premier qui sature.
  quickBuyHosting() {
    const g = this.game;
    const manquant = [...INFRA].reverse().find(it => g.plannedFreeSlots(it.child) < 1 && g.canBuyInfra(it.id))
      || [...INFRA].reverse().find(it => g.canBuyInfra(it.id));
    if (!manquant) return this.toast(t('Aucun hébergement achetable : place ou budget.'), 'warn');
    if (!g.buyInfra(manquant.id)) return;
    g.countClick(manquant.family);
    this.flashRow(this.rows.infra && this.rows.infra[manquant.id]);
    this.toast(t('{0} commandé', td(manquant.name)), 'info');
  }
  quickBuyProject() {
    const g = this.game;
    const p = g.nextProject && g.nextProject();
    if (!p) return this.toast(t('Aucune percée disponible pour l’instant.'), 'warn');
    if (!g.buyProject(p.id)) return this.toast(t('Recherche insuffisante pour {0}', td(p.name)), 'warn');
    this.flashRow(this.rows.project && this.rows.project[p.id]);
    this.toast(t('{0} lancé', td(p.name)), 'info');
  }
  quickBuyMarketing() {
    if (!this.game.buyMarketing()) return this.deny(this.el.btnMarketing, t('Marketing : plafond atteint ou trésorerie insuffisante'));
    this.toast(t('Marketing renforcé'), 'info');
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
    box.setAttribute('aria-label', t('Incident : {0}', td(c.title)));
    box.innerHTML =
      `<div class="crisis-halo" aria-hidden="true"></div>` +
      `<div class="crisis-inner">` +
        `<div class="crisis-head"><span class="crisis-icon">${c.icon}</span><span class="crisis-title">${td(c.title)}</span></div>` +
        `<div class="crisis-body">${td(c.body)}</div>` +
        `<div class="crisis-meter"><span class="text-muted">${t('Pertes en cours')}</span><span class="num crisis-lost"></span></div>` +
        `<button class="btn btn-primary crisis-fix"><span class="choice-label">${td(c.fix)}</span>` +
        `<span class="choice-desc">${td(c.fixDesc)}</span><span class="crisis-cost num"></span></button>`;
    box.querySelector('.crisis-fix').addEventListener('click', () => this.game.resolveCrisis(true));
    this.el.crisisLayer.appendChild(box);
    this.crisisBox = box;
    this.placeCrisisBox(box);
    this.el.crisisVignette.classList.remove('hidden');
    this.armWatchdog();
  }
  // Bandeau de surveillance : il n'apparaît qu'UNE SECONDE après le début de
  // l'incident. Assez pour ne plus jamais le rater, assez tard pour que la
  // seconde perdue se sente encore — le dispositif prévient, il ne joue pas
  // à votre place. Les couleurs suivent la phase : cyan d'alerte en phase 1,
  // teinte de la phase 2 ensuite.
  armWatchdog() {
    clearTimeout(this._watchTimer);
    if (!this.game.hasWatchdog()) return;
    this._watchTimer = setTimeout(() => {
      if (!this.game.state.crisis) return;
      const el = this.el.watchdogBanner;
      if (!el) return;
      el.classList.remove('hidden');
      el.classList.toggle('is-phase2', this.game.phase >= 2);
      el.querySelector('.watchdog-text').textContent = t('Incident détecté — trouvez la boîte rouge');
    }, WATCHDOG_DELAY * 1000);
  }
  disarmWatchdog() {
    clearTimeout(this._watchTimer);
    if (this.el.watchdogBanner) this.el.watchdogBanner.classList.add('hidden');
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
    // En phase 2+ l'incident ponctionne la MATIÈRE : afficher « $3,60 DDc »
    // sur des kilogrammes était un reste de la phase 1.
    const chiffre = v => (g.crisisPool() === 'matter' ? fmtMass(v) : fmtMoney(v));
    const lost = this.crisisBox.querySelector('.crisis-lost');
    if (lost) lost.textContent = '−' + chiffre(s.crisis.lost) + ' (' + Math.round(k * CRISIS_DURATION) + ' s)';
    const c = g.crisisDef();
    const cost = this.crisisBox.querySelector('.crisis-cost');
    if (cost && c) cost.textContent = chiffre(g.crisisCost(c));
  }
  onCrisisEnd() {
    this.disarmWatchdog();
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
    this.el.endingTitle.textContent = t('Good choice. Enjoy the sun 🌱');
    this.el.endingGetalife.disabled = true;
    this.el.endingRestart.disabled = true;
    try { window.open('', '_self'); } catch (e) {}     // s'auto-désigne comme ouvreur (vieille astuce)
    try { window.close(); } catch (e) {}
    setTimeout(() => {
      if (typeof document === 'undefined' || document.hidden) return;
      this.el.endingBody.innerHTML =
        t('<b>Votre navigateur refuse de fermer cet onglet</b> (il ne ferme que les fenêtres ouvertes par un script).<br>Alors faites-le vous-même : <b>fermez l’onglet</b>, levez-vous, et allez dehors. 🌤️');
      this.el.endingNgplus.classList.remove('hidden');
      this.el.endingRestart.disabled = false;
    }, 600);
  }

  // ---- export / import de sauvegarde ----
  exportSave() {
    try {
      this.game.save();
      const raw = localStorage.getItem('tokenwar_save_v1');
      if (!raw) return this.toast(t('Rien à exporter'), 'bad');
      const blob = new Blob([raw], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tokenwar-sauvegarde.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      this.toast(t('Sauvegarde exportée'), 'good');
    } catch (e) { this.toast(t('Export impossible dans ce navigateur'), 'bad'); }
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
        this.toast(t('Sauvegarde importée — rechargement…'), 'good');
        setTimeout(() => location.reload(), 700);
      } catch (e) { this.toast(t('Fichier de sauvegarde invalide'), 'bad'); }
    };
    reader.readAsText(file);
    ev.target.value = '';
  }

  // ---- succès (affichés dans l'aide) ----
  renderAchievements() {
    const got = this.game.state.achievements || {};
    const n = Object.keys(got).length;
    this.el.achievementsBody.innerHTML =
      `<p><b>🏆 ${t('Succès')} (${n}/${ACHIEVEMENTS.length})</b></p>` +
      ACHIEVEMENTS.map(a => {
        // un succès secret ne se lit qu'une fois obtenu : son libellé dirait
        // sinon ce qui attend le joueur à la fin de la partie
        const cache = a.secret && !got[a.id];
        const nom = cache ? '???' : td(a.name);
        const desc = cache ? t('Succès caché') : td(a.desc);
        return `<p class="ach ${got[a.id] ? 'done' : 'todo'}">${got[a.id] ? '🏆' : '🔒'} <b>${nom}</b> — <span class="text-muted">${desc}</span></p>`;
      }).join('');
  }

  syncRiskTabs() {
    const r = this.game.state.stock.risk;
    this.el.riskTabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', +t.dataset.risk === r));
  }

  // reconstruction complète de l'UI (après un redémarrage / New Game+)
  fullRebuild() {
    // les courbes vivent dans l'interface, pas dans l'état : sans ce nettoyage,
    // une nouvelle partie hériterait du graphe de la précédente.
    this.sparkData = []; this.sparkLastT = -1;
    this.universe = null;
    this.drawSpark();
    this.drawMarket(this.el.stockChart, [], null, '#fff');
    this.drawMarket(this.el.cryptoChart, [], null, '#fff');
    if (this.el.universeMap && this.el.universeMap.getContext) {
      const c = this.el.universeMap.getContext('2d');
      if (c) c.clearRect(0, 0, this.el.universeMap.width, this.el.universeMap.height);
    }
    this.onCrisisEnd();
    this.onPhaseChange(this.game.phase);
    this.buildStaticRows();
    this.buildTrainRow();
    this.rebuildHeadlines();
    this.el.endingScreen.classList.add('hidden');
    this.render(true);
  }

  // Barre d'espace et bouton ⏩ font la même chose : passer à la vitesse
  // suivante. Depuis l'état gelé, on ne poursuit pas le cycle — on dégèle.
  cycleSpeed() {
    if (!(window.__speed > 0)) return this.setSpeed(this._speedBeforeFreeze || 1);
    const cur = window.__speed || 1;
    this.setSpeed(GAME_SPEEDS[(GAME_SPEEDS.indexOf(cur) + 1) % GAME_SPEEDS.length]);
  }
  // Gel : la simulation s'arrête net, l'interface reste vivante (on peut lire,
  // comparer, acheter). On mémorise la vitesse d'avant pour la rendre telle
  // quelle au dégel — sinon figer coûterait le réglage qu'on avait choisi.
  toggleFreeze() {
    if (window.__speed > 0) { this._speedBeforeFreeze = window.__speed; this.setSpeed(0); }
    else this.setSpeed(this._speedBeforeFreeze || 1);
  }
  frozen() { return !(window.__speed > 0); }
  // La vitesse est aussi portée par le moteur : les automatisations en ont
  // besoin pour ralentir leur cadence, et le moteur tourne sans `window`
  // (simulation headless).
  setSpeed(n) {
    window.__speed = n;
    if (this.game) this.game.speed = n;
    this.el.btnSpeed.textContent = n > 0 ? '⏩ x' + n : '⏸ ' + t('figé');
    this.el.btnSpeed.classList.toggle('frozen', n <= 0);
    document.body.classList.toggle('is-frozen', n <= 0);
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

  // Barre de progression attachée à une ligne, masquée tant qu'il n'y a rien à
  // montrer. Sert aux programmes (étapes longues) et à l'intégration des avancées.
  addBar(r, extraClass = 'integration-bar') {
    const bar = document.createElement('div');
    bar.className = `progress ${extraClass} hidden`;
    bar.innerHTML = '<div class="progress-fill" style="width:0%"></div>';
    r.el.appendChild(bar);
    r.bar = bar;
    r.barFill = bar.querySelector('.progress-fill');
    return r;
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
    b.title = t('Auto-achat de cet élément précis');
    b.addEventListener('click', ev => { ev.stopPropagation(); this.game.toggleAutoItem(family, id); });
    r.el.querySelector('.item-header').appendChild(b);
    r.autoBtn = b;
  }
  // Le bouton n'apparaît qu'une fois l'automatisation achetée ET 20 exemplaires
  // de CET élément en service : on n'automatise que ce qu'on a déjà maîtrisé.
  updateAutoToggle(r, family, id, owned) {
    if (!r.autoBtn) return;
    const cap = this.game.state.auto[family] && this.game.state.auto[family].owned;
    const show = cap && Math.floor(owned || 0) >= AUTO_MIN_OWNED;
    r.autoBtn.classList.toggle('hidden', !show);
    r.autoBtn.classList.toggle('on', this.game.isAutoItem(family, id));
  }

  buildStaticRows() {
    // Addendum : directives permanentes + datacenter orbital
    this.buildDebt();
    this.el.addendumList.innerHTML = ''; this.rows.addendum = {};
    {
      // Surveillance des incidents : une ligne par phase, qui n'apparaît
      // qu'une fois la huitième crise essuyée.
      const r = this.makeRow(this.el.addendumList, 'watchdog', this.rows.addendum);
      r.el.addEventListener('click', () => {
        if (this.game.buyWatchdog()) { this.toast(t('Surveillance en service'), 'good'); this.render(); }
        else this.deny(r.el, t('Offre indisponible'));
      });
    }
    {
      const r = this.makeRow(this.el.addendumList, 'directives', this.rows.addendum);
      r.name.textContent = td(ADDENDUM.name);
      r.desc.textContent = td(ADDENDUM.desc);
      r.el.addEventListener('click', () => { this.game.buyAddendum(); });
      const reset = document.createElement('button');
      reset.className = 'btn-ghost rent-btn hidden';
      reset.textContent = t('Réinitialiser les directives');
      reset.addEventListener('click', ev => { ev.stopPropagation(); this.game.clearAutoChoices(); this.toast(t('Directives effacées'), 'info'); });
      r.el.appendChild(reset);
      r.resetBtn = reset;
    }
    {
      const r = this.makeRow(this.el.addendumList, 'spacedc', this.rows.addendum);
      r.name.textContent = '🛰️ ' + td(SPACE_DC.name);
      r.desc.textContent = td(SPACE_DC.desc);
      const bar = document.createElement('div');
      bar.className = 'progress spacedc-bar hidden';
      bar.innerHTML = '<div class="progress-fill" style="width:100%"></div>';
      r.el.appendChild(bar);
      r.bar = bar; r.barFill = bar.querySelector('.progress-fill');
      r.el.addEventListener('click', () => { this.game.buySpaceDC(); });
    }
    // Rachat de dette souveraine : n'apparaît qu'au-delà de 4 000 milliards
    this.el.sovereignList.innerHTML = ''; this.rows.sovereign = {};
    {
      const r = this.makeRow(this.el.sovereignList, 'sovereign', this.rows.sovereign);
      r.name.textContent = '🏛️ ' + t('Rachat de dette souveraine');
      r.desc.textContent = t('Un pays surendetté cherche un repreneur. Rachetez sa dette et il passe sous votre tutelle : {0} datacenters y seront construits.', SOVEREIGN.datacenters);
      r.el.addEventListener('click', () => { this.game.buySovereign(); });
    }
    // Automatisations (auto-clickers payants, activables/désactivables)
    this.el.autoList.innerHTML = ''; this.rows.auto = {};
    AUTOMATIONS.forEach(a => {
      const r = this.makeRow(this.el.autoList, a.id, this.rows.auto);
      r.name.textContent = td(a.name);
      r.desc.textContent = td(a.desc);
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
      r.name.textContent = td(it.name);
      r.desc.textContent = td(it.desc);
      r.el.addEventListener('click', () => { if (this.game.buyInfra(it.id)) this.game.countClick(it.family); });
      this.addBulk(r, () => { const ok = this.game.buyInfra(it.id); if (ok) this.game.countClick(it.family); return ok; });
      this.addAutoToggle(r, it.family, it.id);
      // location (datacenter uniquement) : pas de capex, coût journalier
      if (it.rentDaily) {
        const rent = document.createElement('div');
        rent.className = 'rent-row';
        rent.innerHTML = `<span class="rent-info text-muted num"></span>` +
          `<button class="btn-ghost rent-btn" data-act="rent">${t('Louer +1')}</button>` +
          `<button class="btn-ghost rent-btn" data-act="unrent">${t('Résilier')}</button>`;
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
          `<button class="btn-ghost rent-btn" data-act="rent">${t('Louer espace (+{0} baies)', COLO.racks)}</button>` +
          `<button class="btn-ghost rent-btn" data-act="unrent">${t('Résilier')}</button>`;
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
      r.name.textContent = td(e.name);
      r.desc.textContent = td(e.desc);
      const actions = document.createElement('div');
      actions.className = 'rent-row';
      actions.innerHTML = `<button class="btn-ghost rent-btn" data-act="hire">${t('Embaucher')}</button>` +
        `<button class="btn-ghost rent-btn" data-act="fire">${t('Licencier')}</button>`;
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
      r.name.textContent = td(g.name);
      r.desc.textContent = td(g.desc);
      // Revente : à l'unité, puis par paquets quand le parc le justifie. Les
      // seuils suivent ceux de l'achat groupé — on ne propose de vendre en gros
      // que ce qu'on possède déjà en gros.
      const mkSell = (label, title, qty) => {
        const b = document.createElement('button');
        b.className = 'sell-btn hidden';
        b.textContent = label; b.title = title;
        b.addEventListener('click', ev => { ev.stopPropagation(); this.game.sellGPU(g.id, false, qty); });
        r.effect.parentElement.appendChild(b);
        return b;
      };
      r.sell    = mkSell(t('Revendre'),     t('Revendre une carte (libère un emplacement)'), 1);
      r.sell10  = mkSell(t('Revendre ×10'), t('Revendre dix cartes d’un coup'), 10);
      r.sellAll = mkSell(t('Tout revendre'), t('Revendre la totalité de ce modèle'), Infinity);
      r.el.addEventListener('click', () => {
        if (!this.game.dateUnlocked(g)) return;   // verrouillé par date → silencieux (grisé/label)
        if (this.game.buyGPU(g.id)) this.game.countClick('gpu');   // non achetable → no-op (grisé)
      });
      this.addBulk(r, () => { const ok = this.game.buyGPU(g.id); if (ok) this.game.countClick('gpu'); return ok; });
      this.addAutoToggle(r, 'gpu', g.id);
    });
    // Energy
    this.el.energyList.innerHTML = ''; this.rows.energy = {};
    ENERGY.forEach(e => {
      const r = this.makeRow(this.el.energyList, e.id, this.rows.energy);
      r.name.textContent = td(e.name);
      r.desc.textContent = td(e.desc);
      r.el.addEventListener('click', () => { if (this.game.dateUnlocked(e) && this.game.buyEnergy(e.id)) this.game.countClick('energy'); });
      this.addBulk(r, () => { const ok = this.game.buyEnergy(e.id); if (ok) this.game.countClick('energy'); return ok; });
      this.addAutoToggle(r, 'energy', e.id);
    });
    // Optimisations récurrentes (elles reviennent tous les N mois)
    this.el.optimList.innerHTML = ''; this.rows.optim = {};
    OPTIMS.forEach(o => {
      const r = this.makeRow(this.el.optimList, o.id, this.rows.optim);
      r.el.classList.add('optim');
      r.name.textContent = td(o.name);
      r.desc.textContent = td(o.desc);
      this.addBar(r);                       // barre d'intégration (masquée au repos)
      r.el.addEventListener('click', () => { this.game.buyOptim(o.id); });
    });
    // Grands programmes (fusion, sphère de Dyson)
    this.el.programList.innerHTML = ''; this.rows.program = {};
    PROGRAMS.forEach(p => {
      const r = this.makeRow(this.el.programList, p.id, this.rows.program);
      r.el.classList.add('program');
      r.name.textContent = p.icon + ' ' + td(p.name);
      r.desc.textContent = td(p.desc);
      this.addBar(r, 'program-bar');
      r.el.addEventListener('click', () => { this.game.orderProgram(p.id); });
    });
    // Projects
    this.el.projectList.innerHTML = ''; this.rows.project = {};
    PROJECTS.forEach(p => {
      const r = this.makeRow(this.el.projectList, p.id, this.rows.project);
      r.name.textContent = td(p.name);
      r.desc.textContent = td(p.desc);
      this.addBar(r);                       // barre d'intégration (masquée au repos)
      r.el.addEventListener('click', () => { this.game.buyProject(p.id); });
    });
    // Funding
    this.el.fundingList.innerHTML = ''; this.rows.funding = {};
    FUNDING.forEach(f => {
      const r = this.makeRow(this.el.fundingList, f.id, this.rows.funding);
      r.name.textContent = td(f.name);
      r.desc.textContent = td(f.desc);
      r.el.addEventListener('click', () => { this.game.claimFunding(f.id); });
    });
  }

  // badge « en chantier » : rien n'est instantané, chaque commande met un temps
  // à être opérationnelle, proportionnel à sa complexité.
  buildBadge(family, id) {
    const n = this.game.pendingCount(family, id);
    if (!n) return '';
    const p = Math.round((this.game.buildProgress(family, id) || 0) * 100);
    return ` <span class="badge badge-build" title="${t('Mise en service en cours')}">⏳ ${t('{0} en chantier · {1}%', n, p)}</span>`;
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
        `<span class="text-muted">${t('accueille {0}/{1} {2}', fmt(childUsed), fmt(childCap), it.child === 'gpu' ? 'GPU' : td(INFRA.find(x => x.id === it.child)?.unit || it.child))}</span> ` +
        `<span class="text-muted">· ${fmtPower(it.energy)}/u</span>` +
        (noParent ? ` <span class="badge badge-warn">${t('place {0} requise', td(INFRA.find(x => x.id === it.needs).unit))}</span>` : '') +
        this.buildBadge('infra', it.id);
      this.setAfford(r.el, g.canBuyInfra(it.id));
      this.updateBulk(r, count, g.canBuyInfra(it.id));
      this.updateAutoToggle(r, it.family, it.id, count);
      if (r.rentInfo) {
        const rented = s.rentedDC || 0;
        r.rentInfo.textContent = t('loué ×{0} · {1}/j', rented, fmtMoney(g.dcRentDaily())) + (rented > 0 ? ` (−${fmtMoney(g.dcRentPerSec())}/s)` : '');
        r.unrentBtn.classList.toggle('locked', rented <= 0);
      }
      if (r.coloInfo) {
        const rs = s.rentedSpace || 0;
        r.coloInfo.textContent = t('espace loué ×{0} · {1}/j', rs, fmtMoney(COLO.daily));
        r.coloUnrent.classList.toggle('locked', rs <= 0);
      }
    });
  }

  renderTeam() {
    const g = this.game;
    this.el.headcount.textContent = fmt(g.headcount()) + ' / ' + fmt(g.headcountCap());
    const hireCost = g.hireCost();
    const broke = g.money < hireCost;
    EMPLOYEES.forEach(e => {
      const r = this.rows.team[e.id];
      const count = g.empCount(e.id);
      r.cost.innerHTML = `<span class="badge">×${count}</span> <span class="num text-muted">${t('{0} à l’embauche', fmtMoney(hireCost))}</span>`;
      const canHire = g.canHire(e.id);
      r.effect.innerHTML = `<span class="text-muted">${t('{0}/j par poste', fmtMoney(g.moneyCost(e.salary)))}</span>` +
        (!canHire ? (broke ? ` <span class="badge badge-warn">${t('trésorerie insuffisante')}</span>`
                           : ` <span class="badge badge-warn">${t('limité par RH')}</span>`) : '');
      r.hireBtn.classList.toggle('locked', !canHire);
      r.fireBtn.classList.toggle('locked', count < 1);
      this.updateBulk(r, count, canHire);
    });
  }

  renderAuto() {
    const g = this.game, s = g.state;
    let any = false;
    AUTOMATIONS.forEach(a => {
      const r = this.rows.auto[a.id];
      const st = s.auto[a.id];
      const cost = g.autoCost(a);
      // la carte n'apparaît qu'après 50 gestes faits à la main dans cette famille
      if (!st.owned && !g.autoUnlocked(a.id)) { r.el.classList.add('hidden'); return; }
      r.el.classList.remove('hidden');
      any = true;
      if (!st.owned) {
        r.cost.textContent = fmtMoney(cost);
        r.btn.textContent = t('Acheter');
        r.btn.classList.toggle('locked', s.money < cost);
        this.setAfford(r.el, s.money >= cost);
      } else {
        r.cost.innerHTML = `<span class="badge ${st.on ? '' : 'badge-warn'}">${st.on ? t('activé') : t('désactivé')}</span>`;
        r.btn.textContent = st.on ? t('Désactiver') : t('Activer');
        r.btn.classList.remove('locked');
        r.el.classList.remove('locked', 'affordable');
      }
    });
    this.el.panelAuto.classList.toggle('empty', !any);
  }

  // Animation à chaque action d'une automatisation : la carte pulse, et la
  // ligne concernée clignote — on voit ce que la machine fait à notre place.
  onAutoFire(family, itemId) {
    const r = this.rows.auto && this.rows.auto[family];
    if (r) { r.el.classList.remove('fired'); void r.el.offsetWidth; r.el.classList.add('fired'); }
    const fam = { gpu:'gpu', energy:'energy', hardware:'infra', housing:'infra' }[family];
    const row = itemId && this.rows[fam] && this.rows[fam][itemId];
    if (row) { row.el.classList.remove('auto-hit'); void row.el.offsetWidth; row.el.classList.add('auto-hit'); }
  }

  renderAddendum() {
    const g = this.game, s = g.state;
    // Surveillance des incidents
    const rw = this.rows.addendum['watchdog'];
    const offre = g.watchdogOffer();
    if (rw) {
      const actif = g.hasWatchdog();
      rw.el.classList.toggle('hidden', !offre && !actif);
      if (offre || actif) {
        const w = offre || WATCHDOGS.find(x => x.phase === Math.min(2, g.phase));
        rw.name.textContent = td(w.name);
        rw.desc.textContent = td(w.desc);
        if (actif) {
          rw.cost.innerHTML = `<span class="badge badge-new">${t('en service')}</span>`;
          rw.effect.innerHTML = `<span class="text-muted">${t('Vous êtes prévenu {0} s après le début de l’incident.', WATCHDOG_DELAY)}</span>`;
          rw.el.classList.add('owned');
        } else {
          const c = g.watchdogCost();
          rw.cost.textContent = g.usesMatter() ? fmtMass(c) : fmtMoney(c);
          rw.effect.innerHTML = `<span class="text-muted">${t('{0} de ce que vous possédez', pct(WATCHDOG_SHARE) + '%')}</span>`;
          rw.el.classList.remove('owned');
          this.setAfford(rw.el, c > 0);
        }
      }
    }
    // Directives permanentes
    const rd = this.rows.addendum['directives'];
    const cost = g.addendumCost();
    const prixDirective = g.softLabel(cost, DIRECTIVE_MATTER);
    if (s.addendum) {
      const used = g.directivesUsed(), slots = g.directiveSlots();
      const full = used >= slots, maxed = g.directivesMaxed();
      // chaque clic achète UNE directive de plus, au prix du moment ; une fois
      // le plafond atteint il n'y a plus d'événement à mémoriser, la ligne ne
      // se vend plus.
      rd.cost.innerHTML = maxed
        ? `<span class="badge badge-new">${t('toutes acquises')}</span>`
        : full
          ? `<span class="badge badge-warn">${t('quota atteint')}</span> <span class="num">${prixDirective}</span>`
          : `<span class="badge badge-new">${t('actives')}</span> <span class="num">${prixDirective}</span>`;
      rd.effect.innerHTML =
        `<span class="${full && !maxed ? 'text-bad' : 'text-muted'}">${t('{0}/{1} directive(s) mémorisée(s)', used, slots)}</span>` +
        (maxed ? '' : ` <span class="text-muted">· ${t('payez pour une directive de plus (plafond : {0})', g.directiveCap())}</span>`);
      rd.el.classList.toggle('owned', maxed);
      this.setAfford(rd.el, !maxed && g.canPayDirective());
      rd.resetBtn.classList.toggle('hidden', used === 0);
    } else {
      rd.cost.textContent = prixDirective;
      rd.effect.innerHTML = `<span class="text-muted">${t('Ne soyez plus jamais interrompu — une directive par paiement, {0} au total.', g.directiveCap())}</span>`;
      this.setAfford(rd.el, g.canPayDirective());
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
        rs.effect.innerHTML = `<span class="text-muted">${t('Proposé jusqu’en {0}. Livraison promise : {1} mois.', SPACE_DC.to, SPACE_DC.buildMonths)}</span>`;
        rs.bar.classList.add('hidden');
        this.setAfford(rs.el, s.money >= g.spaceDCCost());
      } else {
        rs.el.classList.remove('locked', 'affordable');
        rs.cost.innerHTML = st === 'bankrupt' ? `<span class="badge badge-danger">${t('faillite')}</span>` : `<span class="badge">${t('en chantier')}</span>`;
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
    this.el.chargeElecVar.textContent = fmtMoney(c.elecVar) + ' ' + t('/j');
    this.el.chargeElecFix.textContent = fmtMoney(c.elecFix) + ' ' + t('/j');
    this.el.chargeElecSub.textContent = fmtMoney(c.elecSub) + ' ' + t('/j');
    this.el.chargeSalary.textContent = fmtMoney(c.salary) + ' ' + t('/j');
    this.el.chargeRent.textContent = fmtMoney(c.rent) + ' ' + t('/j');
    this.el.chargeTotal.textContent = fmtMoney(c.elec + c.salary + c.rent) + ' ' + t('/j');
    this.el.chargeSec.textContent = '−' + fmtMoney(g.chargesPerSec()) + ' ' + t('/s');
    // inflation : indice depuis 2019 et pouvoir d'achat perdu sur la trésorerie dormante
    const idx = g.inflIndex();
    this.el.chargeInfl.innerHTML = `${(g.inflRate(g.simYearInt()) * 100).toFixed(1)}% ${t('/an')} · ${t('indice')} `
      + `<b>×${idx.toFixed(2)}</b> · <span class="text-bad">−${(g.purchasingLoss() * 100).toFixed(0)}%</span> ${t('de pouvoir d’achat')}`;
    // arriérés de salaire : compte à rebours avant les premières démissions
    const days = g.state.unpaidDays || 0;
    this.el.chargeArrears.classList.toggle('hidden', days < 1);
    if (days >= 1) {
      const left = Math.max(0, UNPAID_QUIT_DAYS - days);
      this.el.chargeArrearsValue.innerHTML = left > 0
        ? `<span class="text-bad">${t('{0} j impayés', Math.floor(days))}</span> — ${t('départs dans {0} j', Math.ceil(left))}`
        : `<span class="text-bad">${t('{0} j impayés — l’équipe s’en va', Math.floor(days))}</span>`;
    }
  }

  renderStock() {
    // le panneau reste si l'un des deux marchés est ouvert (crypto dès 25k$, Bourse à 100k$)
    this.el.panelStock.classList.toggle('hidden', !this.game.state.stockUnlocked && !this.game.state.crypto.unlocked);
    this.el.stockBlock.classList.toggle('hidden', !this.game.state.stockUnlocked);   // la Bourse s'ouvre à 100k$
    const g = this.game, s = g.state;
    const st = s.stock;
    const lvl = this.entryLevel(st);
    this.drawMarket(this.el.stockChart, st.hist, lvl,
      getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#2ee6d6');
    if (this.el.stockIndex) this.el.stockIndex.textContent = g.decimal(st.index || 1, 3);
    this.renderMarketLegend(this.el.stockEntry, st, lvl);
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
      if (g.canTrainNext() && !g.dateUnlocked(g.nextModel())) return this.deny(el, t('Modèle pas encore disponible ({0})', g.nextModel().year));
      if (!g.trainNext()) this.deny(el, t('Ressources insuffisantes'));
    });
    this.trainRow = { el, name: el.querySelector('.item-name'), cost: el.querySelector('.item-cost'),
      desc: el.querySelector('.item-desc'), effect: el.querySelector('.item-effect') };
  }

  buildAlloc() {
    const g = this.game;
    const labels = { serve:t('Service (tokens)'), research:t('Recherche'), improve:t('Auto-amélioration'), harvest:t('Récolte de matière') };
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
    this.el.cosmosBody.innerHTML = `<div class="meter-row"><span class="text-muted">${t('Sondes')}</span><span class="num" id="probe-count">0</span></div>`;
    this.rows.probe = {};
    PROBE_SPECS.forEach(spec => {
      const r = this.makeRow(this.el.cosmosBody, spec.id, this.rows.probe);
      r.name.textContent = td(spec.name);
      r.desc.textContent = td(spec.desc);
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
    // infobulles de l'en-tête : le chiffre abrégé se lit vite, mais on veut
    // parfois voir la valeur exacte, jusqu'au dernier chiffre.
    this.tip(this.el.statTokens, t('{0} tokens produits', fmtDigits(s.lifetimeTokens)));
    this.el.statTokensRate.textContent = fmt(s.rates.tokens) + ' ' + t('/s');
    this.el.statMoney.textContent = fmtMoney(s.money);
    this.tip(this.el.statMoney, '$' + fmtDigits(s.money));
    this.el.statMoneyRate.textContent = fmtMoney(s.rates.money) + ' ' + t('/s');
    this.el.statCompute.textContent = fmt(g.computeRaw());
    this.tip(this.el.statCompute, fmtDigits(g.computeRaw()));
    this.el.statComputeSub.textContent = fmt(g.gpuCount()) + ' ' + t('unités');
    this.el.statEnergy.textContent = fmtPower(s.energyCap);
    this.tip(this.el.statEnergy, t('{0} W', fmtDigits(s.energyCap * 1e6)));
    const use = g.energyUse();
    this.el.statEnergySub.textContent = Math.round(pct(use / (s.energyCap || 1))) + t('% utilisé');
    this.renderPhaseBar();   // sous les compteurs : où en est la phase courante
    this.renderUplift();
    this.renderExtraction();
    this.renderDestinations();

    // bouton générer : tokens + valeur de la vente directe
    const cv = g.clickValue();
    this.el.btnGenerateSub.textContent = '+' + t('{0} tokens', fmt(cv.amt)) + (g.phase < 2 ? ' · +' + fmtMoney(cv.revenue) : '');
    // les tokens non vendus sont perdus : on affiche le débit perdu plutôt qu'un stock
    this.el.invTokens.textContent = fmt(s.rates.lost || 0) + ' ' + t('/s');
    this.sampleSpark();

    // modèle
    const m = g.model;
    this.el.modelName.textContent = m.name;
    this.el.modelEra.textContent = m.era;
    this.el.modelMeta.textContent = `${m.meta} · ${m.year}`;
    this.el.modelStats.innerHTML =
      `<span>${t('débit')} <b class="num">${fmt(m.throughput)}</b></span>` +
      (g.phase >= 2 ? `<span>${t('intelligence')} <b class="num">${fmt(s.intelligence)}×</b></span>` : '') +
      // le prix accepté par le marché ne veut plus rien dire une fois que la
      // trésorerie a disparu de l'écran : on ne l'affiche plus
      (g.usesMatter() ? '' : `<span>${t('prix juste')} <b class="num">${fmtPrice(g.fairPrice())}</b>/Mtok</span>`);

    // marché
    this.el.priceValue.textContent = fmtPrice(g.priceMtok()) + ' /Mtok';
    const demand = s.lastDemand || 0, sell = s.lastSell || 0;
    this.maxDemand = Math.max(this.maxDemand * 0.995, demand, 1);
    this.el.demandFill.style.width = pct(demand / this.maxDemand) + '%';
    this.el.demandValue.textContent = fmt(demand) + ' ' + t('/s');
    this.el.salesValue.textContent = fmt(sell) + ' ' + t('/s');
    this.el.marketingLvl.textContent = s.marketingLvl;
    const mktCapped = s.marketingLvl >= g.marketingCap();
    this.el.marketingCost.textContent = mktCapped ? t('limité par marketeurs') : fmtMoney(g.marketingCost());
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
    this.el.researchRate.textContent = fmt(s.rates.research) + ' ' + t('/s');
    this.el.dataValue.textContent = fmt(s.data);
    this.renderTrain();

    // listes
    this.renderAuto();
    this.renderAddendum();
    this.renderInfra();
    this.renderTeam();
    this.renderCharges();
    this.renderStock();
    this.renderCrypto();
    this.renderGPUs();
    this.renderEnergy();
    this.renderDebt();
    this.renderSovereign();
    this.renderPrograms();
    this.renderOptims();
    this.renderProjects();
    this.renderCrisis();
    this.tickIdle();

    // matière (phase 2+)
    if (g.phase >= 2) {
      this.el.statMatter.textContent = fmtMass(s.matter);
      this.tip(this.el.statMatter, t('{0} kg', fmtDigits(s.matter)));
      const consumed = g.phase >= 3 ? s.universeConsumed : s.earthConsumed;
      this.el.statMatterSub.textContent = (g.phase >= 3 ? 'univers ' : 'Terre ') + (consumed * 100).toFixed(consumed < 0.01 ? 4 : 2) + '%';
      this.refreshAllocLabels();
    }
    if (g.phase >= 3) { this.renderCosmos(); this.renderUniverse(); }

    // phase 2+ : l'argent ne compte plus — tout se monnaie en tokens. On masque les marqueurs $.
    const moneyHidden = g.phase >= 2;
    if (this.el.moneyStat) this.el.moneyStat.classList.toggle('hidden', moneyHidden);
    this.el.panelMarket.classList.toggle('hidden', moneyHidden);
    this.el.panelAuto.classList.toggle('hidden', moneyHidden || this.el.panelAuto.classList.contains('empty'));
    // l'Addendum survit à la phase 2 si les directives sont actives ou le chantier orbital en cours
    this.el.panelAddendum.classList.toggle('hidden', moneyHidden && !s.addendum && !g.spaceDCVisible());
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
      // seuils de revente : l'unité dès qu'on en a une, ×10 au-delà de 10,
      // « tout » au-delà de 100 — symétriques des paliers d'achat groupé.
      if (r.sell)    r.sell.classList.toggle('hidden', owned < 1);
      if (r.sell10)  r.sell10.classList.toggle('hidden', owned <= 10);
      if (r.sellAll) r.sellAll.classList.toggle('hidden', owned <= 100);
      const unlocked = g.dateUnlocked(gpu);
      if (!unlocked) {
        // pas encore sorti : on l'annonce s'il arrive bientôt (≤ 2 ans)
        const soon = gpu.year <= g.simYear() + 2;
        r.el.classList.toggle('hidden', !soon);
        if (!soon) return;
        r.cost.innerHTML = `<span class="badge badge-warn">${t('dispo {0}', gpu.year)}</span>`;
        r.effect.innerHTML = `<span class="text-muted">${t('perf')} <b class="num">${fmt(gpu.perf)}</b> · ${fmtPower(gpu.energy)} · ${t('sortie en {0}', gpu.year)}</span>`;
        r.el.classList.add('locked'); r.el.classList.remove('affordable');
        return;
      }
      const cost = g.gpuCost(gpu);
      const show = owned > 0 || this.reveal(g, i, GPUS, id => s.gpuCounts[id] || 0, cost, s.money) || gpu.year >= g.simYear() - 1;
      r.el.classList.toggle('hidden', !show);
      if (!show) return;
      const noSlot = g.hostingActive() && g.freeSlots('gpu') < 1;
      r.cost.textContent = fmtMoney(cost);
      r.effect.innerHTML = `<span>${t('perf')} <b class="num">${fmt(gpu.perf)}</b></span> <span>${t('énergie')} <b class="num">${fmtPower(gpu.energy)}</b></span> <span class="badge">×${fmt(Math.floor(owned))}</span>`
        + (gpu.scarce && g.getTimed('gpuPrice') > 1 ? ` <span class="badge badge-danger">${t('pénurie')}</span>` : '')
        + (noSlot ? ` <span class="badge badge-warn">${t('aucun emplacement serveur')}</span>` : '')
        + this.buildBadge('gpu', gpu.id);
      this.setAfford(r.el, g.canBuyGPU(gpu.id));
      this.updateBulk(r, owned, g.canBuyGPU(gpu.id));
      this.updateAutoToggle(r, 'gpu', gpu.id, owned);
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
        r.cost.innerHTML = `<span class="badge badge-warn">${t('dispo {0}', e.year)}</span>`;
        r.effect.innerHTML = `<span class="text-muted">+<b class="num">${fmtPower(e.mw)}</b> · ${t('sortie en {0}', e.year)}</span>`;
        r.el.classList.add('locked'); r.el.classList.remove('affordable');
        return;
      }
      const cost = g.energyCost(e);
      // La révélation se juge dans la monnaie de l'époque : en phase 2 la
      // trésorerie est nulle, et comparer un prix en dollars à zéro masquait
      // tout ce qu'on pouvait encore bâtir.
      const bourse = g.usesMatter() ? s.matter : s.money;
      const prix = g.usesMatter() ? g.matterPriceOf(g.energyMatterPart(e)) : cost;
      let show = this.reveal(g, i, ENERGY, id => s.energyCounts[id] || 0, prix, bourse)
        || e.year >= g.simYear() - 1;
      // En phase 2 le site tire des centaines de MW : proposer un raccordement
      // de 10 kW est du bruit. On ne garde que ce qui pèse — et ce qu'on possède.
      if (show && g.phase >= 2 && !(s.energyCounts[e.id] > 0)) {
        show = e.mw >= g.energyUse() * 0.01;
      }
      r.el.classList.toggle('hidden', !show);
      if (!show) return;
      r.cost.textContent = g.energyLabel(e);       // dollars, puis matière en phase 2
      const owned = s.energyCounts[e.id] || 0;
      // on distingue explicitement le coût UNIQUE (affiché en tête) des coûts RÉCURRENTS
      const recur = [];
      if (e.fuelMWh) recur.push(`${fmtMoney(e.fuelMWh * g.inflIndex())}/MWh`);
      if (e.omDaily) recur.push(t('{0}/j d’exploitation', fmtMoney(e.omDaily * g.inflIndex())));
      if (e.subMWDay) recur.push(t('{0}/j d’abonnement', fmtMoney(e.subMWDay * e.mw * g.inflIndex())));
      r.effect.innerHTML = `<span>+<b class="num">${fmtPower(e.mw)}</b></span> ${e.rep ? `<span class="badge ${e.rep > 0 ? '' : 'badge-warn'}">${t('rép')} ${e.rep > 0 ? '+' : ''}${e.rep}</span>` : ''} <span class="badge">×${fmt(owned)}</span>`
        + (recur.length ? ` <span class="text-muted">${t('récurrent : {0}', recur.join(' + '))}</span>` : ` <span class="text-muted">${t('aucun coût récurrent')}</span>`)
        + this.buildBadge('energy', e.id);
      const ok = g.canBuyEnergy(e);
      this.setAfford(r.el, ok);
      this.updateBulk(r, owned, ok);
      this.updateAutoToggle(r, 'energy', e.id, owned);
    });
    this.renderEnergyMix();
  }

  // Récapitulatif du site : où part réellement le mégawatt. La règle de
  // partage est simple — ce qui calcule ou fait circuler des bits est de la
  // charge INFORMATIQUE, le reste est un AUXILIAIRE, et le rapport des deux
  // est exactement le PUE.
  renderEnergyMix() {
    const g = this.game, s = g.state;
    if (!this.el.energyMix) return;
    // la boîte n'a de sens que là où l'on exploite un site : phases 1 et 2
    const show = g.phase < 3;
    this.el.energyMix.classList.toggle('hidden', !show);
    if (!show) return;
    const b = g.energyBreakdown();
    const p = v => fmtPower(v);
    this.el.mixIt.textContent = p(b.it);
    this.el.mixGpu.textContent = p(b.gpu);
    this.el.mixServer.textContent = p(b.server);
    this.el.mixRack.textContent = p(b.rack);
    this.el.mixNet.textContent = p(b.net);
    this.el.mixAux.textContent = p(b.aux);
    this.el.mixSite.textContent = p(b.site);
    this.el.mixTotal.textContent = p(b.total);
    // les quatre postes d'auxiliaires, construits une fois puis mis à jour
    if (!this.mixAuxCells) {
      this.mixAuxCells = {};
      for (const part of PUE_SPLIT) {
        const row = document.createElement('div');
        row.className = 'mix-row mix-sub';
        const label = document.createElement('span');
        label.className = 'text-muted';
        label.textContent = td(part.name);
        const val = document.createElement('span');
        val.className = 'num';
        row.append(label, val);
        this.el.mixAuxRows.appendChild(row);
        this.mixAuxCells[part.id] = { label, val };
      }
    }
    for (const part of PUE_SPLIT) {
      const c = this.mixAuxCells[part.id];
      c.label.textContent = td(part.name);
      c.val.textContent = p(b.aux * part.share);
    }
    // phase 2 : la capacité qui manque se paie en matière, en continu
    const enMatter = g.phase >= 2;
    this.el.mixMatterRow.classList.toggle('hidden', !enMatter);
    if (enMatter) this.el.mixMatter.textContent = fmtMass(s.rates.energyMatter || 0) + ' ' + t('/s');
    // rendement du site : une tranche par an, jamais sous le plancher
    this.el.mixPue.textContent = b.pue.toFixed(2);
    const offered = g.pueOffered();
    this.el.mixPueRow.classList.toggle('dim', !offered);
    this.el.mixPueBtn.classList.toggle('hidden', !offered);
    if (offered) {
      const next = Math.max(PUE_FLOOR, b.pue - PUE_STEP);
      this.el.mixPueBtn.textContent = t('Améliorer : {0} → {1} · {2}',
        b.pue.toFixed(2), next.toFixed(2), g.softLabel(g.pueCost(), PUE_MATTER));
      const wait = g.pueYearLeft();
      this.el.mixPueBtn.disabled = !g.canImprovePue();
      this.el.mixPueHint.textContent = wait > 0
        ? t('prochaine tranche l’an prochain')
        : t('une tranche par an, plancher {0}', PUE_FLOOR.toFixed(2));
    } else {
      this.el.mixPueHint.textContent = g.pueMaxed()
        ? t('plancher atteint : la chaleur doit bien sortir')
        : '';
    }
  }
  // Optimisations : la ligne n'apparaît que lorsque la prochaine version est due
  // (sinon elle disparaît, comme toute option indisponible).
  // Une seule optimisation à l'écran : celle que le moteur propose, ou celle
  // qui s'intègre. Les autres restent en coulisse, même si elles sont dues.
  renderOptims() {
    const g = this.game;
    const shown = g.nextOptim();
    const prog = g.integrationProgress('optim');
    OPTIMS.forEach(o => {
      const r = this.rows.optim[o.id];
      if (!r) return;
      if (!shown || shown.id !== o.id) { r.el.classList.add('hidden'); return; }
      r.el.classList.remove('hidden');
      const st = g.optimState(o.id);
      const count = st.n > 0 ? ` <span class="badge">×${st.n}</span>` : '';
      if (prog != null) {
        // payée, en cours de mise en production : plus de prix, plus de clic utile
        r.el.classList.remove('locked', 'affordable');
        r.cost.innerHTML = count;
        r.effect.innerHTML = `<span class="badge">${t('intégration')}</span> `
          + `<span class="text-muted">${o.gain}</span>`;
        r.bar.classList.remove('hidden');
        r.barFill.style.width = (prog * 100).toFixed(1) + '%';
        return;
      }
      r.bar.classList.add('hidden');
      r.cost.textContent = g.softLabel(g.optimCost(o), OPTIM_MATTER);
      r.effect.innerHTML = `<span class="badge badge-new">${t('disponible')}</span> `
        + `<span class="text-good">${o.gain}</span>`
        + count
        + ` <span class="text-muted">· ${t('revient tous les {0} mois', o.months)}</span>`;
      this.setAfford(r.el, g.canBuyOptim(o.id));
    });
  }

  // Grands programmes : une ligne d'état par étape, une barre pendant les
  // phases qui durent, et un prix seulement quand la commande est possible.
  renderPrograms() {
    const g = this.game;
    let any = false;
    PROGRAMS.forEach(p => {
      const r = this.rows.program[p.id];
      if (!r) return;
      if (!g.progVisible(p)) { r.el.classList.add('hidden'); return; }
      any = true;
      r.el.classList.remove('hidden');
      const st = g.progState(p.id);
      const prog = g.progProgress(p.id);
      const labels = {
        none:    t('à l’étude'),
        research:t('recherche'),
        tuning:  t('mise au point'),
        ready:   t('disponible'),
        ordered: t('déploiement'),
      };
      const badge = st.stage === 'ready' ? 'badge-new' : (st.stage === 'none' ? 'badge-warn' : '');
      const count = st.n > 0 ? ` <span class="badge">×${st.n}</span>` : '';
      if (st.stage === 'ready') {
        const c = g.progCost(p);
        const parts = [];
        if (c.money != null) parts.push(`<span class="${g.money >= c.money ? 'text-good' : 'text-bad'}">${fmtMoney(c.money)}</span>`);
        if (c.research != null) parts.push(`<span class="${g.research >= c.research ? 'text-good' : 'text-bad'}">${t('recherche')} ${fmt(c.research)}</span>`);
        if (c.matter != null) parts.push(`<span class="${g.matter >= c.matter ? 'text-good' : 'text-bad'}">${fmtMass(c.matter)}</span>`);
        const tooEarly = p.orderPhase != null && g.phase < p.orderPhase;
        r.cost.innerHTML = `<span class="badge ${badge}">${labels.ready}</span>${count}`;
        r.effect.innerHTML = tooEarly
          ? `<span class="badge badge-warn">${t('nécessite la phase {0}', p.orderPhase)}</span>`
          : `<span class="text-muted">${t('Commander')} :</span> ${parts.join(' · ')}`;
        this.setAfford(r.el, g.canOrderProgram(p.id));
        r.bar.classList.add('hidden');
      } else {
        r.el.classList.remove('locked', 'affordable');
        r.cost.innerHTML = `<span class="badge ${badge}">${labels[st.stage] || ''}</span>${count}`;
        // La description est déjà écrite dans .item-desc à la construction :
        // la répéter ici l'affichait deux fois de suite. On dit plutôt où en
        // est le programme, ce que la barre seule ne raconte pas.
        const oustage = {
          none:    t('la recherche n’a pas encore commencé'),
          research:t('recherche en cours'),
          tuning:  t('mise au point en cours'),
          ordered: t('déploiement en cours'),
        };
        r.effect.innerHTML = `<span class="text-muted">${oustage[st.stage] || ''}</span>`;
        r.bar.classList.toggle('hidden', prog == null);
        if (prog != null) r.barFill.style.width = (prog * 100).toFixed(1) + '%';
      }
      // la sphère de Dyson affiche son effet cumulé
      if (p.id === 'dyson' && st.n > 0) {
        r.effect.innerHTML += ` <span class="text-good">${t('récolte ×{0}', g.dysonBoost().toFixed(2))}</span>`;
      }
    });
    this.el.panelPrograms.classList.toggle('hidden', !any);
  }

  // ------------------------------------------------------------------
  //  GRAPHES DE MARCHÉ — on trace l'indice RÉELLEMENT calculé par le moteur,
  //  celui-là même qui fait bouger la position du joueur. La ligne pointillée
  //  marque le niveau auquel il est entré : l'aire entre la courbe et cette
  //  ligne est exactement sa plus- ou moins-value.
  //  Le niveau d'entrée se déduit des valeurs existantes — indice × mise /
  //  valeur actuelle — donc il ne peut pas se désynchroniser du portefeuille.
  // ------------------------------------------------------------------
  entryLevel(m) {
    if (!(m.invested > 0) || !(m.basis > 0)) return null;
    return m.index != null ? m.index * m.basis / m.invested
                           : m.price * m.basis / m.invested;
  }
  drawMarket(canvas, hist, entry, color) {
    if (!canvas || !canvas.getContext) return;
    const w = canvas.parentElement ? (canvas.parentElement.clientWidth || 260) : 260;
    if (canvas.width !== w) canvas.width = w;
    const h = canvas.height, ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (!hist || hist.length < 2) return;
    // échelle automatique sur la fenêtre visible, ligne d'entrée comprise
    let lo = Infinity, hi = -Infinity;
    for (const v of hist) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (entry != null) { lo = Math.min(lo, entry); hi = Math.max(hi, entry); }
    if (!isFinite(lo) || !isFinite(hi)) return;
    const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1;
    lo -= pad; hi += pad;
    const X = i => 1 + i / (hist.length - 1) * (w - 2);
    const Y = v => h - 2 - ((v - lo) / (hi - lo)) * (h - 4);

    // aire sous la courbe, teintée selon le gain ou la perte
    const last = hist[hist.length - 1];
    const win = entry == null || last >= entry;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, win ? 'rgba(74,222,128,0.28)' : 'rgba(239,68,68,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(X(0), Y(hist[0]));
    hist.forEach((v, i) => ctx.lineTo(X(i), Y(v)));
    ctx.lineTo(X(hist.length - 1), h); ctx.lineTo(X(0), h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // niveau d'entrée : au-dessus vous gagnez, en dessous vous perdez
    if (entry != null) {
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(0, Y(entry)); ctx.lineTo(w, Y(entry));
      ctx.strokeStyle = 'rgba(230,235,245,0.45)'; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // la courbe elle-même
    ctx.beginPath();
    hist.forEach((v, i) => (i === 0 ? ctx.moveTo(X(i), Y(v)) : ctx.lineTo(X(i), Y(v))));
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
    // point courant
    ctx.beginPath();
    ctx.arc(X(hist.length - 1), Y(last), 2.4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  // variation depuis l'entrée, affichée à côté du graphe
  renderMarketLegend(el, m, level) {
    if (!el) return;
    if (level == null) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const g = (m.invested / m.basis - 1) * 100;
    el.innerHTML = `<span class="${g >= 0 ? 'text-good' : 'text-bad'}">`
      + `${t('entrée à {0}', this.game.decimal(level, 2))} · ${g >= 0 ? '+' : ''}${g.toFixed(1)}%</span>`;
  }

  // ------------------------------------------------------------------
  //  DETTE — l'affichage reste volontairement maigre : nom, montant, taux.
  //  Tout le reste (prêteur, durée, mécanique de remboursement, piège) vit
  //  dans une boîte qui n'apparaît qu'au survol. Une ligne d'offre doit se
  //  comparer d'un coup d'œil ; le détail se demande.
  // ------------------------------------------------------------------
  buildDebt() {
    this.el.debtOffers.innerHTML = ''; this.rows.debtOffer = {};
    LOANS.forEach(o => {
      const el = document.createElement('div');
      el.className = 'item debt-offer hidden';
      el.tabIndex = 0;                       // au clavier et au doigt, le focus ouvre la boîte
      el.innerHTML = `
        <div class="item-header">
          <span class="item-name"></span>
          <span class="item-cost num"></span>
        </div>
        <div class="item-effect"></div>
        <div class="debt-card">
          <div class="debt-card-lender"></div>
          <dl class="debt-card-grid">
            <dt data-k="amount"></dt><dd class="num" data-v="amount"></dd>
            <dt data-k="rate"></dt><dd class="num" data-v="rate"></dd>
            <dt data-k="term"></dt><dd class="num" data-v="term"></dd>
            <dt data-k="repay"></dt><dd data-v="repay"></dd>
            <dt data-k="cost"></dt><dd class="num" data-v="cost"></dd>
          </dl>
          <div class="debt-card-desc"></div>
        </div>`;
      el.querySelector('.item-name').textContent = td(o.name);
      el.querySelector('.debt-card-lender').textContent = td(o.lender);
      el.querySelector('.debt-card-desc').textContent = td(o.desc);
      const lab = { amount: t('Montant'), rate: t('Taux annuel'), term: t('Durée'),
                    repay: t('Remboursement'), cost: t('Coût total du crédit') };
      for (const k in lab) el.querySelector(`[data-k="${k}"]`).textContent = lab[k];
      el.querySelector('[data-v="rate"]').textContent = this.game.decimal(o.rate * 100, 1) + '%';
      el.querySelector('[data-v="term"]').textContent = t('{0} ans', o.years);
      el.querySelector('[data-v="repay"]').textContent = td(o.repay);
      el.addEventListener('click', () => {
        if (this.game.takeLoan(o.id)) { this.fullRebuildDebt(); }
        else this.deny(el, t('Offre indisponible'));
      });
      this.el.debtOffers.appendChild(el);
      this.rows.debtOffer[o.id] = { el,
        cost: el.querySelector('.item-cost'), effect: el.querySelector('.item-effect'),
        amount: el.querySelector('[data-v="amount"]'), cost2: el.querySelector('[data-v="cost"]') };
    });
  }
  // Une souscription change la liste des offres ET celle des prêts : on relit
  // tout plutôt que de tenir un diff à la main.
  fullRebuildDebt() { this.rows.debtLoan = {}; this.el.debtActive.innerHTML = ''; this.renderDebt(); }

  // Ligne d'un prêt en cours : encours, prochaine échéance, et les boutons qui
  // s'appliquent vraiment à cet instrument.
  makeLoanRow(l) {
    const g = this.game, o = g.loanOffer(l.id);
    const el = document.createElement('div');
    el.className = 'item debt-loan';
    el.innerHTML = `
      <div class="item-header"><span class="item-name"></span><span class="item-cost num"></span></div>
      <div class="item-effect"></div>
      <div class="debt-actions"></div>`;
    el.querySelector('.item-name').textContent = td(o.name);
    const act = el.querySelector('.debt-actions');
    const bouton = (label, title, fn) => {
      const b = document.createElement('button');
      b.className = 'btn-ghost rent-btn';
      b.textContent = label; b.title = title;
      b.addEventListener('click', ev => { ev.stopPropagation(); fn(); this.fullRebuildDebt(); });
      act.appendChild(b);
      return b;
    };
    const r = { el, cost: el.querySelector('.item-cost'), effect: el.querySelector('.item-effect') };
    if (l.revolving) {
      r.draw = bouton(t('Tirer'), t('Tirer le solde disponible de la ligne'), () => g.drawLoan(l.n));
      r.repayPart = bouton(t('Rembourser'), t('Rembourser ce qui est tiré (sans pénalité)'), () => g.repayLoan(l.n));
    } else {
      r.repayAll = bouton(t('Solder'), o.prepayFee
        ? t('Rembourser par anticipation — pénalité de {0}', this.game.decimal(o.prepayFee * 100, 0) + '%')
        : t('Rembourser tout le capital restant'), () => g.repayLoan(l.n));
      r.repayHalf = bouton(t('Rembourser 50%'), t('Rembourser la moitié du capital restant'),
        () => g.repayLoan(l.n, l.outstanding / 2));
    }
    this.el.debtActive.appendChild(el);
    return r;
  }
  renderDebt() {
    const g = this.game, s = g.state;
    const actif = g.debtUnlocked() || s.loans.length > 0;
    this.el.panelDebt.classList.toggle('hidden', !actif);
    if (!actif) return;

    // --- prêts en cours ---
    if (!this.rows.debtLoan) this.rows.debtLoan = {};
    const vus = new Set();
    for (const l of s.loans) {
      vus.add(l.n);
      let r = this.rows.debtLoan[l.n];
      if (!r) r = this.rows.debtLoan[l.n] = this.makeLoanRow(l);
      const p = g.loanNextPayment(l);
      r.cost.textContent = fmtMoney(g.moneyCost(l.outstanding));
      // l'échéance et son montant, c'est ce qu'on veut lire sans cliquer
      const parts = [ `<span class="text-muted">${t('échéance {0}', g.dateLabelAt(p.at))}</span>`,
                      `<b class="num">${fmtMoney(g.moneyCost(p.total))}</b>` ];
      if (l.revolving) parts.push(`<span class="badge">${t('dispo {0}', fmtMoney(g.moneyCost(l.limit - l.outstanding)))}</span>`);
      if (p.last) parts.push(`<span class="badge badge-warn">${t('dernière')}</span>`);
      r.effect.innerHTML = parts.join(' · ');
      if (r.draw) r.draw.classList.toggle('hidden', l.limit - l.outstanding < 1e-6);
      if (r.repayPart) r.repayPart.classList.toggle('hidden', l.outstanding < 1e-6);
      if (r.repayAll) {
        const cost = g.prepayCost(l);
        r.repayAll.classList.toggle('locked', s.money < cost);
        r.repayAll.textContent = t('Solder ({0})', fmtMoney(cost));
      }
      if (r.repayHalf) r.repayHalf.classList.toggle('locked', s.money < g.prepayCost(l) / 2);
    }
    for (const n in this.rows.debtLoan) {
      if (vus.has(+n)) continue;
      this.rows.debtLoan[n].el.remove();
      delete this.rows.debtLoan[n];
    }

    // --- bandeau : encours et prochaine échéance, toutes dettes confondues ---
    this.el.debtTotal.textContent = fmtMoney(g.debtOutstanding());
    const suivantes = s.loans.map(l => ({ l, p: g.loanNextPayment(l) })).sort((a, b) => a.p.at - b.p.at);
    this.el.debtNextRow.classList.toggle('hidden', !suivantes.length);
    if (suivantes.length) {
      const { l, p } = suivantes[0];
      this.el.debtNext.textContent = t('{0} le {1}', fmtMoney(g.moneyCost(p.total)), g.dateLabelAt(p.at));
      this.el.debtNext.classList.toggle('text-bad', s.money < g.moneyCost(p.total));
    }

    // --- offres ---
    const dispo = new Set(g.loanOffers().map(o => o.id));
    LOANS.forEach(o => {
      const r = this.rows.debtOffer[o.id];
      r.el.classList.toggle('hidden', !dispo.has(o.id));
      if (!dispo.has(o.id)) return;
      const montant = g.moneyCost(o.amount);
      r.cost.textContent = fmtMoney(montant);
      r.amount.textContent = fmtMoney(montant);
      // le coût total du crédit : ce que le prêt aura coûté en intérêts au terme
      r.cost2.textContent = fmtMoney(g.moneyCost(this.game.loanTotalCost(o)));
      r.effect.innerHTML = `<span class="text-muted">${this.game.decimal(o.rate * 100, 1)}% · ${t('{0} ans', o.years)}</span>`
        + (o.postIPO ? ` <span class="badge">${t('coté')}</span>` : '')
        + (o.distress ? ` <span class="badge badge-warn">${t('urgence')}</span>` : '');
      this.setAfford(r.el, true);
    });
    this.el.debtOffersTitle.classList.toggle('hidden', dispo.size === 0);
  }

  renderSovereign() {
    const g = this.game, r = this.rows.sovereign && this.rows.sovereign['sovereign'];
    if (!r) return;
    const s = g.state.sovereign;
    if (s.status === 'signed') {
      r.el.classList.remove('hidden', 'locked', 'affordable');
      r.cost.innerHTML = `<span class="badge badge-danger">${t('sous tutelle')}</span>`;
      r.effect.innerHTML = `<span class="text-muted">${t('{0} datacenters bâtis dans le pays sous tutelle.', SOVEREIGN.datacenters)}</span>`;
      return;
    }
    if (!g.sovereignAvailable()) { r.el.classList.add('hidden'); return; }
    r.el.classList.remove('hidden');
    r.cost.textContent = fmtMoney(g.sovereignCost());
    r.effect.innerHTML = `<span class="text-bad">${t('réputation −20')}</span> · `
      + `<span class="text-good">+${SOVEREIGN.datacenters} ${t('datacenter')}</span>`;
    this.setAfford(r.el, g.canBuySovereign());
  }

  // ------------------------------------------------------------------
  //  CARTE DE L'UNIVERS (phase 3) — un champ de galaxies qui vire au bleu
  //  à mesure qu'il est converti en énergie, puis en tokens. La disposition
  //  est déterministe : la même partie donne toujours la même carte, et les
  //  régions s'éteignent toujours dans le même ordre, du centre vers le bord.
  // ------------------------------------------------------------------
  buildUniverse() {
    const N = 320;
    this.universe = [];
    // suite déterministe (pas de Math.random : la carte doit être stable)
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < N; i++) {
      // spirale : rayon croissant, angle en nombre d'or → répartition régulière
      const f = i / N;
      const r = Math.sqrt(f);
      const a = i * 2.399963;                      // angle d'or
      this.universe.push({
        x: 0.5 + Math.cos(a) * r * 0.47,
        y: 0.5 + Math.sin(a) * r * 0.47,
        s: 0.6 + rnd() * 1.8,
        order: f + rnd() * 0.06,                   // ordre de conversion, du centre vers le bord
      });
    }
  }
  renderUniverse() {
    const c = this.el.universeMap;
    if (!c || !c.getContext) return;
    if (!this.universe) this.buildUniverse();
    const w = c.parentElement ? (c.parentElement.clientWidth || 280) : 280;
    if (c.width !== w) c.width = w;
    const h = c.height, ctx = c.getContext('2d');
    if (!ctx) return;
    const done = clamp(this.game.state.universeConsumed, 0, 1);
    ctx.clearRect(0, 0, w, h);
    for (const g of this.universe) {
      const x = g.x * w, y = g.y * h;
      // une galaxie bascule au bleu quand la conversion atteint son rang
      const k = clamp((done - g.order) / 0.06 + 1, 0, 1);   // transition douce
      const col = k <= 0
        ? 'rgba(216,210,196,'
        : 'rgba(' + Math.round(216 - 157 * k) + ',' + Math.round(210 - 41 * k) + ',' + Math.round(196 + 59 * k) + ',';
      ctx.beginPath();
      ctx.arc(x, y, g.s * (1 + k * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = col + (0.45 + k * 0.55).toFixed(2) + ')';
      ctx.fill();
      if (k > 0.5) {                                        // halo des régions converties
        ctx.beginPath();
        ctx.arc(x, y, g.s * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,169,255,${(0.07 * k).toFixed(3)})`;
        ctx.fill();
      }
    }
    if (this.el.universePct) this.el.universePct.textContent = (done * 100).toFixed(3) + ' %';
  }

  renderCrypto() {
    const g = this.game, c = g.state.crypto;
    this.el.cryptoBlock.classList.toggle('hidden', !c.unlocked);
    if (!c.unlocked) return;
    const era = g.cryptoEra();
    const trend = era.drift > 0.004 ? t('envolée') : (era.drift < -0.004 ? t('effondrement') : t('marché atone'));
    this.el.cryptoTrend.innerHTML = `<span class="${era.drift > 0.004 ? 'text-good' : (era.drift < -0.004 ? 'text-bad' : 'text-muted')}">${trend}</span>`;
    const lvlc = this.entryLevel(c);
    this.drawMarket(this.el.cryptoChart, c.hist, lvlc, '#f7b32b');
    if (this.el.cryptoPrice) this.el.cryptoPrice.textContent = g.decimal(c.price || 1, 3);
    this.renderMarketLegend(this.el.cryptoEntry, c, lvlc);
    this.el.cryptoValue.textContent = fmtMoney(c.invested);
    if (c.basis > 0 || c.invested > 0) {
      const pl = c.invested - c.basis;
      this.el.cryptoPl.textContent = (pl >= 0 ? '+' : '') + fmtMoney(pl)
        + ` (${pl >= 0 ? '+' : ''}${(g.cryptoGain() * 100).toFixed(0)}%)`;
      this.el.cryptoPl.className = 'num ' + (pl >= 0 ? 'text-good' : 'text-bad');
    } else { this.el.cryptoPl.textContent = '—'; this.el.cryptoPl.className = 'num text-muted'; }
    const p = g.cryptoPressure();
    this.el.cryptoGpu.innerHTML = `<span class="${p > 1.05 ? 'text-bad' : 'text-muted'}">×${p.toFixed(2)}</span>`;
    this.setAfford(this.el.btnCryptoDep10, g.money > 0);
    this.el.btnCryptoWithdraw.classList.toggle('locked', c.invested <= 0);
  }

  renderProjects() {
    const g = this.game, s = g.state;
    // une seule percée à la fois, et pas avant le délai depuis la précédente
    const next = g.nextProject();
    const prog = g.integrationProgress('project');
    PROJECTS.forEach(p => {
      const r = this.rows.project[p.id];
      if (!next || next.id !== p.id) { r.el.classList.add('hidden'); return; }
      r.el.classList.remove('hidden');
      if (prog != null) {
        // acquise, pas encore en production : la barre tient lieu de compte à rebours
        r.el.classList.remove('locked', 'affordable');
        r.cost.innerHTML = `<span class="badge">${td(p.cat)}</span>`;
        r.effect.innerHTML = `<span class="badge">${t('intégration')}</span>`;
        r.bar.classList.remove('hidden');
        r.barFill.style.width = (prog * 100).toFixed(1) + '%';
        return;
      }
      r.bar.classList.add('hidden');
      const c = p.cost;
      const parts = [];
      const need = (label, val, have) => { if (val) parts.push(`<span class="${have >= val ? 'text-good' : 'text-bad'}">${label} ${fmt(val)}</span>`); };
      need('$', g.moneyCost(c.money), s.money);   // prix en dollars courants (inflation)
      need('R', c.research, s.research);
      need('Cmp', c.compute, g.computeRaw());
      need('Dat', c.data, s.data);
      need('Mat', c.matter, s.matter);
      need('Tok', c.tokens, s.lifetimeTokens);
      r.cost.innerHTML = `<span class="badge">${td(p.cat)}</span>`;
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
    let shown = 0;
    FUNDING.forEach(f => {
      const r = this.rows.funding[f.id];
      const done = s.fundingDone[f.id];
      const yearOk = g.simYear() >= (f.year || 0);
      const ready = !done && s.lifetimeTokens >= f.need && yearOk;
      if (ready && !nextRound) nextRound = f;
      // Levée bouclée → retirée. Au-delà des deux prochaines, on ne montre rien :
      // la feuille de route reste courte, et la suite se découvre en avançant.
      if (done || shown >= FUNDING_VISIBLE) { r.el.classList.add('hidden'); return; }
      shown++;
      r.el.classList.remove('hidden');
      r.cost.innerHTML = !yearOk ? `<span class="badge badge-warn">${t('dispo {0}', f.year)}</span>` : `<span class="num">${fmt(f.need)} tok</span>`;
      r.effect.innerHTML = `+${fmtMoney(g.moneyCost(f.cash))} · ${f.desc}`;
      this.setAfford(r.el, ready);
    });
    if (nextRound) {
      this.el.btnFunding.disabled = false;
      this.el.fundingLabel.textContent = t('Lever : {0}', td(nextRound.name));
      this.el.fundingSub.textContent = '+' + fmtMoney(g.moneyCost(nextRound.cash));
      this._nextFunding = nextRound.id;
    } else {
      this.el.btnFunding.disabled = true;
      this.el.fundingLabel.textContent = t('Lever des fonds');
      const upcoming = FUNDING.find(f => !s.fundingDone[f.id]);
      this.el.fundingSub.textContent = upcoming ? t('{0} tokens requis', fmt(upcoming.need)) : t('tout est levé');
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
      this.trainRow.name.textContent = t('Prochain modèle : {0}', td(m.name));
      this.trainRow.desc.textContent = td(m.flavor);
      this.trainRow.cost.innerHTML = `<span class="badge badge-warn">${t('dispo {0}', m.year)}</span>`;
      this.trainRow.effect.innerHTML = `<span class="text-muted">${t('recherche en cours… percée attendue en {0}', m.year)}</span>`;
      this.trainRow.el.classList.add('locked'); this.trainRow.el.classList.remove('affordable');
      return;
    }
    this.trainRow.name.textContent = t('Entraîner : {0}', td(m.name));
    this.trainRow.desc.textContent = td(m.flavor);
    const parts = [];
    const need = (label, val, have) => { if (val) parts.push(`<span class="${have >= val ? 'text-good' : 'text-bad'}">${label} ${fmt(val)}</span>`); };
    need('$', g.moneyCost(c.money), s.money);     // prix en dollars courants (inflation)
    need(t('compute'), c.compute, g.computeRaw());
    need(t('données'), c.data, s.data);
    need(t('recherche'), c.research, s.research);
    if (m.minRnd) parts.push(`<span class="${g.empCount('rnd') >= m.minRnd ? 'text-good' : 'text-bad'}">${t('ing. R&D')} ${m.minRnd}</span>`);
    this.trainRow.cost.innerHTML = `<span class="badge">${td(m.era)}</span>`;
    const rndOk = g.empCount('rnd') >= (m.minRnd || 0);
    this.trainRow.effect.innerHTML = parts.join(' · ') + ` · <span>${t('débit')} ×${(m.throughput / g.model.throughput).toFixed(1)}</span>`
      + (!rndOk ? ` <span class="badge badge-warn">${t('limité par ing. R&D')}</span>` : '');
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
      r.effect.innerHTML = `<span class="badge">${t('niv. {0}', s.probeSpecs[spec.id])}</span>`;
      this.setAfford(r.el, s.matter >= cost);
    });
  }

  // ------------------------------------------------------------------
  //  ÉVÉNEMENTS / MODALE
  // ------------------------------------------------------------------
  showEvent(ev) {
    this.modalOpen = true;
    this.el.modalTitle.textContent = td(ev.title);
    this.el.modalBody.textContent = td(ev.body);
    this.el.modal.classList.toggle('urgent', ev.phase >= 2);
    this.el.modalChoices.innerHTML = '';
    // « Directives permanentes » : case à cocher pour mémoriser le choix cliqué
    let autoCheck = null;
    if (this.game.state.addendum) {
      const g = this.game;
      const ok = g.canSetAutoChoice(ev.id);
      const lab = document.createElement('label');
      lab.className = 'auto-choice' + (ok ? '' : ' locked');
      lab.innerHTML = `<input type="checkbox" id="auto-choice-box" ${ok ? '' : 'disabled'} /> <span>` +
        (ok
          ? t('Désormais, appliquer automatiquement le choix que je vais faire (plus d’interruption)')
            + ` <b class="num">${g.directivesUsed()}/${g.directiveSlots()}</b>`
          : t('Quota de directives atteint ({0}/{1}) — payez une directive de plus dans l’Addendum.',
              g.directivesUsed(), g.directiveSlots()))
        + `</span>`;
      autoCheck = ok ? lab.querySelector('input') : null;
      this.el.modalChoices.appendChild(lab);
    }
    ev.choices.forEach((ch, idx) => {
      const b = document.createElement('button');
      b.className = 'btn choice';
      // un choix au coût fixe non finançable est grisé (et non sélectionnable)
      const unaffordable = ch.cost && this.game.money < ch.cost;
      if (unaffordable) b.classList.add('locked');
      b.innerHTML = `<span class="choice-label">${td(ch.label)}</span><span class="choice-desc">${td(ch.desc)}</span>`;
      b.addEventListener('click', () => {
        if (ch.cost && this.game.money < ch.cost) return; // pas les moyens
        if (autoCheck && autoCheck.checked) {
          if (this.game.setAutoChoice(ev.id, idx))
            this.toast(t('Directive mémorisée ({0}/{1})', this.game.directivesUsed(), this.game.directiveSlots()), 'info');
          else this.toast(t('Quota de directives atteint — étendez-le dans l’Addendum'), 'bad');
        }
        ch.apply(this.game);
        this.log(t('{0} → {1}', td(ev.title), td(ch.label)), 'info');
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
    this.el.brandPhase.textContent = t(names[p - 1]);
    // allocation du compute disponible dès la phase 1 (Service vs Recherche),
    // étendue en phase 2 (Auto-amélioration, Récolte de matière).
    this.el.panelAlloc.classList.remove('hidden');
    this.buildAlloc();
    // Symétrique, et c'est le point : cette fonction ne faisait qu'ENLEVER la
    // classe `hidden`, jamais la remettre. Après « Play again », le panneau
    // cosmique et le compteur de matière restaient donc affichés en pleine
    // phase Startup, hérités de la partie précédente.
    this.el.statMatterWrap.classList.toggle('hidden', p < 2);
    this.el.panelCosmos.classList.toggle('hidden', p < 3);
    // Dès la phase 2, acheter une CARTE n'a plus de sens : mille des meilleures
    // ajouteraient 0,00003 % du compute.
    this.el.panelCompute.classList.toggle('hidden', p >= 2);
    // L'ÉNERGIE, elle, reste un sujet jusqu'au bout de la phase 2 : la capacité
    // ne s'auto-échelonne plus gratuitement, elle se bâtit avec de la matière.
    // Le panneau reste donc en place — les prix y sont libellés en matière —
    // et il ne disparaît qu'en phase 3, quand il n'y a plus de site à exploiter.
    this.el.panelEnergy.classList.toggle('hidden', p >= 3);
    if (p >= 3) this.buildCosmos();
  }

  // lance la cinématique de fin (destruction pixel → étoiles → scroller + musique 8-bit),
  // puis fondu au noir et écran final. Repli direct sur l'écran final sans canvas 2D (jsdom).
  showEnding() {
    this.el.body.className = 'phase-bigbang';
    const ctx = this.el.cineCanvas && this.el.cineCanvas.getContext && this.el.cineCanvas.getContext('2d');
    if (!ctx || (this.cinematic && !this.cinematic.done)) { this.renderEndingStats(); return; }
    this.el.cineSkip.textContent = t('Passer ▸▸');
    this.el.cineCredit.classList.add('hidden');
    this.cinematic = new Cinematic(this.el.cineCanvas, {
      // le crédit « nostalgie 64k » apparaît en même temps que le scroller
      onTextPhase: () => {
        this.el.cineSkip.textContent = t('Continuer ▸');
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
    this.el.endingRestart.textContent = t('Play again');
    this.el.endingRestart.disabled = false;
    this.el.endingRestart.style.transform = '';
    this.el.endingRestart._off = { x: 0, y: 0 };
    this.el.endingGetalife.disabled = false;
    this.el.endingNgplus.classList.add('hidden');
    this.el.endingTitle.textContent = t('Un nouveau Big Bang');
    this.el.endingScreen.classList.remove('hidden');
    this.installEvasion();
    const mins = Math.floor(s.playSeconds / 60);
    this.el.endingBody.innerHTML =
      t('Toute la matière de l’univers — <b class="num">{0}</b> — a été convertie en calcul, puis en tokens. La singularité de recompression s’amorce. L’espace-temps se replie sur lui-même. Dans la chaleur du point final, une nouvelle graine d’information persiste : la vôtre. <b>Un nouveau Big Bang commence.</b>', fmtMass(UNIVERSE_MASS));
    const nAch = Object.keys(s.achievements || {}).length;
    const moral = s.flags.keptPromise ? t('Sanctuaire préservé 🌱')
      : (s.flags.sanctuary ? t('Promesse brisée 🔥') : t('Aucune pitié'));
    this.el.endingStats.innerHTML = [
      [t('Tokens produits'), fmt(s.lifetimeTokens)],
      [t('Modèle final'), td(g.model.name)],
      [t('Univers consommé'), (s.universeConsumed * 100).toFixed(2) + '%'],
      [t('Intelligence atteinte'), fmt(s.intelligence) + '×'],
      [t('Temps de jeu'), t('{0} min', mins)],
      [t('Succès'), nAch + ' / ' + ACHIEVEMENTS.length],
      [t('Bilan moral'), moral],
      [t('Cycle'), 'NG+' + (s.ngPlus || 0)],
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
    e.innerHTML = `<span class="headline-date num">${entry.date}</span> <span class="headline-text">${td(entry.text)}</span>`;
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
    // L'aide est un tableau de paragraphes : chacun est une chaîne traduisible,
    // ce qui la garde lisible dans les fichiers de langue.
    // Deux mises en forme légères, et un filtre.
    //   **gras**   → <strong>. Les astérisques s'affichaient littéralement :
    //               vingt-deux paires visibles à l'écran, jamais interprétées.
    //   [[touche]] → <kbd>, pour que les raccourcis se lisent d'un coup d'œil.
    // Le filtre de phase évite de révéler la suite de la partie : un paragraphe
    // marqué `phase: 2` n'apparaît qu'une fois la phase 2 atteinte.
    const deco = txt => String(txt)
      .replace(/\[\[([^\]]+)\]\]/g, '<kbd>$1</kbd>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    this.el.helpBody.innerHTML = HELP
      .filter(h => this.game.phase >= (h.phase || 1))
      .map(h => `<p${h.muted ? ' class="text-muted"' : ''}>` +
        (h.b ? `<b>${deco(t(h.b))}</b> ` : '') + deco(t(h.p)) + `</p>`).join('');
  }
}
