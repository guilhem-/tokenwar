// =====================================================================
//  TokenWar — ANIMATIONS D'INACTIVITÉ
//  Au bout de 15 s sans la moindre interaction, l'écran se manifeste :
//  une manifestation courte (< 5 s), jamais deux fois la même d'affilée,
//  tirée SANS REMISE (les 12 passent avant qu'une seule revienne).
//  Le canevas est en `pointer-events:none` : il n'intercepte jamais un clic.
// =====================================================================
import { IDLE_FX } from './data.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export class IdleFX {
  constructor(canvas, body) {
    this.c = canvas;
    this.body = body || (typeof document !== 'undefined' ? document.body : null);
    this.playing = null;
    this.bag = [];
    this.last = null;
    this.raf = null;
  }

  // tirage sans remise : on vide le sac avant de le remplir à nouveau. Au
  // remplissage, on s'assure que la première pioche du nouveau sac n'est pas
  // celle qui vient de sortir — sinon une animation passerait deux fois de suite.
  nextId() {
    if (!this.bag.length) {
      this.bag = IDLE_FX.map(f => f.id);
      for (let i = this.bag.length - 1; i > 0; i--) {   // mélange de Fisher-Yates
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.last) {
        [this.bag[this.bag.length - 1], this.bag[0]] = [this.bag[0], this.bag[this.bag.length - 1]];
      }
    }
    this.last = this.bag.pop();
    return this.last;
  }

  play(id) {
    if (this.playing) return false;
    const ctx = this.c && this.c.getContext && this.c.getContext('2d');
    if (!ctx) return false;
    const def = IDLE_FX.find(f => f.id === (id || this.nextId())) || IDLE_FX[0];
    this.last = def.id;                              // (nextId l'a déjà fait ; utile si `id` est imposé)
    const w = this.c.width = window.innerWidth;
    const h = this.c.height = window.innerHeight;
    this.c.classList.add('on');
    this.playing = { def, ctx, w, h, t: 0, seed: this.setup(def.id, w, h) };
    if (def.id === 'flash' && this.body) this.body.classList.add('fx-invert');
    this.raf = requestAnimationFrame(ts => this.loop(ts, ts));
    return def.id;
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.playing) {
      const { ctx, w, h } = this.playing;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    this.playing = null;
    this.c && this.c.classList.remove('on');
    this.body && this.body.classList.remove('fx-invert');
  }

  loop(ts, prev) {
    if (!this.playing) return;
    const p = this.playing;
    p.t += Math.min(0.05, (ts - prev) / 1000);
    const k = p.t / p.def.dur;
    if (k >= 1) return this.stop();
    const { ctx, w, h } = p;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    // fondu d'entrée/sortie commun : rien n'apparaît ni ne disparaît brutalement
    const env = Math.min(1, k / 0.12) * Math.min(1, (1 - k) / 0.18);
    this.draw(p.def.id, ctx, w, h, p.t, k, env, p.seed);
    this.raf = requestAnimationFrame(next => this.loop(next, ts));
  }

  // ---- états initiaux (positions aléatoires figées pour la durée de l'effet) ----
  setup(id, w, h) {
    switch (id) {
      case 'matrix': case 'tokens': {
        const cols = Math.max(8, Math.floor(w / 22));
        return { cols, y: Array.from({ length: cols }, () => rnd(-h, 0)), v: Array.from({ length: cols }, () => rnd(180, 620)) };
      }
      case 'shapes':
        return { shapes: Array.from({ length: 7 }, () => ({
          x: rnd(0.1, 0.9) * w, y: rnd(0.15, 0.85) * h, r: rnd(40, Math.min(w, h) * 0.28),
          n: Math.floor(rnd(3, 8)), sp: rnd(-1.2, 1.2), ph: rnd(0, TAU) })) };
      case 'wave':
        return { pts: Array.from({ length: 220 }, () => ({ x: rnd(-0.2, 1.2) * w, y: rnd(0, h), r: rnd(1, 3.2), sp: rnd(0.6, 1.8) })) };
      case 'shock':
        return { cx: rnd(0.2, 0.8) * w, cy: rnd(0.2, 0.8) * h };
      case 'vectors':
        return { cx: rnd(0.35, 0.65) * w, cy: rnd(0.35, 0.65) * h,
          rays: Array.from({ length: 90 }, () => ({ a: rnd(0, TAU), r: rnd(0, 1), sp: rnd(0.5, 1.6) })) };
      case 'glitch':
        return { bands: Array.from({ length: 14 }, () => ({ y: rnd(0, h), hgt: rnd(6, 46), dx: rnd(-90, 90), ph: rnd(0, TAU) })) };
      default:
        return {};
    }
  }

  // ---- les douze manifestations ----
  draw(id, ctx, w, h, t, k, env, s) {
    switch (id) {

      // 1 — clignement : deux battements de paupière
      case 'blink': {
        const a = Math.max(0, Math.sin(k * Math.PI * 2.2)) * 0.92;
        ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      // 2 — moirés sombres : deux réseaux de lignes qui tournent l'un sur l'autre
      case 'moire': {
        ctx.globalAlpha = 0.5 * env;
        for (const [ang, step] of [[t * 0.22, 9], [-t * 0.16 + 0.6, 11]]) {
          ctx.save();
          ctx.translate(w / 2, h / 2); ctx.rotate(ang); ctx.translate(-w, -h);
          ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
          for (let x = 0; x < w * 2; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h * 2); ctx.stroke(); }
          ctx.restore();
        }
        break;
      }

      // 3 — pluie de glyphes façon terminal
      case 'matrix': {
        ctx.globalAlpha = env;
        ctx.font = '16px ui-monospace, monospace';
        const cw = w / s.cols;
        for (let i = 0; i < s.cols; i++) {
          s.y[i] += s.v[i] * 0.016;
          if (s.y[i] > h + 200) s.y[i] = rnd(-260, -20);
          for (let j = 0; j < 14; j++) {
            const y = s.y[i] - j * 17;
            if (y < -20 || y > h + 20) continue;
            const ch = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 90));
            ctx.fillStyle = j === 0 ? 'rgba(210,255,230,0.95)' : `rgba(46,230,214,${(0.65 - j * 0.045).toFixed(3)})`;
            ctx.fillText(ch, i * cw + 3, y);
          }
        }
        break;
      }

      // 4 — polygones filaires en rotation
      case 'shapes': {
        ctx.globalAlpha = 0.75 * env;
        ctx.lineWidth = 1.6;
        s.shapes.forEach((sh, i) => {
          ctx.strokeStyle = `hsla(${(i * 47 + t * 40) % 360},80%,65%,0.9)`;
          ctx.beginPath();
          for (let n = 0; n <= sh.n; n++) {
            const a = sh.ph + sh.sp * t + (n / sh.n) * TAU;
            const x = sh.x + Math.cos(a) * sh.r, y = sh.y + Math.sin(a) * sh.r * 0.9;
            n === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        break;
      }

      // 5 — balayage cathodique : lignes de trame + barre qui roule
      case 'scan': {
        ctx.globalAlpha = 0.28 * env;
        ctx.fillStyle = '#000';
        for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
        const by = ((t / 1.5) % 1) * (h + 200) - 100;   // la barre roule en 1,5 s
        const grd = ctx.createLinearGradient(0, by - 90, 0, by + 90);
        grd.addColorStop(0, 'rgba(255,255,255,0)');
        grd.addColorStop(0.5, `rgba(180,255,245,${0.16 * env})`);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = grd;
        ctx.fillRect(0, by - 90, w, 180);
        break;
      }

      // 6 — décrochage : bandes déplacées en séparation rouge/cyan
      case 'glitch': {
        ctx.globalCompositeOperation = 'screen';
        s.bands.forEach(b => {
          const d = b.dx * Math.sin(t * 18 + b.ph);
          ctx.globalAlpha = 0.5 * env;
          ctx.fillStyle = 'rgba(255,40,80,0.55)';
          ctx.fillRect(d, b.y, w, b.hgt);
          ctx.fillStyle = 'rgba(40,230,255,0.55)';
          ctx.fillRect(-d, b.y + 2, w, b.hgt);
        });
        break;
      }

      // 7 — vague de particules qui traverse l'écran
      case 'wave': {
        ctx.globalAlpha = env;
        s.pts.forEach(pt => {
          const x = (pt.x + t * 260 * pt.sp) % (w * 1.4) - w * 0.2;
          const y = pt.y + Math.sin((x / 90) + t * 2.2) * 26;
          ctx.fillStyle = `rgba(120,220,255,${(0.25 + pt.r / 6).toFixed(2)})`;
          ctx.beginPath(); ctx.arc(x, y, pt.r, 0, TAU); ctx.fill();
        });
        break;
      }

      // 8 — ondes de choc concentriques
      case 'shock': {
        ctx.globalAlpha = env;
        for (let i = 0; i < 3; i++) {
          const kk = k * 1.6 - i * 0.22;
          if (kk <= 0 || kk > 1) continue;
          const r = kk * Math.hypot(w, h) * 0.75;
          ctx.strokeStyle = `rgba(46,230,214,${(1 - kk).toFixed(3)})`;
          ctx.lineWidth = 3 + (1 - kk) * 8;
          ctx.beginPath(); ctx.arc(s.cx, s.cy, r, 0, TAU); ctx.stroke();
        }
        break;
      }

      // 9 — inversion brève (la classe CSS fait le travail, le canevas ajoute l'éclat)
      case 'flash': {
        const a = Math.max(0, Math.sin(k * Math.PI)) * 0.35;
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      // 10 — pluie de tokens (le jeu vous rappelle ce qu'il attend de vous)
      case 'tokens': {
        ctx.globalAlpha = env;
        ctx.font = '13px ui-monospace, monospace';
        const cw = w / s.cols;
        const words = ['tok', '0x1f', 'ctx', 'eos', 'bpe', '</s>', '▮', 'µ$'];
        for (let i = 0; i < s.cols; i++) {
          s.y[i] += s.v[i] * 0.014;
          if (s.y[i] > h + 120) s.y[i] = rnd(-200, -20);
          for (let j = 0; j < 8; j++) {
            const y = s.y[i] - j * 22;
            if (y < -20 || y > h + 20) continue;
            ctx.fillStyle = `rgba(255,196,86,${(0.7 - j * 0.08).toFixed(2)})`;
            ctx.fillText(words[(i + j) % words.length], i * cw + 4, y);
          }
        }
        break;
      }

      // 11 — tunnel vectoriel : traits fuyant du point de fuite
      case 'vectors': {
        ctx.globalAlpha = env;
        ctx.lineWidth = 1.4;
        const maxR = Math.hypot(w, h) * 0.6;
        s.rays.forEach(ry => {
          const r = ((ry.r + t * 0.42 * ry.sp) % 1);
          const r0 = r * r * maxR, r1 = Math.min(maxR, r0 * 1.22 + 8);
          ctx.strokeStyle = `rgba(160,190,255,${(r * 0.8).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(s.cx + Math.cos(ry.a) * r0, s.cy + Math.sin(ry.a) * r0);
          ctx.lineTo(s.cx + Math.cos(ry.a) * r1, s.cy + Math.sin(ry.a) * r1);
          ctx.stroke();
        });
        break;
      }

      // 12 — grille en perspective (nostalgie synthwave)
      case 'grid': {
        ctx.globalAlpha = 0.85 * env;
        ctx.strokeStyle = 'rgba(255,90,190,0.55)';
        ctx.lineWidth = 1.3;
        const hz = h * 0.55;
        for (let i = -14; i <= 14; i++) {                 // fuyantes
          ctx.beginPath(); ctx.moveTo(w / 2 + i * 26, hz); ctx.lineTo(w / 2 + i * w * 0.14, h); ctx.stroke();
        }
        for (let i = 0; i < 16; i++) {                    // horizontales qui défilent
          const f = ((i + (t * 0.55) % 1) / 16);
          const y = hz + Math.pow(f, 2.4) * (h - hz);
          ctx.globalAlpha = 0.85 * env * (1 - f * 0.4);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        break;
      }
    }
  }
}
