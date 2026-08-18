// =====================================================================
//  TokenWar — UTILITAIRES
//  Le formatage suit la langue choisie : séparateur décimal, groupement des
//  milliers, et surtout l'ÉCHELLE des grands nombres — échelle longue en
//  français/allemand (Md, B…), courte en anglais (B = 10⁹), et groupement
//  par 10⁴ en chinois/japonais/coréen (万/億/兆).
// =====================================================================
import { decimalSep, scale, intlLocale } from './i18n.js';

const dec = s => s.replace('.', decimalSep());

// Formate un grand nombre : 1234 -> "1,23 K" (fr) / "1.23K" (en) / "1234" (zh, <万)
export function fmt(n, decimals = 2) {
  if (n === Infinity) return '∞';
  if (n === null || n === undefined || isNaN(n)) return '0';
  const neg = n < 0;
  n = Math.abs(n);
  const sc = scale();
  const step = Math.pow(10, sc.base);
  if (n < step) {
    const r = (n < 10 && n % 1 !== 0) ? dec(n.toFixed(1)) : Math.round(n).toString();
    return (neg ? '-' : '') + r;
  }
  const tier = Math.floor(Math.log10(n) / sc.base);
  if (tier < sc.s.length) {
    const scaled = n / Math.pow(10, tier * sc.base);
    return (neg ? '-' : '') + dec(scaled.toFixed(decimals)) + sc.s[tier];
  }
  // au-delà de la table : notation scientifique
  const exp = Math.floor(Math.log10(n));
  const mant = n / Math.pow(10, exp);
  return (neg ? '-' : '') + dec(mant.toFixed(2)) + 'e' + exp;
}

// Argent. Le jeu est libellé en dollars dans toutes les langues (c'est la
// monnaie de l'industrie qu'il simule).
export function fmtMoney(n) {
  return '$' + fmt(n);
}

// Masse en kg (avec passage aux masses terrestres / solaires pour l'échelle cosmique)
export function fmtMass(kg) {
  if (kg < 1e24) return fmt(kg) + ' kg';
  const earth = kg / 5.97e24;
  if (earth < 1e3) return dec(earth.toFixed(2)) + ' ⊕'; // masses terrestres
  const solar = kg / 1.989e30;
  return fmt(solar) + ' ☉'; // masses solaires
}

// Prix $/Mtok lisible
export function fmtPrice(perMtok) {
  if (perMtok >= 1) return '$' + dec(perMtok.toFixed(2));
  return '$' + dec(perMtok.toFixed(3));
}

// Pourcentage clampé 0..100
export function pct(x) {
  return Math.max(0, Math.min(100, x * 100));
}

// Puissance : kW quand faible, puis MW / GW / TW (symboles universels)
export function fmtPower(mw) {
  if (mw == null || isNaN(mw)) return '0 kW';
  if (mw < 1) {
    const kw = mw * 1000;
    return dec(kw < 10 ? kw.toFixed(2) : kw.toFixed(0)) + ' kW';
  }
  if (mw < 1000) return dec(mw < 10 ? mw.toFixed(1) : mw.toFixed(0)) + ' MW';
  if (mw < 1e6) return dec((mw / 1e3).toFixed(1)) + ' GW';
  if (mw < 1e9) return dec((mw / 1e6).toFixed(1)) + ' TW';
  return fmt(mw / 1e6) + ' TW';
}

// Nombre entier avec TOUS les chiffres (groupés selon la langue) tant qu'il
// reste raisonnable, sinon repli sur la notation abrégée.
export function fmtFull(n) {
  if (n == null || isNaN(n)) return '0';
  if (n < 1e15) return Math.floor(n).toLocaleString(intlLocale());
  return fmt(n);
}

// TOUS les chiffres, groupés selon la langue. Sert aux infobulles de l'en-tête :
// « 12,4 Md » se lit vite, mais on veut parfois voir le nombre exact. Au-delà de
// 1e21 JavaScript passe en notation exponentielle dans toLocaleString ; on
// reconstruit alors les chiffres à la main depuis la mantisse et l'exposant.
export function fmtDigits(n) {
  if (n == null || isNaN(n)) return '0';
  if (!isFinite(n)) return '∞';
  const neg = n < 0; n = Math.abs(n);
  let brut;
  if (n < 1e21) {
    brut = Math.floor(n).toString();
  } else {
    // 15 chiffres significatifs : au-delà, un double ne code plus que du bruit
    // binaire (1e60 sortirait « 999 999 …949 387 »). On complète par des zéros,
    // qui disent honnêtement « on ne sait pas au-delà ».
    const [mant, exp] = n.toExponential(14).split('e');
    const chiffres = mant.replace('.', '').replace(/^-/, '');
    const zeros = Number(exp) + 1 - chiffres.length;
    brut = zeros >= 0 ? chiffres + '0'.repeat(zeros) : chiffres.slice(0, Number(exp) + 1);
  }
  // groupement par milliers avec le séparateur de la langue
  const sep = decimalSep() === ',' ? '\u202f' : ',';
  const grouped = brut.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? '-' : '') + grouped;
}

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
