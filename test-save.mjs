// =====================================================================
//  TEST DE SAUVEGARDE / RESTAURATION
//
//  On joue une VRAIE partie, avec le même bot que le simulateur
//  d'équilibrage, et on s'arrête à des instants choisis pour faire, à
//  chaque fois, l'aller-retour complet :
//
//      sauvegarder  →  nouvelle instance  →  charger  →  comparer
//
//  La comparaison est un diff RÉCURSIF de l'état entier, clé par clé.
//  Elle n'a pas de liste de ce qu'il faut vérifier : elle vérifie TOUT,
//  et n'excuse que ce qui est délibérément remis à zéro au chargement
//  (la grâce d'entrée de partie, l'horodatage). Un champ ajouté au jeu
//  demain sera donc couvert sans qu'on y pense.
//
//  Puis on vérifie que la partie RESTAURÉE se comporte comme l'originale :
//  on fait tourner les deux dix secondes de plus et on compare à nouveau.
//  Un état identique qui produit ensuite des résultats différents, c'est
//  un état incomplet — juste assez complet pour tromper un diff.
// =====================================================================
import { Game } from './js/game.js';
import { MODELS } from './js/data.js';
import { fmt } from './js/util.js';
import { makeBot } from './test-bot.mjs';

// ---- localStorage minimal (le jeu n'en demande pas plus) ----
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: k => void mem.delete(k),
};

const errors = [];
function check(nom, fn) {
  try { fn(); console.log('OK  ' + nom); }
  catch (e) { errors.push(`${nom} :: ${e.message}`); console.log('ERR ' + nom + ' :: ' + e.message + (process.env.TRACE ? '\n' + e.stack.split('\n').slice(1,9).join('\n') : '')); }
}

const stub = () => {
  const o = {
    toast(){}, log(){}, pingGenerate(){}, onPhaseChange(){},
    showEvent(ev){ ev.choices[0].apply(o.game); },
    showEnding(){ o.ended = true; }, modalOpen: false,
  };
  return o;
};

