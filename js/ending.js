// =====================================================================
//  TokenWar — CINÉMATIQUE DE FIN
//  1) Capture de l'écran de jeu en repeignant le DOM réel sur un canvas
//     (positions, couleurs, polices et VRAI texte).
//  2) Destruction par groupes de pixels (cellules projetées, rotation, gravité).
//  3) Champ d'étoiles piloté par un scénario de vol : croisière, accélération,
//     hyperespace, roulis pur (rotation du champ de vision), virage, marche arrière.
//  4) Scroller sinusoïdal multicolore façon démo 64k + musique 8-bit (WebAudio).
//  La cinématique tourne jusqu'à finish() (bouton Passer/Continuer).
// =====================================================================

const TEXT = 'Thanks for playing and dont forget to enjoy life away from your keyboard !      ';

export class Cinematic {
  constructor(canvas, { onTextPhase, onFade } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onTextPhase = onTextPhase || (() => {});
    this.onFade = onFade || (() => {});
    this.raf = 0;
    this.done = false;
    this.audio = null;
    this.audioTimer = 0;
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Capture l'écran de jeu. À appeler AVANT d'afficher l'overlay de cinématique,
  // sinon on photographierait l'overlay noir à la place du jeu.
  capture() {
    try { this.snap = this.paintDOM(); } catch (e) { this.snap = null; }
    return this.snap;
  }

  start(onDone) {
    this.onDone = onDone;
    const c = this.canvas;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const snap = this.snap || this.capture();
    this.startMusic();
    this.t0 = performance.now();
    this.buildStars();
    if (snap) { this.phase = 'dissolve'; this.buildCells(snap); }
    else { this.phase = 'stars'; this._starT0 = 0; }   // capture impossible : on saute au vol
    if (this.reduced) { this.phase = 'text'; this._starT0 = 0; this.onTextPhase(); }
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
    this.onFade();
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

  // ---------- 1. capture d'écran : peintre DOM fidèle ----------
  // On repeint l'interface RÉELLE sur un canvas : mêmes positions, mêmes couleurs,
  // mêmes polices et surtout le VRAI texte (compteurs, journal, titres…), pour que
  // l'image désintégrée soit bien l'état du jeu au moment de la fin.
  // (L'ancienne capture SVG/foreignObject sérialisait tout le body — overlay de
  // cinématique compris — et rendait une image noire ou vide selon le navigateur.)
  SKIP = /\b(cine|ending-screen|modal-overlay|toast-container|hidden)\b/;

  paintDOM() {
    const w = window.innerWidth, h = window.innerHeight;
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const ctx = off.getContext('2d');
    const bodySt = getComputedStyle(document.body);
    ctx.fillStyle = bodySt.backgroundColor && bodySt.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ? bodySt.backgroundColor : '#0a0e14';
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'middle';

    const radiusOf = st => {
      const v = parseFloat(st.borderTopLeftRadius) || 0;
      return Math.min(v, 24);
    };
    const box = (x, y, bw, bh, rad) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, rad);
      else ctx.rect(x, y, bw, bh);
    };
    // approxime un dégradé CSS par un dégradé diagonal entre ses couleurs
    const gradientFrom = (img, x, y, bw, bh) => {
      const cols = img.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
      if (!cols || cols.length < 2) return null;
      const g = ctx.createLinearGradient(x, y, x + bw, y + bh);
      const uniq = cols.filter(c => !/rgba\([^)]*,\s*0\s*\)/i.test(c));
      if (uniq.length < 2) return null;
      uniq.slice(0, 4).forEach((c, i, a) => { try { g.addColorStop(i / (a.length - 1), c); } catch (e) {} });
      return g;
    };

