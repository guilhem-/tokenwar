// =====================================================================
//  TokenWar — INTERNATIONALISATION
//
//  Principe : la SOURCE est le français. Chaque chaîne française sert
//  elle-même de clé (façon gettext). Avantages :
//   · aucune clé à inventer ni à maintenir dans data.js ;
//   · repli sûr — une traduction manquante affiche le français d'origine
//     plutôt qu'une clé technique illisible ;
//   · les fichiers de langue se relisent comme un glossaire.
//
//  Sélection de la langue :
//   1. choix explicite du joueur (mémorisé) ;
//   2. sinon la langue du navigateur, si elle fait partie des langues
//      prises en charge ;
//   3. sinon l'anglais, et le sélecteur est mis en avant.
// =====================================================================

// Une langue n'est proposée QUE lorsque son fichier est complet : le test de
// couverture (test-i18n.mjs) échoue si une langue déclarée ici a la moindre
// chaîne non traduite. Pas de langue à moitié traduite en production.
export const LANGS = [
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'en', name: 'English',    flag: '🇬🇧' },
];
export const DEFAULT_LANG = 'en';          // langue par défaut hors des langues détectées
const STORE_KEY = 'tokenwar_lang';

// Locales de formatage (nombres, dates) associées à chaque langue
const INTL = { fr:'fr-FR', en:'en-US', zh:'zh-CN', ja:'ja-JP', ko:'ko-KR', de:'de-DE', es:'es-ES', pt:'pt-PT' };

// Noms de mois courts, par langue (le calendrier défile au jour près)
export const MONTHS = {
  fr: ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  zh: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  ja: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  ko: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  de: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
  es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  pt: ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],
};

let current = 'fr';
let dict = {};                 // chaîne française -> traduction
let detected = null;           // langue déduite du navigateur (null si non prise en charge)
const listeners = [];

export function supported(code) { return LANGS.some(l => l.code === code); }

// Langue du navigateur, réduite à sa base ('pt-BR' → 'pt', 'zh-Hant' → 'zh')
export function browserLang() {
  const nav = (typeof navigator !== 'undefined' && navigator) || {};
  const list = nav.languages && nav.languages.length ? nav.languages : [nav.language || ''];
  for (const raw of list) {
    const base = String(raw || '').toLowerCase().split('-')[0];
    if (supported(base)) return base;
  }
  return null;
}

export function stored() {
  try { const v = localStorage.getItem(STORE_KEY); return supported(v) ? v : null; } catch (e) { return null; }
}
export function lang() { return current; }
export function langMeta() { return LANGS.find(l => l.code === current) || LANGS[0]; }
// true quand la langue du navigateur n'est PAS prise en charge : on met alors
// le sélecteur en avant, l'anglais faisant office de langue par défaut.
export function needsPicker() { return detected === null && !stored(); }

// Choisit la langue au démarrage et charge son dictionnaire.
export async function init() {
  detected = browserLang();
  const chosen = stored() || detected || DEFAULT_LANG;
  await setLang(chosen, false);
  return current;
}

export async function setLang(code, persist = true) {
  if (!supported(code)) code = DEFAULT_LANG;
  current = code;
  dict = code === 'fr' ? {} : await load(code);   // le français est la source : pas de dictionnaire
  if (persist) { try { localStorage.setItem(STORE_KEY, code); } catch (e) {} }
  listeners.forEach(fn => { try { fn(code); } catch (e) {} });
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.lang = code;
  return code;
}

async function load(code) {
  try {
    const mod = await import(`./locales/${code}.js`);
    return mod.default || mod.strings || {};
  } catch (e) {
    return {};                                    // repli : on reste en français
  }
}

export function onChange(fn) { listeners.push(fn); }

// ---- traduction ----------------------------------------------------
// t('Texte français')  → texte traduit, ou le français si non traduit.
// Les substitutions se notent {0}, {1}… : t('Départ : {0}', nom)
export function t(fr, ...args) {
  let s = (dict && dict[fr] != null) ? dict[fr] : fr;
  if (args.length) s = s.replace(/\{(\d+)\}/g, (m, i) => (args[+i] != null ? args[+i] : m));
  return s;
}

// Traduit une chaîne de données (nom d'objet, description…) : même mécanisme,
// mais explicite à la lecture des appels côté rendu.
export const td = t;

// ---- formatage local ----------------------------------------------
export function intlLocale() { return INTL[current] || 'en-US'; }
export function months() { return MONTHS[current] || MONTHS.en; }
export function decimalSep() { return DECIMAL[current] || '.'; }
export function scale() { return SCALE[current] || SCALE.en; }

const DECIMAL = { fr:',', de:',', es:',', pt:',', en:'.', zh:'.', ja:'.', ko:'.' };

// Échelles des grands nombres. L'Europe latine et l'Allemagne comptent en
// échelle LONGUE (milliard, billion…), l'anglais en échelle COURTE (billion =
// 10⁹), et le chinois, le japonais et le coréen groupent par 10⁴ (万/億/兆).
// base = nombre de chiffres par palier.
const SCALE = {
  fr: { base:3, s:['', ' K', ' M', ' Md', ' B', ' Bd', ' Tr', ' Trd', ' Qa', ' Qad', ' Qi', ' Qid', ' Sx', ' Sxd', ' Sp', ' Spd', ' Oc'] },
  de: { base:3, s:['', ' Tsd', ' Mio', ' Mrd', ' Bio', ' Brd', ' Tri', ' Trd', ' Qua', ' Quad', ' Qui', ' Quid', ' Sex', ' Sexd', ' Sep', ' Sepd', ' Okt'] },
  es: { base:3, s:['', ' K', ' M', ' MM', ' B', ' MB', ' Tr', ' MTr', ' Cu', ' MCu', ' Qui', ' MQui', ' Sx', ' MSx', ' Sp', ' MSp', ' Oc'] },
  pt: { base:3, s:['', ' K', ' M', ' MM', ' B', ' MB', ' Tr', ' MTr', ' Qd', ' MQd', ' Qi', ' MQi', ' Sx', ' MSx', ' Sp', ' MSp', ' Oc'] },
  en: { base:3, s:['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc'] },
  zh: { base:4, s:['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载'] },
  ja: { base:4, s:['', '万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載'] },
  ko: { base:4, s:['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재'] },
};