// ---------------------------------------------------------------------
//  Diff récursif. Renvoie la liste des chemins qui diffèrent.
//  Les nombres flottants sont comparés à une tolérance relative : le
//  round-trip JSON est exact, mais rejouer un tick ne l'est pas.
// ---------------------------------------------------------------------
function diff(a, b, chemin = '', out = [], tol = 0) {
  if (a === b) return out;
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb) { out.push(`${chemin} : ${ta} → ${tb}`); return out; }
  if (ta === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return out;
    const ecart = Math.abs(a - b) / Math.max(1e-12, Math.abs(a), Math.abs(b));
    if (ecart > tol) out.push(`${chemin} : ${fmt(a)} → ${fmt(b)}`);
    return out;
  }
  if (ta === 'array') {
    if (a.length !== b.length) { out.push(`${chemin} : ${a.length} entrée(s) → ${b.length}`); return out; }
    for (let i = 0; i < a.length; i++) diff(a[i], b[i], `${chemin}[${i}]`, out, tol);
    return out;
  }
  if (ta === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) { out.push(`${chemin}.${k} : absent avant, présent après`); continue; }
      if (!(k in b)) { out.push(`${chemin}.${k} : PERDU au chargement (valeur ${JSON.stringify(a[k])})`); continue; }
      diff(a[k], b[k], `${chemin}.${k}`, out, tol);
    }
    return out;
  }
  out.push(`${chemin} : ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
  return out;
}

// Ce que le chargement remet volontairement à zéro — et RIEN d'autre.
// Chaque entrée est une décision de conception, pas une tolérance : la
// grâce d'entrée de partie (aucun incident, aucune boîte de dialogue dans
// les premières secondes) et l'horodatage d'écriture.
const VOULU = new Set([
  '.crisis',          // aucun incident hérité : on ne saigne pas hors-ligne
  '.crisisTimer',     // au moins 60 s avant le prochain
  '.eventTimer',      // au moins 25 s avant la première boîte de dialogue
  '.headlineTimer',   // au moins 8 s avant la première Une
  '.savedAt', '.v',   // métadonnées d'écriture
  '.baseGridMW',      // marqueur de règle, réécrit par migrate()
]);
const filtre = liste => liste.filter(d => {
  const chemin = d.split(' :')[0].split('[')[0];
  return !VOULU.has(chemin);
});

// ---------------------------------------------------------------------
//  Une partie jouée par le bot, arrêtée aux instants demandés.
// ---------------------------------------------------------------------
const DT = 0.25;
// ---- socle jsdom : l'écran réel, pour la partie vécue comme pour la relecture ----
const { JSDOM } = await import('jsdom');
const { readFileSync } = await import('fs');
const html = readFileSync('./index.html', 'utf8');

function poserDom() {
  const dom = new JSDOM(html, { url: 'https://example.org/', pretendToBeVisual: true });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.HTMLElement = w.HTMLElement;
  globalThis.Node = w.Node;
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  // surtout PAS w.performance : jsdom l'implémente en appelant le
  // `performance` GLOBAL, donc se l'attribuer à lui-même boucle à l'infini.
  globalThis.performance = { now: () => Date.now() };
  globalThis.getComputedStyle = w.getComputedStyle.bind(w);
  globalThis.innerWidth = w.innerWidth; globalThis.innerHeight = w.innerHeight;
  w.__speed = 1;
  return dom;
}

// Ce que l'écran RACONTE : le décor de phase, les panneaux réellement
// visibles, les compteurs de l'en-tête, et le CONTENU de chaque panneau —
// c'est là que se cachent les vraies pertes.
// Le texte que le joueur VOIT. textContent ramasse aussi les lignes masquées,
// qui gardent l'affichage qu'elles avaient la dernière fois qu'on les a
// écrites : les comparer, c'est comparer des restes invisibles.
function texteVisible(el) {
  if (el.nodeType === 3) return el.textContent;
  if (el.nodeType !== 1) return '';
  if (el.classList && el.classList.contains('hidden')) return '';
  let out = '';
  for (const n of el.childNodes) out += texteVisible(n);
  return out.replace(/\s+/g, ' ').trim();
}

function lireEcran(doc) {
  const cache = el => { for (let n = el; n; n = n.parentElement) if (n.classList && n.classList.contains('hidden')) return true; return false; };
  const txt = id => { const e = doc.getElementById(id); return e ? e.textContent.trim() : '(absent)'; };
  return {
    decor: doc.body.className,
    phase: txt('brand-phase'),
    panneaux: [...doc.querySelectorAll('.panel')].filter(p => !cache(p)).map(p => p.id).join(', '),
    entete: ['stat-tokens', 'stat-money', 'stat-compute', 'stat-energy', 'stat-matter']
      .map(id => id + '=' + txt(id)).join(' | '),
    matiereVisible: !cache(doc.getElementById('stat-matter-wrap')),
    barrePhase: txt('phase-bar-label') + ' / ' + txt('phase-bar-value'),
    contenu: Object.fromEntries([...doc.querySelectorAll('.panel')]
      .filter(p => !cache(p))
      .map(p => [p.id, texteVisible(p)])),
  };
}

const { UI } = await import('./js/ui.js');

const ARRETS = [
  { t: 30,   nom: 'les tout premiers gestes' },
  { t: 240,  nom: 'la startup équipée (embauches, parc, chantiers en cours)' },
  { t: 900,  nom: 'le passage à l’échelle (dette, bourse, automatisations)' },
  { t: 2400, nom: 'la fin de la phase 1 (programmes, directives)' },
  { t: 3400, nom: 'l’autonomie (phase 2 : matière, emprise, extraction)' },
  { t: 4900, nom: 'l’expansion cosmique (phase 3 : sondes, destinations)' },
];

poserDom();
const uiVecu = new UI();
const jeu = new Game(uiVecu);
uiVecu.init(jeu);
// on joue, on ne clique pas dans les boîtes de dialogue : premier choix, comme le bot
uiVecu.showEvent = ev => ev.choices[0].apply(jeu);
uiVecu.showEnding = () => { uiVecu._fini = true; };
const bot = makeBot(jeu);

let t = 0;
const restant = [...ARRETS];
const vus = [];

while (restant.length && t < 6000 && !uiVecu._fini) {
  jeu.tick(DT);
  if (Math.floor(t) % 2 === 0) bot();
  t += DT;
  // l'écran est rendu tout au long de la partie, comme chez un joueur : c'est
  // ce qui fait de lui une RÉFÉRENCE. Un écran qui saute d'un état à l'autre
  // garde des restes du précédent et ne prouve rien.
  if (Math.round(t / DT) % 4 === 0) uiVecu.render(true);
  if (t >= restant[0].t) {
    const arret = restant.shift();
    uiVecu.render(true);
    vus.push({ ...arret, t, phase: jeu.phase,
               snapshot: JSON.parse(JSON.stringify(jeu.state)),
               ecran: lireEcran(document) });
  }
}

console.log(`Partie jouée jusqu’à t=${(t / 60).toFixed(1)} min — ${vus.length} instant(s) capturé(s)\n`);

// ---------------------------------------------------------------------
//  1) L'aller-retour ne perd rien
// ---------------------------------------------------------------------
for (const arret of vus) {
  const etiquette = `t=${Math.round(arret.t)}s ph${arret.phase} — ${arret.nom}`;
  check(`restauration complète : ${etiquette}`, () => {
    // on remet le jeu dans l'état capturé, puis on sauvegarde
    jeu.state = JSON.parse(JSON.stringify(arret.snapshot));
    if (!jeu.save()) throw new Error('save() a échoué');
    const ui2 = stub();
    const jeu2 = new Game(ui2);
    ui2.game = jeu2;
    if (!jeu2.load()) throw new Error('load() a échoué');
    const ecarts = filtre(diff(arret.snapshot, jeu2.state));
    if (ecarts.length)
      throw new Error(`${ecarts.length} écart(s) — ${ecarts.slice(0, 6).join(' | ')}`);
  });
}

// ---------------------------------------------------------------------
//  2) Recharger ne change RIEN au déroulement.
//     On compare deux parties issues du même disque : l'une chargée, l'autre
//     chargée puis re-sauvegardée et rechargée. Elles doivent tourner à
//     l'identique, au bit près. Le hasard est semé pour que la comparaison
//     ait un sens — sans cela on mesurerait deux tirages de dés, pas la
//     complétude de l'état. Et la même graine des deux côtés fait qu'un
//     écart ne peut plus venir que d'un champ manquant.
// ---------------------------------------------------------------------
const vraiRandom = Math.random;
function semer(graine) {                     // mulberry32 : court, reproductible
  let a = graine >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rejouerDepuisDisque = (graine, ticks = 40) => {
  const u = stub();
  const g = new Game(u);
  u.game = g;
  if (!g.load()) throw new Error('load() a échoué');
  semer(graine);
  for (let i = 0; i < ticks; i++) g.tick(DT);
  return g;
};

for (const arret of vus) {
  const etiquette = `t=${Math.round(arret.t)}s ph${arret.phase} — ${arret.nom}`;
  check(`recharger ne change rien au déroulement : ${etiquette}`, () => {
    jeu.state = JSON.parse(JSON.stringify(arret.snapshot));
    if (!jeu.save()) throw new Error('save() a échoué');

    // A : chargé depuis le disque
    const a = rejouerDepuisDisque(12345);
    // B : chargé, re-sauvegardé, rechargé — l'aller-retour doit être idempotent
    const inter = stub();
    const gi = new Game(inter);
    inter.game = gi;
    gi.load();
    gi.save();
    const b = rejouerDepuisDisque(12345);
    Math.random = vraiRandom;

    // l'horodatage d'une ligne de journal est l'heure de la pendule : deux
    // rejeux ne tombent pas à la milliseconde près, et c'est sans conséquence
    const ecarts = filtre(diff(a.state, b.state)).filter(d => !/^\.log\[\d+\]\.at /.test(d));
    if (ecarts.length)
      throw new Error(`${ecarts.length} écart(s) après un aller-retour de plus — ${ecarts.slice(0, 5).join(' | ')}`);
  });
}
Math.random = vraiRandom;

// ---------------------------------------------------------------------
//  3) Pièges du round-trip JSON : Infinity, NaN et undefined ne
//     survivent pas à JSON.stringify. Ils deviennent null ou
//     disparaissent, et sanitize() les remplace alors par le défaut —
//     silencieusement. Si le jeu en produit un jour, il faut le savoir.
// ---------------------------------------------------------------------
check('aucune valeur que JSON ne sait pas écrire dans l’état', () => {
  const coupables = [];
  const scan = (o, chemin) => {
    for (const k of Object.keys(o)) {
      const v = o[k], p = `${chemin}.${k}`;
      if (typeof v === 'number' && !isFinite(v)) coupables.push(`${p} = ${v}`);
      else if (typeof v === 'undefined') coupables.push(`${p} = undefined`);
      else if (typeof v === 'function') coupables.push(`${p} = fonction`);
      else if (v instanceof Map || v instanceof Set) coupables.push(`${p} = ${v.constructor.name}`);
      else if (v && typeof v === 'object') scan(v, p);
    }
  };
  for (const arret of vus) scan(arret.snapshot, `[t=${Math.round(arret.t)}s]`);
  if (coupables.length)
    throw new Error(`${coupables.length} valeur(s) perdue(s) à l’écriture — ${coupables.slice(0, 5).join(' | ')}`);
});

// ---------------------------------------------------------------------
//  4) Tout l'état du jeu vit dans `state`. Un champ posé sur l'instance
//     ne serait jamais écrit : c'est la fuite la plus facile à commettre.
// ---------------------------------------------------------------------
check('rien d’important ne vit en dehors de state', () => {
  const permis = new Set(['ui', 'state', 'speed', '_offline']);
  const trouves = Object.keys(jeu).filter(k => !permis.has(k));
  if (trouves.length)
    throw new Error(`champ(s) hors de state, donc jamais sauvegardé(s) : ${trouves.join(', ')}`);
});

// ---------------------------------------------------------------------
//  5) Une sauvegarde d'une phase avancée doit rouvrir dans la BONNE
//     phase, avec le bon modèle et le bon décor — pas en Startup.
// ---------------------------------------------------------------------
for (const arret of vus.filter(v => v.phase >= 2)) {
  check(`la phase est retrouvée : t=${Math.round(arret.t)}s ph${arret.phase}`, () => {
    jeu.state = JSON.parse(JSON.stringify(arret.snapshot));
    jeu.save();
    const u = stub();
    const g = new Game(u);
    u.game = g;
    g.load();
    if (g.phase !== arret.phase) throw new Error(`rouvre en phase ${g.phase} au lieu de ${arret.phase}`);
    if (g.state.modelTier !== arret.snapshot.modelTier)
      throw new Error(`modèle ${MODELS[g.state.modelTier].name} au lieu de ${MODELS[arret.snapshot.modelTier].name}`);
  });
}

// =====================================================================
//  6) L'INTERFACE APRÈS UN RECHARGEMENT
//
//  Le moteur peut restaurer parfaitement son état et l'écran mentir quand
//  même : les panneaux, le décor de phase et les sections débloquées sont
//  posés par des ÉVÉNEMENTS (onPhaseChange, onCrisis…) qui, eux, ne se
//  rejouent pas. On compare donc deux écrans au même instant de la partie :
//    · l'un qui a VÉCU la partie, transitions comprises ;
//    · l'autre qui vient de rouvrir la sauvegarde.
//  Tout ce qui diffère est quelque chose que rouvrir une partie ne rend pas.
// =====================================================================
// ---- côté B : un écran qui rouvre la sauvegarde ----
for (let i = 0; i < vus.length; i++) {
  const arret = vus[i];
  check(`l’écran rouvert est celui de la partie : t=${Math.round(arret.t)}s ph${arret.phase}`, () => {
    // écrire la sauvegarde avec un moteur nu, puis rouvrir comme le fait main.js
    const uTmp = stub();
    const gTmp = new Game(uTmp);
    uTmp.game = gTmp;
    gTmp.state = JSON.parse(JSON.stringify(arret.snapshot));
    gTmp.save();

    poserDom();
    const uiB = new UI();
    const gB = new Game(uiB);
    if (!gB.load()) throw new Error('load() a échoué');
    uiB.init(gB);
    const b = lireEcran(document);
    const a = arret.ecran;

    const ecarts = [];
    for (const k of Object.keys(a)) {
      // les compteurs bougent d'un tick à l'autre : on ne compare que
      // leur PRÉSENCE, pas leur valeur au chiffre près
      if (k === 'entete') {
        const absentsA = a[k].split(' | ').filter(x => x.includes('(absent)'));
        const absentsB = b[k].split(' | ').filter(x => x.includes('(absent)'));
        if (absentsA.join() !== absentsB.join()) ecarts.push(`entête : ${absentsA.join()} → ${absentsB.join()}`);
        continue;
      }
      if (k === 'contenu') {
        for (const id of Object.keys(a[k])) {
          if (b[k][id] === undefined) continue;              // panneau absent : déjà signalé
          if (a[k][id] !== b[k][id]) {
            const av = a[k][id], ap = b[k][id];
            let i = 0; while (i < av.length && av[i] === ap[i]) i++;
            ecarts.push(`${id} : …${av.slice(Math.max(0, i - 25), i + 45)}… → …${ap.slice(Math.max(0, i - 25), i + 45)}…`);
          }
        }
        continue;
      }
      if (String(a[k]) !== String(b[k])) ecarts.push(`${k} : « ${a[k]} » → « ${b[k]} »`);
    }
    if (ecarts.length) throw new Error(`${ecarts.length} écart(s) —\n      ${ecarts.join('\n      ')}`);
  });
}

console.log('\n=== ' + (errors.length ? errors.length + ' ERREUR(S) ===' : 'SAUVEGARDE OK — aucune erreur ==='));
errors.forEach(e => console.log(' - ' + e));
process.exit(errors.length ? 1 : 0);
