// =====================================================================
//  TokenWar — CINÉMATIQUE DE FIN
//  1) Capture de l'écran sur un canvas (SVG foreignObject, repli en
//     peinture par rectangles si le navigateur refuse).
//  2) Destruction par groupes de pixels (cellules projetées, rotation, gravité).
//  3) Champ d'étoiles spatial : rotation globale + accélération (warp).
//  4) Scroller sinusoïdal multicolore façon démo 64k + musique 8-bit (WebAudio).
//  La cinématique tourne jusqu'à finish() (bouton Passer/Continuer).
// =====================================================================

const TEXT = 'Thanks for playing and dont forget to enjoy life away from your keyboard !      ';

export class Cinematic {
  constructor(canvas, { onTextPhase } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onTextPhase = onTextPhase || (() => {});
    this.raf = 0;
    this.done = false;
    this.audio = null;
    this.audioTimer = 0;
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async start(onDone) {
    this.onDone = onDone;
    const c = this.canvas;
    c.width = innerWidth; c.height = innerHeight;
    let snap = null;
    try { snap = await this.snapshot(); } catch (e) { snap = null; }
    if (!snap) snap = this.rectPaint();
    this.startMusic();
    this.phase = 'dissolve';
    this.t0 = performance.now();
    this.buildCells(snap);
    this.buildStars();
    if (this.reduced) { this.phase = 'text'; this.onTextPhase(); }
    const loop = now => {
      if (this.done) return;
      this.frame((now - this.t0) / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // demande de sortie : fondu au noir (1,2 s) + fondu de la musique, puis fin réelle
  finish() {
    if (this.done || this.phase === 'fade') return;
    this.phase = 'fade';
    this.fadeStart = this._lt || 0;
    if (this.master && this.audio) {
      try { this.master.gain.linearRampToValueAtTime(0.0001, this.audio.currentTime + 1.1); } catch (e) {}
    }
  }
  hardFinish() {
    if (this.done) return;
    this.done = true;
    cancelAnimationFrame(this.raf);
    this.stopMusic();
    this.onDone && this.onDone();
  }

  // ---------- 1. capture d'écran ----------
  async snapshot() {
    const w = innerWidth, h = innerHeight;
    let css = '';
    try { css = await (await fetch('styles.css')).text(); } catch (e) {}
    const html = new XMLSerializer().serializeToString(document.body);
    const bg = getComputedStyle(document.body).backgroundColor || '#0a0e14';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<rect width="100%" height="100%" fill="${bg}"/>` +
      `<style>${css.replace(/</g, '\\3c ')}</style>` +
      `<foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = rej;
      img.src = url;
      setTimeout(rej, 2500);                       // certains navigateurs ne déclenchent jamais onerror
    });
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const octx = off.getContext('2d');
    octx.fillStyle = bg; octx.fillRect(0, 0, w, h);
    octx.drawImage(img, 0, 0, w, h);
    octx.getImageData(0, 0, 1, 1);                 // vérifie que le canvas n'est pas « tainted »
    return off;
  }
  // repli : impression de l'écran par rectangles colorés (robuste partout)
  rectPaint() {
    const w = innerWidth, h = innerHeight;
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const ctx = off.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#0a0e14';
    ctx.fillRect(0, 0, w, h);
    const els = document.querySelectorAll('.panel, .topbar, .stat, .btn, .item, .headline, .log-entry, .panel-title, .stat-value');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > h) continue;
      const st = getComputedStyle(el);
      let fill = st.backgroundColor;
      if (!fill || fill === 'rgba(0, 0, 0, 0)') fill = 'rgba(30,40,60,0.55)';
      ctx.fillStyle = fill;
      ctx.strokeStyle = st.borderColor && st.borderColor !== 'rgba(0, 0, 0, 0)' ? st.borderColor : 'rgba(60,80,110,0.6)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(r.left, r.top, r.width, r.height, 8) : ctx.rect(r.left, r.top, r.width, r.height);
      ctx.fill(); ctx.stroke();
      // lignes de « texte » suggérées
      ctx.fillStyle = st.color || '#93a1b8';
      const lines = Math.min(4, Math.floor(r.height / 18));
      for (let i = 0; i < lines; i++) {
        ctx.globalAlpha = 0.35;
        ctx.fillRect(r.left + 10, r.top + 8 + i * 16, Math.max(10, r.width * (0.3 + 0.4 * Math.random())), 3);
        ctx.globalAlpha = 1;
      }
    }
    return off;
  }

