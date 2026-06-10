// =====================================================================
//  TokenWar — UTILITAIRES
// =====================================================================

const SUFFIXES = ['', ' K', ' M', ' Md', ' B', // milliers, millions, milliards, billions
  ' Bd', ' Tr', ' Trd', ' Qa', ' Qad', ' Qi', ' Qid', ' Sx', ' Sxd', ' Sp', ' Spd', ' Oc'];

// Formate un grand nombre : 1234 -> "1,23 K", 1e60 -> "1,00e60"
export function fmt(n, decimals = 2) {
  if (n === Infinity) return '∞';
  if (n === null || n === undefined || isNaN(n)) return '0';
  const neg = n < 0;
  n = Math.abs(n);
  if (n < 1000) {
    const r = (n < 10 && n % 1 !== 0) ? n.toFixed(1) : Math.round(n).toString();
    return (neg ? '-' : '') + r;
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    const scaled = n / Math.pow(10, tier * 3);
    return (neg ? '-' : '') + scaled.toFixed(decimals).replace('.', ',') + SUFFIXES[tier];
  }
  // au-delà : notation scientifique
  const exp = Math.floor(Math.log10(n));
  const mant = n / Math.pow(10, exp);
  return (neg ? '-' : '') + mant.toFixed(2).replace('.', ',') + 'e' + exp;
}

// Argent : $ + format
export function fmtMoney(n) {
  return '$' + fmt(n);
}

// Masse en kg (avec passage aux masses terrestres / solaires pour l'échelle cosmique)
export function fmtMass(kg) {
  if (kg < 1e24) return fmt(kg) + ' kg';
  const earth = kg / 5.97e24;
  if (earth < 1e3) return earth.toFixed(2).replace('.', ',') + ' ⊕'; // masses terrestres
  const solar = kg / 1.989e30;
  return fmt(solar) + ' ☉'; // masses solaires
}

// Prix $/Mtok lisible
export function fmtPrice(perMtok) {
  if (perMtok >= 1) return '$' + perMtok.toFixed(2).replace('.', ',');
  return '$' + perMtok.toFixed(3).replace('.', ',');
}

// Pourcentage clampé 0..100
export function pct(x) {
  return Math.max(0, Math.min(100, x * 100));
}

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