    const drawText = (node, st) => {
      const txt = node.textContent.replace(/\s+/g, ' ').trim();
      if (!txt) return;
      let rects;
      try {
        const range = document.createRange();
        range.selectNodeContents(node);
        rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < h);
      } catch (e) { return; }
      if (!rects.length) return;
      ctx.fillStyle = st.color || '#dbe4f0';
      ctx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      if (rects.length === 1) {
        ctx.fillText(txt, rects[0].left, rects[0].top + rects[0].height / 2);
        return;
      }
      // texte sur plusieurs lignes : découpage glouton, une ligne par rect
      const words = txt.split(' ');
      let wi = 0;
      for (const r of rects) {
        let line = '';
        while (wi < words.length) {
          const test = line ? line + ' ' + words[wi] : words[wi];
          if (line && ctx.measureText(test).width > r.width) break;
          line = test; wi++;
        }
        if (line) ctx.fillText(line, r.left, r.top + r.height / 2);
        if (wi >= words.length) break;
      }
    };

    const walk = el => {
      if (el.nodeType !== 1) return;
      const cls = typeof el.className === 'string' ? el.className : '';
      if (this.SKIP.test(cls) || el.id === 'cine' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < h && r.right > 0 && r.left < w) {
        const rad = radiusOf(st);
        // fond (couleur ou dégradé)
        const bg = st.backgroundColor;
        const bgImg = st.backgroundImage;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
          ctx.fillStyle = bg; box(r.left, r.top, r.width, r.height, rad); ctx.fill();
        }
        if (bgImg && bgImg !== 'none' && /gradient/i.test(bgImg)) {
          const g = gradientFrom(bgImg, r.left, r.top, r.width, r.height);
          if (g) { ctx.fillStyle = g; box(r.left, r.top, r.width, r.height, rad); ctx.fill(); }
        }
        // bordure
        const bwid = parseFloat(st.borderTopWidth) || 0;
        if (bwid > 0 && st.borderTopColor && st.borderTopColor !== 'rgba(0, 0, 0, 0)') {
          ctx.strokeStyle = st.borderTopColor;
          ctx.lineWidth = Math.min(bwid, 3);
          box(r.left + bwid / 2, r.top + bwid / 2, Math.max(0, r.width - bwid), Math.max(0, r.height - bwid), rad);
          ctx.stroke();
        }
        // vrai texte des nœuds directs
        for (const node of el.childNodes) if (node.nodeType === 3) drawText(node, st);
      }
      for (const child of el.children) walk(child);
    };
    walk(document.body);
    return off;
  }

  // ---------- 2. destruction par groupes de pixels ----------
  buildCells(snap) {
    this.snap = snap;
    const cs = this.cellSize = Math.max(10, Math.round(window.innerWidth / 90));
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
    const TAU = Math.PI * 2;
    this.stars = [];
    for (let i = 0; i < 460; i++) {
      this.stars.push({
        ang: Math.random() * TAU,
        r: 6 + Math.random() * Math.hypot(window.innerWidth, window.innerHeight) * 0.5,
        sp: 0.45 + Math.random() * 1.15,             // dispersion des vitesses (profondeur)
        hue: 180 + Math.random() * 180,
        sz: 0.6 + Math.random() * 1.8,
        trail: [],                                   // positions successives (traînée réelle)
      });
    }
    // SCÉNARIO DE VOL — on alterne les configurations pour varier les sensations :
    //   fwd  : vitesse d'avance (radiale). >0 on avance, <0 on recule, 0 on flotte.
    //   spin : rotation UNIFORME du champ de vision (rad/s) — pas un tourbillon.
    //   trail: longueur de la traînée ; fade : rémanence du fond (plus bas = traînées longues).
    //   vp   : décalage du point de fuite (impression de virage / dérive).
    this.flight = [
      { id:'cruise',  dur:4.0, fwd:70,   spin:0,     trail:5,  fade:0.30, vp:[0, 0] },
      { id:'boost',   dur:4.5, fwd:520,  spin:0,     trail:20, fade:0.17, vp:[0, 0] },
      { id:'roll',    dur:4.5, fwd:0,    spin:0.70,  trail:9,  fade:0.26, vp:[0, 0] },
      { id:'bank',    dur:4.0, fwd:170,  spin:0.42,  trail:12, fade:0.22, vp:[0.26, -0.12] },
      { id:'hyper',   dur:5.5, fwd:1250, spin:0,     trail:34, fade:0.11, vp:[0, 0] },
      { id:'brake',   dur:3.5, fwd:35,   spin:-0.18, trail:4,  fade:0.34, vp:[0, 0] },
      { id:'reverse', dur:4.0, fwd:-200, spin:0,     trail:10, fade:0.24, vp:[0, 0] },
      { id:'yaw',     dur:4.0, fwd:95,   spin:0,     trail:8,  fade:0.26, vp:[-0.30, 0.14] },
      { id:'tumble',  dur:3.5, fwd:0,    spin:-1.05, trail:11, fade:0.24, vp:[0, 0] },
    ];
    this.flightDur = this.flight.reduce((a, m) => a + m.dur, 0);
  }

  // paramètres de vol à l'instant t, avec fondu enchaîné entre deux configurations
  flightAt(t) {
    const seq = this.flight;
    let x = ((t % this.flightDur) + this.flightDur) % this.flightDur, i = 0;
    while (x > seq[i].dur) { x -= seq[i].dur; i = (i + 1) % seq.length; }
    const cur = seq[i], next = seq[(i + 1) % seq.length];
    const BLEND = 1.3;
    const k = x > cur.dur - BLEND ? (x - (cur.dur - BLEND)) / BLEND : 0;
    const e = k * k * (3 - 2 * k);                   // smoothstep : pas de à-coup
    const mix = (a, b) => a + (b - a) * e;
    return {
      mode: cur.id,
      fwd: mix(cur.fwd, next.fwd),
      spin: mix(cur.spin, next.spin),
      trail: Math.max(2, Math.round(mix(cur.trail, next.trail))),
      fade: mix(cur.fade, next.fade),
      vx: mix(cur.vp[0], next.vp[0]),
      vy: mix(cur.vp[1], next.vp[1]),
    };
  }
  // Champ d'étoiles piloté par le scénario de vol. Chaque étoile mémorise ses
  // positions successives : la traînée suit donc EXACTEMENT sa trajectoire —
  //   • avance pure (spin = 0) → segments radiaux : on fonce tout droit ;
  //   • rotation pure (fwd = 0, ω uniforme) → arcs concentriques : le champ de
  //     vision pivote sans qu'on avance.
  drawStars(t, dt) {
    const { ctx, canvas } = this;
    const TAU = Math.PI * 2;
    const f = this.flightAt(t);
    // point de fuite (décalé pendant les virages) : c'est vers lui qu'on « vole »
    const cx = canvas.width / 2 + f.vx * canvas.width * 0.5;
    const cy = canvas.height / 2 + f.vy * canvas.height * 0.5;
    const maxR = Math.hypot(canvas.width, canvas.height) * 0.62;
    const speedN = Math.min(1, Math.abs(f.fwd) / 1250);   // 0 = à l'arrêt, 1 = hyperespace

    ctx.fillStyle = `rgba(0,0,0,${f.fade})`;              // rémanence (traînées plus ou moins longues)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    for (const s of this.stars) {
      // AVANCE : strictement radiale, avec parallaxe (plus l'étoile est « proche »,
      // plus elle défile vite) → sensation de translation vers l'avant.
      if (f.fwd !== 0) s.r += s.sp * f.fwd * dt * (0.30 + (s.r / maxR) * 1.5);
      // ROTATION : même vitesse angulaire pour toutes = rotation rigide de l'image
      // (une caméra qui roule), et non un tourbillon.
      if (f.spin !== 0) s.ang += f.spin * dt;

      if (s.r > maxR) {                                   // sortie d'écran → on renaît au centre
        s.r = 4 + Math.random() * 26; s.ang = Math.random() * TAU; s.trail.length = 0;
      } else if (s.r < 3) {                               // marche arrière → on renaît au bord
        s.r = maxR * (0.75 + Math.random() * 0.2); s.ang = Math.random() * TAU; s.trail.length = 0;
      }

      s.trail.push(cx + Math.cos(s.ang) * s.r, cy + Math.sin(s.ang) * s.r);
      while (s.trail.length > f.trail * 2) s.trail.splice(0, 2);
      if (s.trail.length < 4) continue;

      // couleur : bleu/blanc au décollage hyperespace, teintes plus chaudes au repos
      const light = 55 + Math.min(28, (s.r / maxR) * 34) + speedN * 15;
      const sat = 92 - speedN * 34;
      ctx.strokeStyle = `hsla(${(s.hue + t * 22) % 360},${sat}%,${light}%,0.92)`;
      ctx.lineWidth = s.sz * (0.5 + (s.r / maxR) * 1.7) * (0.75 + speedN * 0.8);
      ctx.beginPath();
      ctx.moveTo(s.trail[0], s.trail[1]);
      for (let i = 2; i < s.trail.length; i += 2) ctx.lineTo(s.trail[i], s.trail[i + 1]);
      ctx.stroke();
      // pointe lumineuse en tête de traînée
      const hx = s.trail[s.trail.length - 2], hy = s.trail[s.trail.length - 1];
      ctx.globalAlpha = 0.55 + speedN * 0.4;
      ctx.fillStyle = '#fff';
      const hs = 1.2 + speedN * 1.3;
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      ctx.globalAlpha = 1;
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
      // ~9 s de vol seul : le temps de sentir croisière → accélération → roulis
      if (t - this._starT0 > 9) { this.phase = 'text'; this.onTextPhase(); }
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
