/* Group 4 — Line & Thread. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  // 4.1 String Art --------------------------------------------------------------
  const BOW = { p: 0.05, n: 0.6, b: 0.2, r: 0.12, q: 0.32, k: 0.4 };
  function threadArc(env, from, to, piece, side, scale = 1) {
    const { ctx, S, pal, gauss, cell } = env;
    const A = L.at(env, from), B = L.at(env, to);
    const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const w = W[piece], sign = side === 'w' ? 1 : -1;
    ctx.strokeStyle = L.rgba(env.color(side, piece), Math.min(1, pal.alpha * 1.3 * scale));
    ctx.lineWidth = S * 0.0011 * (1 + w * 0.18);
    ctx.lineCap = 'round';
    for (let s = 0; s < 2 + Math.round(w * 0.9); s++) {
      const bow = d * BOW[piece] * sign * (1 + gauss() * 0.15);
      const mx = (A[0] + B[0]) / 2 + nx * bow + gauss() * cell * 0.05, my = (A[1] + B[1]) / 2 + ny * bow + gauss() * cell * 0.05;
      const j = cell * 0.04;
      ctx.beginPath();
      ctx.moveTo(A[0] + gauss() * j, A[1] + gauss() * j);
      ctx.quadraticCurveTo(mx, my, B[0] + gauss() * j, B[1] + gauss() * j);
      ctx.stroke();
    }
  }
  reg({
    code: '4.1', id: 'string', name: 'String Art',
    blurb: 'Threads strung between the 64 pins of a loom. Every move is a bundle of curved threads: knights arc high, pawns pull straight, and each side curves its own way. Captures burst, checks ring the king, and the final position is stamped on top.',
    setup(env) {
      const { ctx, S, pal } = env;
      ctx.fillStyle = L.rgba(pal.fg, 0.25);
      for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
        const [x, y] = L.at(env, L.sqName(f, r));
        ctx.beginPath(); ctx.arc(x, y, S * 0.0022, 0, L.TAU); ctx.fill();
      }
    },
    ply(env, i) {
      const { ctx, S, pal, rng, game, cell, data } = env;
      const p = game.plies[i], side = p.color;
      threadArc(env, p.from, p.to, p.piece, side);
      if (p.castle) {
        const rank = side === 'w' ? '1' : '8';
        threadArc(env, (p.castle === 'k' ? 'h' : 'a') + rank, (p.castle === 'k' ? 'f' : 'd') + rank, 'r', side);
      }
      const [bx, by] = L.at(env, p.to);
      if (p.captured) {
        const v = W[p.captured], col = L.victimColor(env, p);
        ctx.strokeStyle = L.rgba(col, 0.6);
        ctx.lineWidth = S * 0.0009;
        for (let k = 0; k < 10 + v * 4; k++) {
          const a = rng() * L.TAU, r0 = cell * 0.08, r1 = cell * (0.18 + rng() * 0.45) * (0.7 + v * 0.1);
          ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0); ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1); ctx.stroke();
        }
        ctx.fillStyle = L.rgba(col, 0.75);
        ctx.beginPath(); ctx.arc(bx, by, cell * 0.06, 0, L.TAU); ctx.fill();
      }
      if (p.check) {
        const [kx, ky] = L.at(env, data[i].king[L.enemy(side)]);
        ctx.strokeStyle = L.rgba(pal.accent, 0.7);
        ctx.lineWidth = S * 0.0012;
        for (const r of [0.28, 0.38, 0.48]) { ctx.beginPath(); ctx.arc(kx, ky, cell * r, 0, L.TAU); ctx.stroke(); }
      }
      if (p.promotion) {
        ctx.fillStyle = L.rgba(env.color(side, p.promotion), 0.75);
        ctx.beginPath();
        for (let k = 0; k < 16; k++) { const r = k % 2 ? cell * 0.14 : cell * 0.4, a = (k / 16) * L.TAU - Math.PI / 2; ctx[k ? 'lineTo' : 'moveTo'](bx + Math.cos(a) * r, by + Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
      }
    },
    finish(env) {
      const { ctx, pal, game, cell, S } = env;
      ctx.globalCompositeOperation = 'source-over';
      L.finishHalo(env);
      for (const s of CM.art.finalPieces(game)) {
        const [x, y] = L.at(env, s.square);
        ctx.fillStyle = env.color(s.color, s.type);
        ctx.strokeStyle = pal.bg;
        ctx.lineWidth = S * 0.0015;
        ctx.beginPath(); ctx.arc(x, y, cell * (s.type === 'k' ? 0.1 : 0.065), 0, L.TAU); ctx.fill(); ctx.stroke();
      }
    },
  });

  // 4.2 Ridgeline -------------------------------------------------------------------
  reg({
    code: '4.2', id: 'ridgeline', name: 'Ridgeline',
    blurb: 'One ridge line per move, from the first move at the top to the last at the bottom, like a pulsar plot. Peaks rise over the files where the move started and ended. Captures and checks are tremors, and busy files and tense positions make the line restless.',
    setup(env) {
      const { S, game, cell, m } = env;
      const n = game.plies.length;
      const top = m + cell * 0.9, bottom = S - m * 0.8;
      env.state.top = top;
      env.state.spacing = (bottom - top) / Math.max(1, n);
      env.state.amp = Math.min(cell * 1.5, env.state.spacing * 12);
    },
    ply(env, i) {
      const { ctx, S, pal, game, data, noise, m } = env;
      const p = game.plies[i], side = p.color, st = env.state;
      const base = st.top + (i + 0.5) * st.spacing;
      const w = W[p.piece];
      const tf = L.fileOf(p.to) + 0.5, ff = L.fileOf(p.from) + 0.5;
      const d = data[i];
      const maxAct = Math.max(1, ...d.fileAct);
      const kingF = p.check ? L.fileOf(d.king[L.enemy(side)]) + 0.5 : null;
      const tension = Math.min(1, (d.captures || 0) / 8);
      const bump = (x, c, wd, h) => h * Math.exp(-(((x - c) / wd) ** 2));
      const left = m, right = S - m, pts = [];
      for (let k = 0; k <= 180; k++) {
        const x = (k / 180) * 8;
        const fi = Math.max(0, Math.min(7, Math.floor(x))), fi2 = Math.max(0, Math.min(7, Math.round(x)));
        let h = 0.06 * (d.fileAct[fi] / maxAct + d.fileAct[fi2] / maxAct);
        h += bump(x, tf, 0.32 + w * 0.05, 0.3 + w * 0.06);
        h += bump(x, ff, 0.28, 0.12);
        if (p.captured) h += bump(x, tf, 0.16, 0.45 + W[p.captured] * 0.06) * (0.75 + 0.5 * Math.abs(noise(x * 9, i * 3.1)));
        if (kingF != null) h += bump(x, kingF, 0.14, p.mate ? 1.1 : 0.55) * (0.6 + 0.8 * Math.abs(noise(x * 14, i * 1.7)));
        h += noise(x * 2.6, i * 0.37) * (0.03 + tension * 0.09);
        const win = 1 - Math.pow((x - 4) / 4, 8);
        pts.push([left + (x / 8) * (right - left), base - Math.max(0, h) * win * st.amp]);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = pal.bg;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], base + st.spacing * 0.6);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(pts[pts.length - 1][0], base + st.spacing * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.mate ? pal.accent : L.moverColor(env, p);
      ctx.lineWidth = S * (p.mate ? 0.0028 : 0.0016);
      ctx.lineJoin = 'round';
      L.pathPoly(ctx, pts, false);
      ctx.stroke();
      if (p.color === 'w' && p.moveNumber % 10 === 0) {
        ctx.fillStyle = L.rgba(pal.fg, 0.45);
        ctx.font = `${Math.round(S * 0.012)}px ${L.MONO}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.moveNumber), left - S * 0.012, base);
      }
    },
  });

  // 4.3 Topographic --------------------------------------------------------------
  reg({
    code: '4.3', id: 'topo', name: 'Topographic', retained: true,
    blurb: 'A contour map of the game. White’s moves raise hills and Black’s dig basins, each in proportion to the piece’s weight, and captures make sharp peaks. Contour lines are drawn every level, with a heavier index line every third, over a faint elevation tint.',
    setup(env) { env.state.g = L.grid(110); },
    ply(env, i) {
      const p = env.game.plies[i], g = env.state.g, s = p.color === 'w' ? 1 : -1;
      L.splatMove(env, g, p, 0.75, s * (0.5 + W[p.piece] * 0.15), 0.25);
      if (p.captured) { const [gx, gy] = L.gposSq(env, g, p.to); L.splat(g, gx, gy, L.gscale(env, g) * 0.35, s * (0.4 + W[p.captured] * 0.15)); }
    },
    present(env) {
      const { ctx, S, pal } = env;
      const g = L.blur(env.state.g, 2), n = g.n, mx = L.maxAbs(g);
      env.clear(pal.bg);
      const wR = L.hexRgb(pal.w[2]), bR = L.hexRgb(pal.b[2]), bg = L.hexRgb(pal.bg);
      L.renderPixels(env, n, n, (d) => {
        for (let i = 0; i < n * n; i++) {
          const t = g.a[i] / mx, c = L.mixRgb(bg, t > 0 ? wR : bR, Math.min(1, Math.abs(t)) * 0.5);
          d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
        }
      });
      const levels = 10, step = mx / levels, toPx = (v) => ((v + 0.5) / n) * S;
      ctx.lineCap = 'round';
      for (let k = -levels; k <= levels; k++) {
        if (k === 0) continue;
        const segs = L.contours(g.a, n, k * step);
        if (!segs.length) continue;
        const major = k % 3 === 0;
        ctx.strokeStyle = L.rgba(k > 0 ? pal.w[3] : pal.b[3], major ? 0.95 : 0.65);
        ctx.lineWidth = S * (major ? 0.0024 : 0.0011);
        ctx.beginPath();
        for (let s = 0; s < segs.length; s += 2) { ctx.moveTo(toPx(segs[s][0]), toPx(segs[s][1])); ctx.lineTo(toPx(segs[s + 1][0]), toPx(segs[s + 1][1])); }
        ctx.stroke();
      }
      const zero = L.contours(g.a, n, 0);
      ctx.strokeStyle = L.rgba(pal.fg, 0.35); ctx.lineWidth = S * 0.001; ctx.setLineDash([S * 0.006, S * 0.006]);
      ctx.beginPath();
      for (let s = 0; s < zero.length; s += 2) { ctx.moveTo(toPx(zero[s][0]), toPx(zero[s][1])); ctx.lineTo(toPx(zero[s + 1][0]), toPx(zero[s + 1][1])); }
      ctx.stroke();
      ctx.setLineDash([]);
      // spot heights on captures
      ctx.fillStyle = L.rgba(pal.fg, 0.7);
      ctx.font = `${S * 0.012}px ${L.MONO}`;
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= env.cur; i++) {
        const p = env.game.plies[i];
        if (!p.captured) continue;
        const [x, y] = L.at(env, p.to), s = S * 0.006;
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.7); ctx.lineTo(x - s, y + s * 0.7); ctx.closePath(); ctx.fill();
        ctx.fillText(p.san, x + s * 1.6, y);
      }
    },
  });

  // 4.4 Spirograph ----------------------------------------------------------------
  const GEAR = { p: [3, 1, 0.6], n: [5, 2, 0.9], b: [7, 3, 0.8], r: [4, 1, 0.7], q: [12, 5, 0.95], k: [6, 1, 0.5] };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  reg({
    code: '4.4', id: 'spirograph', name: 'Spirograph',
    blurb: 'Each landing square gets a spirograph rosette, and each piece has its own gear ratio: three loops for a pawn, a five-point star for a knight, twelve petals for a queen. Repeat visits enlarge and turn the rosette, so busy squares become lace.',
    setup(env) { env.state.vis = {}; },
    ply(env, i) {
      const { ctx, S, game, cell, pal } = env;
      const p = game.plies[i], w = W[p.piece], c = L.moverColor(env, p);
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const v = (env.state.vis[p.to] = (env.state.vis[p.to] || 0) + 1);
      const [R, r, df] = GEAR[p.piece];
      const scale = cell * (0.17 + w * 0.022) * (1 + (v - 1) * 0.18);
      const rot = Math.atan2(by - ay, bx - ax) + v * 0.3;
      const period = (L.TAU * r) / gcd(R, r), d = r * df, norm = R - r + d;
      ctx.strokeStyle = L.rgba(c, 0.15);
      ctx.lineWidth = S * 0.0008;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = L.rgba(c, pal.dark ? 0.6 : 0.7);
      ctx.lineWidth = S * 0.0009 * (1 + w * 0.05);
      ctx.beginPath();
      const steps = 260;
      for (let k = 0; k <= steps; k++) {
        const t = (k / steps) * period;
        const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        const X = (x * Math.cos(rot) - y * Math.sin(rot)) / norm, Y = (x * Math.sin(rot) + y * Math.cos(rot)) / norm;
        k ? ctx.lineTo(bx + X * scale, by + Y * scale) : ctx.moveTo(bx + X * scale, by + Y * scale);
      }
      ctx.stroke();
      if (p.captured) {
        ctx.strokeStyle = L.rgba(L.victimColor(env, p), 0.8);
        ctx.beginPath(); ctx.arc(bx, by, scale * 1.15, 0, L.TAU); ctx.stroke();
      }
    },
    finish: L.finishHalo,
  });

  // 4.5 Engraving ------------------------------------------------------------------
  reg({
    code: '4.5', id: 'engraving', name: 'Engraving', retained: true,
    blurb: 'Banknote-style hatching. The more often a square was visited and fought over, the darker its tone, built from up to four layers of cross-hatched lines that swell as they deepen. Lines lean toward each side’s colour where that side was most active.',
    setup(env) { env.state.tone = L.grid(120); env.state.side = L.grid(120); },
    ply(env, i) {
      const p = env.game.plies[i], w = W[p.piece];
      L.splatMove(env, env.state.tone, p, 0.8, 0.6 + w * 0.15 + (p.captured ? W[p.captured] * 0.2 : 0), 0.4);
      L.splatMove(env, env.state.side, p, 0.9, p.color === 'w' ? 1 : -1, 0.3);
    },
    present(env) {
      const { ctx, S, pal, m } = env;
      env.clear(pal.bg);
      const tone = L.blur(env.state.tone, 2), side = L.blur(env.state.side, 1);
      let mx = 1e-6;
      for (const v of tone.a) if (v > mx) mx = v;
      const T = (x, y) => Math.min(1, L.sampleAt(env, tone, x, y) / mx);
      const inkW = L.mix(pal.fg, pal.w[3], 0.4), inkB = L.mix(pal.fg, pal.b[3], 0.4);
      const d = S / 110, R = S * 0.75;
      ctx.lineCap = 'round';
      for (const [ang, th] of [[Math.PI / 4, 0.05], [-Math.PI / 4, 0.28], [0, 0.52], [Math.PI / 2, 0.76]]) {
        const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
        for (let s = -R; s <= R; s += d) {
          let run = null;
          const flush = () => {
            if (run && run.pts.length > 1) {
              ctx.strokeStyle = run.c; ctx.lineWidth = run.w / run.pts.length;
              L.pathPoly(ctx, run.pts, false); ctx.stroke();
            }
            run = null;
          };
          for (let t = -R; t <= R; t += d * 0.6) {
            const x = S / 2 + ux * t + nx * s, y = S / 2 + uy * t + ny * s;
            if (x < 0 || y < 0 || x > S || y > S) { flush(); continue; }
            const v = T(x, y);
            if (v <= th) { flush(); continue; }
            const wd = d * (0.1 + (0.55 * (v - th)) / (1 - th));
            if (!run) run = { pts: [], w: 0, c: L.sampleAt(env, side, x, y) >= 0 ? inkW : inkB };
            run.pts.push([x, y]); run.w += wd;
            if (run.pts.length >= 6) { const last = run.pts[run.pts.length - 1], c = run.c; flush(); run = { pts: [last], w: wd, c }; }
          }
          flush();
        }
      }
      ctx.strokeStyle = L.rgba(pal.fg, 0.8);
      ctx.lineWidth = S * 0.002;
      ctx.strokeRect(m * 0.45, m * 0.45, S - m * 0.9, S - m * 0.9);
      ctx.lineWidth = S * 0.0008;
      ctx.strokeRect(m * 0.6, m * 0.6, S - m * 1.2, S - m * 1.2);
    },
  });

  // 4.6 Constellation ---------------------------------------------------------------
  reg({
    code: '4.6', id: 'constellation', name: 'Constellation',
    blurb: 'A star chart. Every square has its own fixed star, which grows brighter each time a piece lands there, and moves are the lines that join stars into constellations. Captures flare with diffraction spikes and are labelled like named stars.',
    setup(env) {
      const { ctx, S, pal, cell } = env;
      const r = L.prng(5 + env.variation * 7919);
      ctx.strokeStyle = L.rgba(pal.fg, 0.08);
      ctx.lineWidth = S * 0.0008;
      for (const k of [0.15, 0.28, 0.41, 0.54]) { ctx.beginPath(); ctx.arc(S / 2, S / 2, k * S, 0, L.TAU); ctx.stroke(); }
      for (let k = 0; k < 12; k++) { const a = (k / 12) * L.TAU; ctx.beginPath(); ctx.moveTo(S / 2, S / 2); ctx.lineTo(S / 2 + Math.cos(a) * S, S / 2 + Math.sin(a) * S); ctx.stroke(); }
      for (let k = 0; k < 260; k++) { ctx.fillStyle = L.rgba(pal.fg, 0.1 + r() * 0.35); ctx.beginPath(); ctx.arc(r() * S, r() * S, S * (0.0004 + r() ** 3 * 0.0012), 0, L.TAU); ctx.fill(); }
      env.state.pos = {};
      for (let f = 0; f < 8; f++) for (let k = 0; k < 8; k++) {
        const sq = L.sqName(f, k), [x, y] = L.at(env, sq);
        env.state.pos[sq] = [x + (L.h01(sq + 'cx') - 0.5) * cell * 0.55, y + (L.h01(sq + 'cy') - 0.5) * cell * 0.55];
      }
      env.state.vis = {};
    },
    ply(env, i) {
      const { ctx, S, pal, game, cell } = env;
      const p = game.plies[i], w = W[p.piece], c = L.moverColor(env, p);
      const A = env.state.pos[p.from], B = env.state.pos[p.to];
      ctx.strokeStyle = L.rgba(pal.dark ? L.mix(pal.fg, c, 0.5) : pal.fg, 0.28);
      ctx.lineWidth = S * 0.0008;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      const v = (env.state.vis[p.to] = (env.state.vis[p.to] || 0) + 1);
      const r = S * 0.0017 * (1 + w * 0.15) * (1 + Math.min(6, v) * 0.15);
      const gl = ctx.createRadialGradient(B[0], B[1], 0, B[0], B[1], r * 7);
      gl.addColorStop(0, L.rgba(c, 0.32)); gl.addColorStop(1, L.rgba(c, 0));
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(B[0], B[1], r * 7, 0, L.TAU); ctx.fill();
      ctx.fillStyle = pal.dark ? L.mix(c, '#ffffff', 0.6) : L.mix(c, pal.fg, 0.45);
      ctx.beginPath(); ctx.arc(B[0], B[1], r, 0, L.TAU); ctx.fill();
      if (p.captured) {
        const vc = L.victimColor(env, p);
        ctx.strokeStyle = L.rgba(vc, 0.85); ctx.lineWidth = S * 0.0009;
        for (let k = 0; k < 4; k++) { const a = (k / 4) * L.TAU + 0.2, len = cell * 0.32; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] + Math.cos(a) * len, B[1] + Math.sin(a) * len); ctx.stroke(); }
        ctx.fillStyle = L.rgba(pal.fg, 0.55);
        ctx.font = `italic ${S * 0.012}px ${L.SERIF}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(p.san, B[0] + cell * 0.12, B[1] - cell * 0.14);
      }
    },
    finish: L.finishHalo,
  });
})();