  // ---------- 2. destruction par groupes de pixels ----------
  buildCells(snap) {
    this.snap = snap;
    const cs = this.cellSize = Math.max(10, Math.round(innerWidth / 90));
    const cols = Math.ceil(snap.width / cs), rows = Math.ceil(snap.height / cs);
    const cx = snap.width / 2, cy = snap.height / 2;
    const maxD = Math.hypot(cx, cy);
    this.cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * cs, y = r * cs;
      const d = Math.hypot(x - cx, y - cy) / maxD;
      this.cells.push({
        sx: x, sy: y, x, y,
        vx: (x - cx) * (0.4 + Math.random() * 0.8) * 0.003,
        vy: (y - cy) * 0.002 - (1 + Math.random() * 2.2),
        rot: 0, vrot: (Math.random() - 0.5) * 7,
        delay: d * 1.6 + Math.random() * 0.7,       // le centre part en dernier… non : bords d'abord
        a: 1,
      });
    }
  }
  drawDissolve(t) {
    const { ctx, canvas, snap, cellSize: cs } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const cell of this.cells) {
      const lt = t - cell.delay;
      if (lt <= 0) {                                 // pas encore détachée : dessin en place
        ctx.drawImage(snap, cell.sx, cell.sy, cs, cs, cell.sx, cell.sy, cs, cs);
        alive++;
        continue;
      }
      if (cell.a <= 0.02) continue;
      cell.vy += 4.5 * 0.016;                        // gravité
      cell.x += cell.vx * 16 * 3; cell.y += cell.vy * 3;
      cell.rot += cell.vrot * 0.016;
      cell.a = Math.max(0, 1 - lt / 1.6);
      ctx.save();
      ctx.globalAlpha = cell.a;
      ctx.translate(cell.x + cs / 2, cell.y + cs / 2);
      ctx.rotate(cell.rot);
      ctx.drawImage(snap, cell.sx, cell.sy, cs, cs, -cs / 2, -cs / 2, cs, cs);
      ctx.restore();
      if (cell.a > 0.02) alive++;
    }
    return alive === 0;                              // écran (quasi) noir → phase suivante
  }

  // ---------- 3. champ d'étoiles (rotations + accélérations) ----------
  buildStars() {
    this.stars = [];
    for (let i = 0; i < 420; i++) {
      this.stars.push({
        ang: Math.random() * Math.PI * 2,
        r: 4 + Math.random() * Math.hypot(innerWidth, innerHeight) * 0.5,
        sp: 12 + Math.random() * 60,
        hue: 180 + Math.random() * 180,
        sz: 0.6 + Math.random() * 1.8,
      });
    }
  }
  drawStars(t, dt) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const maxR = Math.hypot(cx, cy) + 40;
    const accel = Math.min(9, 1 + t * 0.9);          // accélération progressive (warp)
    const spin = 0.12 + Math.min(1.1, t * 0.06);     // la galaxie se met à tourner
    ctx.fillStyle = 'rgba(0,0,0,0.32)';              // traînées
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of this.stars) {
      const px = cx + Math.cos(s.ang) * s.r, py = cy + Math.sin(s.ang) * s.r;
      s.r += s.sp * accel * dt;
      s.ang += spin * dt * (30 / (10 + s.r * 0.05)); // rotation plus vive au centre
      if (s.r > maxR) { s.r = 2 + Math.random() * 30; s.ang = Math.random() * Math.PI * 2; }
      const x = cx + Math.cos(s.ang) * s.r, y = cy + Math.sin(s.ang) * s.r;
      ctx.strokeStyle = `hsla(${(s.hue + t * 30) % 360},90%,${55 + Math.min(30, s.r * 0.04)}%,0.9)`;
      ctx.lineWidth = s.sz * Math.min(2.2, 0.5 + s.r / 300);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    }
  }

  // ---------- 4. scroller sinusoïdal multicolore ----------
  drawText(t) {
    const { ctx, canvas } = this;
    const size = Math.max(26, Math.min(54, canvas.width / 22));
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textBaseline = 'middle';
    const cw = size * 0.62;
    const total = TEXT.length * cw;
    const scroll = (t * 160) % (total + canvas.width);
    for (let i = 0; i < TEXT.length; i++) {
      const x = canvas.width - scroll + i * cw;
      if (x < -cw || x > canvas.width + cw) continue;
      const y = canvas.height / 2 + Math.sin(x * 0.012 + t * 2.2) * canvas.height * 0.16;
      const hue = (i * 14 + t * 120) % 360;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(x * 0.012 + t * 2.2) * 0.18);
      ctx.shadowColor = `hsl(${hue},100%,60%)`;
      ctx.shadowBlur = 14;
      ctx.fillStyle = `hsl(${hue},100%,65%)`;
      ctx.fillText(TEXT[i], 0, 0);
      ctx.restore();
    }
  }

  frame(t) {
    const dt = Math.min(0.05, t - (this._lt || 0)); this._lt = t;
    if (this.phase === 'dissolve') {
      if (this.drawDissolve(t) || t > 5.5) { this.phase = 'stars'; this._starT0 = t; }
    } else if (this.phase === 'stars') {
      this.drawStars(t - this._starT0, dt);
      if (t - this._starT0 > 5) { this.phase = 'text'; this.onTextPhase(); }
    } else if (this.phase === 'text') {
      this.drawStars(t - this._starT0, dt);          // les étoiles continuent derrière le texte
      this.drawText(t);
    } else if (this.phase === 'fade') {
      // fondu au noir avant l'écran final
      if (this._starT0 != null) { this.drawStars(t - this._starT0, dt); this.drawText(t); }
      const a = Math.min(1, (t - this.fadeStart) / 1.2);
      this.ctx.fillStyle = `rgba(0,0,0,${a})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      if (a >= 1) this.hardFinish();
    }
  }

  // ---------- musique 8-bit (WebAudio) ----------
  startMusic() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.audio = new AC();
      const master = this.master = ctx.createGain();
      master.gain.value = 0.11;
      master.connect(ctx.destination);
      // séquence : 4 accords (Am F C G), lead carré pentatonique + basse triangle + hats
      const N = { A2:110, C3:130.8, E3:164.8, F2:87.3, G2:98, A3:220, C4:261.6, D4:293.7, E4:329.6, G4:392, A4:440, C5:523.3, D5:587.3, E5:659.3, G5:784, A5:880 };
      const lead = ['A4','C5','E5','A5', 'G5','E5','C5','E5',  'A4','C5','F2','A5', 'G5','E5','D5','C5',
                    'E4','G4','C5','E5', 'D5','C5','G4','C5',  'D4','G4','D5','G5', 'E5','D5','C5','D5'];
      const bass = ['A2','A2','A2','A2', 'A2','A2','A2','A2',  'F2','F2','F2','F2', 'F2','F2','F2','F2',
                    'C3','C3','C3','C3', 'C3','C3','C3','C3',  'G2','G2','G2','G2', 'G2','G2','G2','G2'];
      const step = 60 / 152 / 2;                     // doubles-croches à 152 BPM
      const loopDur = lead.length * step;
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
      const note = (type, freq, t0, dur, vol) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + dur + 0.02);
      };
      const hat = (t0, vol) => {
        const src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = noiseBuf; g.gain.value = vol;
        src.connect(g); g.connect(master); src.start(t0);
      };
      const scheduleLoop = (t0) => {
        if (this.done) return;
        lead.forEach((n, i) => {
          note('square', N[n] || 440, t0 + i * step, step * 0.9, 0.16);
          if (i % 4 === 0) note('triangle', N[bass[i]] || 110, t0 + i * step, step * 3.6, 0.30);
          hat(t0 + i * step, i % 4 === 2 ? 0.10 : 0.035);
        });
        this.audioTimer = setTimeout(() => scheduleLoop(t0 + loopDur), (t0 + loopDur - ctx.currentTime - 0.25) * 1000);
      };
      scheduleLoop(ctx.currentTime + 0.08);
    } catch (e) { /* pas d'audio : la cinématique reste silencieuse */ }
  }
  stopMusic() {
    clearTimeout(this.audioTimer);
    if (this.audio) { try { this.audio.close(); } catch (e) {} this.audio = null; }
  }
}
