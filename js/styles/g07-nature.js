/* Group 7 — Nature & Organic. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  function flower(ctx, x, y, R, petals, color, center, rot = 0, alpha = 0.92) {
    ctx.fillStyle = L.rgba(color, alpha);
    for (let k = 0; k < petals; k++) {
      const a = rot + (k / petals) * L.TAU;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, R * 0.5, R * 0.22, a, 0, L.TAU);
      ctx.fill();
    }
    ctx.fillStyle = center;
    ctx.beginPath(); ctx.arc(x, y, R * 0.2, 0, L.TAU); ctx.fill();
  }

  // 7.1 Vines -------------------------------------------------------------------
  reg({
    code: '7.1', id: 'vines', name: 'Vines',
    blurb: 'Every piece is a vine that grows from its own side of the board, White’s from the bottom edge and Black’s from the top. Each time a piece moves, its vine reaches on to the new square, curling and putting out leaves. A captured piece’s vine ends in a blossom where it fell, and the survivors bud at the end.',
    setup(env) {
      const { S, cell, m, data } = env;
      env.state.tips = {};
      for (const id in data.track.ids) {
        const P = data.track.ids[id], f = L.fileOf(P.start), white = P.color === 'w';
        env.state.tips[id] = {
          x: m + (f + 0.5) * cell + (P.type === 'p' ? 0.22 : -0.22) * cell, y: white ? S + 4 : -4,
          w: S * (0.0026 + W[P.type] * 0.0006), alive: true, color: P.color, type: P.type, start: P.start, segs: 0,
        };
      }
    },
    grow(env, id, to) {
      const tip = env.state.tips[id];
      if (!tip || !tip.alive) return;
      const { ctx, cell, gauss, S, pal, noise } = env;
      let [tx, ty] = L.at(env, to);
      tx += (L.h01(id + to + 'x') - 0.5) * cell * 0.3;
      ty += (L.h01(id + to + 'y') - 0.5) * cell * 0.3;
      const d = Math.hypot(tx - tip.x, ty - tip.y);
      if (d < 1) return;
      const bow = (gauss() * 0.22 + (tip.color === 'w' ? 0.14 : -0.14)) * d;
      const n = Math.max(8, Math.round(d / (cell * 0.12)));
      const raw = L.bowPts([tip.x, tip.y], [tx, ty], bow, n);
      const pts = raw.map(([x, y], k) => {
        const t = k / n, wob = noise(x / cell * 1.3 + tip.segs, y / cell * 1.3) * cell * 0.18 * Math.sin(Math.PI * t);
        return [x + wob, y - wob * 0.6];
      });
      const col = env.color(tip.color, tip.type), stem = L.mix(col, pal.fg, 0.3), leaf = L.rgba(L.mix(col, pal.bg, 0.15), 0.85);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const w0 = tip.w, w1 = Math.max(S * 0.0009, tip.w * 0.88);
      for (let c = 0; c < 3; c++) {
        const a = Math.floor((c * n) / 3), b = Math.floor(((c + 1) * n) / 3);
        ctx.strokeStyle = stem; ctx.lineWidth = w0 + (w1 - w0) * (c / 2);
        L.pathPoly(ctx, pts.slice(a, b + 1), false); ctx.stroke();
      }
      const every = Math.max(3, Math.round((cell * 0.7) / (d / n)));
      for (let k = every; k < n - 1; k += every) {
        const [lx, ly] = pts[k], [nx2, ny2] = pts[k + 1];
        const la = Math.atan2(ny2 - ly, nx2 - lx) + ((k / every) % 2 ? 1 : -1) * 1.0, ll = cell * 0.2;
        ctx.fillStyle = leaf;
        ctx.beginPath(); ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + Math.cos(la - 0.5) * ll * 0.7, ly + Math.sin(la - 0.5) * ll * 0.7, lx + Math.cos(la) * ll, ly + Math.sin(la) * ll);
        ctx.quadraticCurveTo(lx + Math.cos(la + 0.5) * ll * 0.7, ly + Math.sin(la + 0.5) * ll * 0.7, lx, ly);
        ctx.fill();
      }
      tip.w = w1; tip.x = tx; tip.y = ty; tip.segs++;
    },
    ply(env, i) {
      const { data, game, cell, pal, ctx } = env;
      const T = data.track, p = game.plies[i];
      if (T.victim[i]) {
        const vid = T.victim[i], tip = env.state.tips[vid];
        if (tip && tip.alive) {
          const vsq = p.enPassant ? p.to[0] + p.from[1] : p.to;
          if (tip.segs === 0) this.grow(env, vid, vsq);
          flower(ctx, tip.x, tip.y, cell * (0.2 + W[tip.type] * 0.03), W[tip.type] > 3 ? 8 : 5, L.victimColor(env, p), pal.accent, i);
          tip.alive = false;
        }
      }
      if (T.mover[i]) this.grow(env, T.mover[i], p.to);
      if (T.rook[i]) this.grow(env, T.rook[i], (p.castle === 'k' ? 'f' : 'd') + (p.color === 'w' ? '1' : '8'));
    },
    finish(env) {
      const { ctx, cell, pal } = env;
      const mated = L.matedKing(env);
      for (const id in env.state.tips) {
        const tip = env.state.tips[id];
        if (!tip.alive) continue;
        if (tip.segs === 0) this.grow(env, id, tip.start);
        const col = env.color(tip.color, tip.type);
        if (tip.type === 'k') {
          const droop = mated && env.data[env.data.length - 1].king[tip.color] === mated;
          flower(ctx, tip.x, tip.y, cell * 0.42, 8, droop ? L.mix(col, pal.bg, 0.6) : col, droop ? pal.fg : pal.accent, droop ? 1.2 : 0);
        } else {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(tip.x, tip.y, cell * 0.07, 0, L.TAU); ctx.fill();
        }
      }
    },
  });

  // 7.2 Cells ------------------------------------------------------------------------
  reg({
    code: '7.2', id: 'cells', name: 'Cells', retained: true,
    blurb: 'Living tissue under a microscope. Each move seeds a cell where the piece landed, and long moves seed a smaller one along the way. Cells divide the space between them (a Voronoi diagram), with rounded membranes, a darker nucleus and a few organelles.',
    setup(env) {
      const { S, pal } = env;
      const r = L.prng(31 + env.variation * 7919), seeds = [];
      for (let k = 0; k < 26; k++) seeds.push({ x: r() * S, y: r() * S, c: L.mix(pal.bg, pal.fg, 0.07), bg: true });
      env.state.seeds = seeds;
    },
    ply(env, i) {
      const { game, gauss, cell } = env;
      const p = game.plies[i];
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      env.state.seeds.push({ x: bx + gauss() * cell * 0.32, y: by + gauss() * cell * 0.32, c: L.moverColor(env, p) });
      if (L.steps(p) >= 3) env.state.seeds.push({ x: (ax + bx) / 2 + gauss() * cell * 0.2, y: (ay + by) / 2 + gauss() * cell * 0.2, c: L.mix(L.moverColor(env, p), env.pal.bg, 0.4) });
      if (p.captured) env.state.seeds.push({ x: bx + gauss() * cell * 0.4, y: by + gauss() * cell * 0.4, c: L.victimColor(env, p) });
    },
    present(env) {
      const { ctx, S, pal } = env;
      env.clear(L.mix(pal.bg, pal.fg, 0.04));
      const seeds = env.state.seeds;
      const cells = L.voronoi(seeds.map(s => [s.x, s.y]), -S * 0.05, -S * 0.05, S * 1.05, S * 1.05);
      cells.forEach((poly, k) => {
        if (poly.length < 3) return;
        const s = seeds[k], area = L.polyArea(poly), R = Math.sqrt(area);
        const blob = L.chaikin(L.shrinkPoly(poly, Math.max(1.5, R * 0.07)), 3);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 0.8);
        g.addColorStop(0, L.rgba(L.mix(s.c, '#ffffff', 0.3), 0.9));
        g.addColorStop(1, L.rgba(s.c, 0.9));
        ctx.fillStyle = g;
        L.pathPoly(ctx, blob); ctx.fill();
        ctx.strokeStyle = L.rgba(L.mix(s.c, pal.fg, 0.35), 0.7);
        ctx.lineWidth = Math.max(0.8, S * 0.0016);
        ctx.stroke();
        if (s.bg) return;
        const h = L.h01(k + 'n');
        ctx.fillStyle = L.rgba(L.mix(s.c, pal.fg, 0.4), 0.85);
        ctx.beginPath(); ctx.ellipse(s.x, s.y, R * 0.13, R * 0.1, h * L.TAU, 0, L.TAU); ctx.fill();
        ctx.fillStyle = L.rgba(L.mix(s.c, pal.fg, 0.25), 0.6);
        for (let o = 0; o < 3; o++) { const a = L.h01(k + 'o' + o) * L.TAU, d = R * (0.2 + L.h01(k + 'd' + o) * 0.15); ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, R * 0.025, 0, L.TAU); ctx.fill(); }
      });
    },
  });

  // 7.3 Lichen (circle packing) ------------------------------------------------------
  reg({
    code: '7.3', id: 'lichen', name: 'Lichen',
    blurb: 'Lichen spreading over stone. Each move grows a colony of tightly packed discs around its landing square and along its path, and no disc may overlap another. Heavier pieces grow bigger discs, and captures leave a patch in the captured piece’s colour.',
    setup(env) {
      const { ctx, S, pal } = env;
      ctx.fillStyle = L.mix(pal.bg, pal.fg, 0.05); ctx.fillRect(0, 0, S, S);
      env.state.lich = { cs: env.cell * 0.25, map: new Map(), maxR: env.cell * 0.26 };
    },
    place(env, x, y, rmax, rgb) {
      const st = env.state.lich, { S } = env;
      const rmin = S * 0.0018;
      if (x < 0 || y < 0 || x > S || y > S) return;
      let r = rmax;
      const reach = Math.ceil((rmax + st.maxR) / st.cs), gx = Math.floor(x / st.cs), gy = Math.floor(y / st.cs);
      for (let yy = gy - reach; yy <= gy + reach && r >= rmin; yy++) for (let xx = gx - reach; xx <= gx + reach && r >= rmin; xx++) {
        const b = st.map.get(yy * 100000 + xx);
        if (!b) continue;
        for (const c of b) { r = Math.min(r, Math.hypot(c[0] - x, c[1] - y) - c[2] - S * 0.0008); if (r < rmin) break; }
      }
      if (r < rmin) return;
      const key = gy * 100000 + gx;
      if (!st.map.has(key)) st.map.set(key, []);
      st.map.get(key).push([x, y, r]);
      const { ctx, pal } = env;
      ctx.fillStyle = L.rgbStr(rgb);
      ctx.beginPath(); ctx.arc(x, y, r, 0, L.TAU); ctx.fill();
      if (r > env.cell * 0.055) {
        ctx.fillStyle = L.rgbStr(L.mixRgb(rgb, L.hexRgb(pal.bg), 0.45));
        ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, L.TAU); ctx.fill();
        ctx.fillStyle = L.rgbStr(rgb);
        ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, L.TAU); ctx.fill();
      }
      ctx.strokeStyle = L.rgbStr(L.mixRgb(rgb, L.WHITE, 0.4), 0.5);
      ctx.lineWidth = Math.max(0.5, r * 0.12);
      ctx.beginPath(); ctx.arc(x, y, r * 0.8, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    },
    ply(env, i) {
      const { game, gauss, cell, rng } = env;
      const p = game.plies[i], w = W[p.piece];
      const rgb = L.hexRgb(L.moverColor(env, p));
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      for (let k = 0; k < 40 + w * 16; k++) {
        const onPath = rng() < 0.3, t = rng();
        const x = onPath ? ax + (bx - ax) * t + gauss() * cell * 0.2 : bx + gauss() * cell * 0.6;
        const y = onPath ? ay + (by - ay) * t + gauss() * cell * 0.2 : by + gauss() * cell * 0.6;
        this.place(env, x, y, cell * (0.04 + w * 0.02) * (0.4 + rng() * 0.6), L.jitterRgb(env, rgb, 0.2));
      }
      if (p.captured) {
        const vr = L.hexRgb(L.victimColor(env, p));
        for (let k = 0; k < 60; k++) this.place(env, bx + gauss() * cell * 0.5, by + gauss() * cell * 0.5, cell * (0.06 + W[p.captured] * 0.015), L.jitterRgb(env, vr, 0.2));
      }
    },
    finish(env) {
      const k = L.matedKing(env);
      if (!k) return;
      const [x, y] = L.at(env, k), rgb = L.hexRgb(env.pal.accent);
      for (let n = 0; n < 120; n++) this.place(env, x + env.gauss() * env.cell * 0.7, y + env.gauss() * env.cell * 0.7, env.cell * 0.12, L.jitterRgb(env, rgb, 0.2));
    },
  });

  // 7.4 Turing Patterns (Gray–Scott reaction–diffusion) ------------------------------
  reg({
    code: '7.4', id: 'turing', name: 'Turing Patterns', retained: true, heavy: true,
    blurb: 'Reaction–diffusion: the chemistry Alan Turing proposed for leopard spots and zebra stripes. Every move injects a reagent where the piece landed. Where White has pressed, the pattern grows like coral, and where Black has, it splits like dividing cells.',
    setup(env) {
      const { S, game } = env;
      const n = Math.max(96, Math.min(S >= 2400 ? 280 : 230, Math.round(S / 2.6)));
      const N2 = n * n;
      const st = {
        n, A: new Float32Array(N2).fill(1), B: new Float32Array(N2), A2: new Float32Array(N2), B2: new Float32Array(N2),
        side: { n, a: new Float32Array(N2) }, F: new Float32Array(N2), K: new Float32Array(N2),
        iters: Math.max(12, Math.round(2200 / Math.max(1, game.plies.length))),
      };
      env.state.rd = st;
      this.params(st);
    },
    params(st) {
      const { side, F, K } = st;
      for (let i = 0; i < F.length; i++) {
        const t = Math.max(-1, Math.min(1, side.a[i])) * 0.5 + 0.5; // 1 = White's ground
        F[i] = 0.0367 + (0.0545 - 0.0367) * t;
        K[i] = 0.0649 + (0.062 - 0.0649) * t;
      }
    },
    seed(st, gx, gy, r) {
      const n = st.n;
      for (let y = Math.max(1, Math.floor(gy - r)); y <= Math.min(n - 2, Math.ceil(gy + r)); y++) {
        for (let x = Math.max(1, Math.floor(gx - r)); x <= Math.min(n - 2, Math.ceil(gx + r)); x++) {
          if ((x - gx) ** 2 + (y - gy) ** 2 <= r * r) { st.B[y * n + x] = 1; st.A[y * n + x] = 0.5; }
        }
      }
    },
    step(st) {
      const { n, A, B, A2, B2, F, K } = st;
      for (let y = 0; y < n; y++) {
        const ym = (y > 0 ? y - 1 : 0) * n, y0 = y * n, yp = (y < n - 1 ? y + 1 : n - 1) * n;
        for (let x = 0; x < n; x++) {
          const xm = x > 0 ? x - 1 : 0, xp = x < n - 1 ? x + 1 : n - 1, i = y0 + x;
          const a = A[i], b = B[i];
          const lapA = 0.2 * (A[y0 + xm] + A[y0 + xp] + A[ym + x] + A[yp + x]) + 0.05 * (A[ym + xm] + A[ym + xp] + A[yp + xm] + A[yp + xp]) - a;
          const lapB = 0.2 * (B[y0 + xm] + B[y0 + xp] + B[ym + x] + B[yp + x]) + 0.05 * (B[ym + xm] + B[ym + xp] + B[yp + xm] + B[yp + xp]) - b;
          const abb = a * b * b;
          A2[i] = a + (lapA - abb + F[i] * (1 - a));
          B2[i] = b + (0.5 * lapB + abb - (K[i] + F[i]) * b);
        }
      }
      st.A = A2; st.A2 = A; st.B = B2; st.B2 = B;
    },
    ply(env, i) {
      const st = env.state.rd, p = env.game.plies[i];
      const sc = L.gscale(env, st.side), [gx, gy] = L.gposSq(env, st.side, p.to);
      L.splat(st.side, gx, gy, sc * 1.3, p.color === 'w' ? 0.9 : -0.9);
      this.params(st);
      const r = Math.max(1.5, sc * 0.06);
      for (let k = 0; k < 3 + W[p.piece]; k++) this.seed(st, gx + env.gauss() * sc * 0.45, gy + env.gauss() * sc * 0.45, r);
      const [fx, fy] = L.gposSq(env, st.side, p.from);
      for (let k = 1; k < 4; k++) this.seed(st, fx + (gx - fx) * k / 4, fy + (gy - fy) * k / 4, r);
      if (p.captured) this.seed(st, gx + sc * 0.3, gy - sc * 0.2, Math.max(1.5, sc * 0.14));
      for (let k = 0; k < st.iters; k++) this.step(st);
    },
    present(env, final) {
      const { S, pal } = env;
      const st = env.state.rd, n = st.n, B = st.B, side = st.side.a;
      const out = Math.round(Math.min(S, n * (final ? 6 : 3)));
      const bg = L.hexRgb(pal.bg), wc = L.hexRgb(pal.w[0]), bc = L.hexRgb(pal.b[0]);
      const wd = L.hexRgb(pal.w[3]), bd = L.hexRgb(pal.b[3]);
      const sc = n / out;
      const s2 = (a, gx, gy) => {
        gx = gx < 0 ? 0 : gx > n - 1.001 ? n - 1.001 : gx; gy = gy < 0 ? 0 : gy > n - 1.001 ? n - 1.001 : gy;
        const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * n + ix;
        return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + n] * (1 - fx) + a[i + n + 1] * fx) * fy;
      };
      L.renderPixels(env, out, out, (d) => {
        for (let py = 0; py < out; py++) {
          const gy = (py + 0.5) * sc - 0.5;
          for (let px = 0; px < out; px++) {
            const gx = (px + 0.5) * sc - 0.5;
            const v = s2(B, gx, gy);
            let t = (v - 0.15) / 0.07; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
            const sd = Math.max(-1, Math.min(1, s2(side, gx, gy))) * 0.5 + 0.5;
            const ink = L.mixRgb(bc, wc, sd), deep = L.mixRgb(bd, wd, sd);
            const gxv = s2(B, gx + 0.7, gy) - s2(B, gx - 0.7, gy), gyv = s2(B, gx, gy + 0.7) - s2(B, gx, gy - 0.7);
            const shade = 1 - (gxv * 0.8 + gyv * 1.1);
            const c = L.mixRgb(bg, L.mixRgb(ink, deep, Math.min(1, v * 1.4)), t);
            const o = (py * out + px) * 4;
            d[o] = c[0] * shade; d[o + 1] = c[1] * shade; d[o + 2] = c[2] * shade; d[o + 3] = 255;
          }
        }
      });
    },
  });

  // 7.5 Garden ----------------------------------------------------------------------
  const PETALS = { p: 5, n: 6, b: 4, r: 8, q: 12, k: 10 };
  reg({
    code: '7.5', id: 'garden', name: 'Garden',
    blurb: 'A botanical drawing. Each move grows a stem from where the piece started to where it landed, and a flower opens there. The number of petals depends on the piece, from five for a pawn to twelve for a queen, and repeat visits grow bigger blooms. Captured pieces drop their petals.',
    setup(env) { env.state.vis = {}; },
    ply(env, i) {
      const { ctx, game, pal, cell, S, rng, gauss } = env;
      const p = game.plies[i], w = W[p.piece], c = L.moverColor(env, p);
      const A = L.at(env, p.from), B = L.at(env, p.to);
      const stem = L.mix(L.mix(pal.fg, env.color(p.color, 'n'), 0.45), pal.bg, 0.2);
      const pts = L.bowPts(A, B, Math.hypot(B[0] - A[0], B[1] - A[1]) * 0.18 * (p.color === 'w' ? 1 : -1), 20);
      ctx.strokeStyle = L.rgba(stem, 0.6); ctx.lineWidth = S * 0.0012 * (1 + w * 0.08); ctx.lineCap = 'round';
      L.pathPoly(ctx, pts, false); ctx.stroke();
      const mid = pts[10], la = Math.atan2(pts[11][1] - pts[9][1], pts[11][0] - pts[9][0]) + (rng() < 0.5 ? 1 : -1) * 0.9, ll = cell * 0.2;
      ctx.fillStyle = L.rgba(stem, 0.55);
      ctx.beginPath(); ctx.moveTo(mid[0], mid[1]);
      ctx.quadraticCurveTo(mid[0] + Math.cos(la - 0.5) * ll * 0.7, mid[1] + Math.sin(la - 0.5) * ll * 0.7, mid[0] + Math.cos(la) * ll, mid[1] + Math.sin(la) * ll);
      ctx.quadraticCurveTo(mid[0] + Math.cos(la + 0.5) * ll * 0.7, mid[1] + Math.sin(la + 0.5) * ll * 0.7, mid[0], mid[1]);
      ctx.fill();
      const v = (env.state.vis[p.to] = (env.state.vis[p.to] || 0) + 1);
      const R = cell * (0.15 + w * 0.025) * (1 + (v - 1) * 0.22);
      const rot = rng() * L.TAU;
      if (p.piece === 'q' || p.piece === 'k') flower(ctx, B[0], B[1], R * 1.25, PETALS[p.piece], L.mix(c, pal.bg, 0.35), c, rot + 0.2, 0.8);
      flower(ctx, B[0], B[1], R, PETALS[p.piece], c, pal.accent, rot);
      ctx.fillStyle = L.rgba(pal.fg, 0.5);
      for (let k = 0; k < 6; k++) { const a = rng() * L.TAU; ctx.beginPath(); ctx.arc(B[0] + Math.cos(a) * R * 0.28, B[1] + Math.sin(a) * R * 0.28, R * 0.04, 0, L.TAU); ctx.fill(); }
      if (p.captured) {
        const vc = L.victimColor(env, p);
        ctx.fillStyle = L.rgba(vc, 0.7);
        for (let k = 0; k < 7; k++) {
          const x = B[0] + gauss() * cell * 0.45, y = B[1] + Math.abs(gauss()) * cell * 0.55, a = rng() * L.TAU;
          ctx.beginPath(); ctx.ellipse(x, y, R * 0.3, R * 0.13, a, 0, L.TAU); ctx.fill();
        }
      }
    },
    finish: L.finishHalo,
  });

  // 7.6 Terrain ----------------------------------------------------------------------
  reg({
    code: '7.6', id: 'terrain', name: 'Terrain', retained: true,
    blurb: 'The board as a low-poly landscape seen from above at an angle. Every move raises the ground where the piece landed, more for heavier pieces, and captures throw up sharp peaks. Slopes take the colour of the side that fought there, and the highest summits are capped with snow.',
    setup(env) { env.state.h = L.grid(40); env.state.s = L.grid(40); },
    ply(env, i) {
      const p = env.game.plies[i], g = env.state.h, w = W[p.piece];
      const sc = g.n / 8;
      const gx = (L.fileOf(p.to) + 0.5) * sc - 0.5, gy = (7 - L.rankOf(p.to) + 0.5) * sc - 0.5;
      L.splat(g, gx, gy, sc * 0.75, 0.3 + w * 0.1);
      if (p.captured) L.splat(g, gx, gy, sc * 0.3, 0.4 + W[p.captured] * 0.12);
      L.splat(env.state.s, gx, gy, sc * 0.9, p.color === 'w' ? 1 : -1);
    },
    present(env) {
      const { ctx, S, pal } = env;
      const sky = ctx.createLinearGradient(0, 0, 0, S);
      sky.addColorStop(0, L.mix(pal.bg, pal.accent, 0.1)); sky.addColorStop(1, pal.bg);
      env.clear(pal.bg);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, S, S);
      const g = env.state.h, n = g.n, H = g.a;
      let mx = 0.5; for (const v of H) if (v > mx) mx = v;
      const sx = (S * 0.5) / n, sy = sx * 0.55, hs = (S * 0.26) / mx, X0 = S / 2, Y0 = S * 0.25;
      const P = (x, y) => [X0 + (x - y) * sx, Y0 + (x + y) * sy - H[y * n + x] * hs];
      const low = L.hexRgb(L.mix(pal.bg, pal.fg, 0.18)), snow = L.hexRgb(L.mix(pal.bg, '#ffffff', 0.7));
      const wC = L.hexRgb(pal.w[0]), bC = L.hexRgb(pal.b[0]), SG = env.state.s.a;
      const ramp = (t, sd) => { const side = L.mixRgb(bC, wC, Math.tanh(sd * 1.5) * 0.5 + 0.5); const c = L.mixRgb(low, side, Math.min(1, t * 1.6)); return t > 0.82 ? L.mixRgb(c, snow, Math.min(1, (t - 0.82) * 6)) : c; };
      let Lx = -0.5, Ly = -0.3, Lz = 0.8; const ll = Math.hypot(Lx, Ly, Lz); Lx /= ll; Ly /= ll; Lz /= ll;
      const zs = hs / sx;
      for (let sum = 0; sum <= 2 * (n - 2); sum++) {
        for (let x = 0; x < n - 1; x++) {
          const y = sum - x;
          if (y < 0 || y >= n - 1) continue;
          const h00 = H[y * n + x], h10 = H[y * n + x + 1], h01 = H[(y + 1) * n + x], h11 = H[(y + 1) * n + x + 1];
          for (const tri of [[[x, y, h00], [x + 1, y, h10], [x + 1, y + 1, h11]], [[x, y, h00], [x + 1, y + 1, h11], [x, y + 1, h01]]]) {
            const [a, b, c] = tri;
            const ux = b[0] - a[0], uy = b[1] - a[1], uz = (b[2] - a[2]) * zs, vx = c[0] - a[0], vy = c[1] - a[1], vz = (c[2] - a[2]) * zs;
            let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
            const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
            if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
            const shade = 0.55 + 0.6 * Math.max(0, nx * Lx + ny * Ly + nz * Lz);
            const hAvg = (a[2] + b[2] + c[2]) / 3 / mx, sd = SG[a[1] * n + a[0]];
            const col = L.rgbStr(ramp(hAvg, sd).map(v => v * shade));
            const pa = P(a[0], a[1]), pb = P(b[0], b[1]), pc = P(c[0], c[1]);
            ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.lineTo(pc[0], pc[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        }
      }
    },
  });
})();
