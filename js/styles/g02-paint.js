/* Group 2 — Fluid & Paint. Wet media driven by the game. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  // 2.1 Oil --------------------------------------------------------------------
  // Each move lays paint along its path; after every move the current stirs the
  // whole canvas (semi-Lagrangian advection of colour + thickness). Early moves
  // marble into long swirls, late ones stay fresh. Lit like impasto.
  reg({
    code: '2.1', id: 'oil', name: 'Oil', retained: true, heavy: true,
    blurb: 'Fluid oil paint. Each move lays brushstrokes along the current, and the current keeps stirring the canvas. The opening ends up marbled into long swirls, and the last moves stay as fresh, thick strokes.',
    setup(env) {
      const { S, pal, game } = env;
      const F = L.buildField(env);
      const N = Math.max(96, Math.min(S >= 2400 ? 600 : 380, Math.round(S / 2.5)));
      const n2 = N * N;
      const st = {
        N, R: new Float32Array(n2), G: new Float32Array(n2), B: new Float32Array(n2), T: new Float32Array(n2),
        tR: new Float32Array(n2), tG: new Float32Array(n2), tB: new Float32Array(n2), tT: new Float32Array(n2),
        VX: new Float32Array(n2), VY: new Float32Array(n2),
        u2c: (N * env.cell) / S,
        K: Math.max(1, Math.round(110 / Math.max(1, game.plies.length))),
      };
      const bg = L.hexRgb(pal.bg);
      const under = [pal.w[0], pal.b[0], pal.w[2], pal.b[2], pal.w[4], pal.b[4]].map(L.hexRgb);
      const uMix = pal.dark ? 0.26 : 0.3;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          const nz = env.noise((x / N) * 2.2 + 11, (y / N) * 2.2 + 7);
          const tc = ((((nz * 0.5 + 0.5) * under.length * 1.5) % under.length) + under.length) % under.length;
          const uc = L.mixRgb(under[Math.floor(tc)], under[(Math.floor(tc) + 1) % under.length], tc - Math.floor(tc));
          const base = L.mixRgb(bg, uc, uMix * (0.55 + 0.45 * Math.abs(env.noise((x / N) * 4, (y / N) * 4 + 3))));
          const g = env.noise((x / N) * 9, (y / N) * 9) * (pal.dark ? 8 : 6);
          st.R[i] = base[0] + g; st.G[i] = base[1] + g; st.B[i] = base[2] + g;
          const u = (((x + 0.5) / N) * S - env.m) / env.cell;
          const v = (((y + 0.5) / N) * S - env.m) / env.cell;
          const [vx, vy] = L.fieldAt(env, u, v);
          const mag = Math.hypot(vx, vy) || 1e-6;
          const e = Math.min(x, y, N - 1 - x, N - 1 - y) / (N * 0.06);
          const edge = e >= 1 ? 1 : e * e * (3 - 2 * e);
          const speed = 0.11 * Math.tanh(mag / (F.median * 1.2)) * st.u2c * edge;
          st.VX[i] = (vx / mag) * speed;
          st.VY[i] = (vy / mag) * speed;
        }
      }
      env.state.oil = st;
    },
    toGrid(env, u, v) {
      const N = env.state.oil.N;
      return [((env.m + u * env.cell) / env.S) * N - 0.5, ((env.m + v * env.cell) / env.S) * N - 0.5];
    },
    stamp(env, cx, cy, r, rgb, amount, thick) {
      const st = env.state.oil, N = st.N;
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(N - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(N - 1, Math.ceil(cy + r));
      const r2 = r * r;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2;
          if (d2 >= r2) continue;
          const q = 1 - d2 / r2, f = q * q * amount, i = y * N + x;
          st.R[i] += (rgb[0] - st.R[i]) * f;
          st.G[i] += (rgb[1] - st.G[i]) * f;
          st.B[i] += (rgb[2] - st.B[i]) * f;
          st.T[i] = Math.min(4, st.T[i] + f * thick);
        }
      }
    },
    dab(env, at, rgb, rUnits, amount, thick) {
      const [x, y] = this.toGrid(env, at[0], at[1]);
      this.stamp(env, x, y, Math.max(1.2, rUnits * env.state.oil.u2c), rgb, amount, thick);
    },
    advect(env) {
      const st = env.state.oil, N = st.N;
      const { R, G: Gc, B, T, tR, tG, tB, tT, VX, VY } = st;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          let sx = x - VX[i], sy = y - VY[i];
          sx = sx < 0 ? 0 : sx > N - 1.001 ? N - 1.001 : sx;
          sy = sy < 0 ? 0 : sy > N - 1.001 ? N - 1.001 : sy;
          const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy;
          const j = iy * N + ix;
          const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
          tR[i] = R[j] * w00 + R[j + 1] * w10 + R[j + N] * w01 + R[j + N + 1] * w11;
          tG[i] = Gc[j] * w00 + Gc[j + 1] * w10 + Gc[j + N] * w01 + Gc[j + N + 1] * w11;
          tB[i] = B[j] * w00 + B[j + 1] * w10 + B[j + N] * w01 + B[j + N + 1] * w11;
          tT[i] = (T[j] * w00 + T[j + 1] * w10 + T[j + N] * w01 + T[j + N + 1] * w11) * 0.997;
        }
      }
      st.R = tR; st.tR = R; st.G = tG; st.tG = Gc; st.B = tB; st.tB = B; st.T = tT; st.tT = T;
    },
    ply(env, i) {
      const { game, rng, data, pal } = env;
      const p = game.plies[i], side = p.color, w = W[p.piece];
      const jitter = (rgb) => L.mixRgb(rgb, rng() < 0.5 ? L.WHITE : L.hexRgb(pal.bg), rng() * 0.14);
      const A = L.bu(p.from), B = L.bu(p.to);
      if (p.captured) this.dab(env, B, jitter(L.hexRgb(L.victimColor(env, p))), 0.38 + W[p.captured] * 0.03, 0.85, 1.0);
      const col = L.hexRgb(L.moverColor(env, p));
      const st = env.state.oil;
      for (let k = 0; k < 3 + Math.round(w / 2.5); k++) {
        const sd = k === 0 ? A : k === 1 ? B : L.seedOnMove(env, p, 0.3);
        const pts = L.trace(env, sd[0], sd[1], 40 + rng() * 50, 0.06);
        const c2 = jitter(col);
        const r = Math.max(1.2, (0.13 + w * 0.014) * st.u2c);
        pts.forEach((q, j) => {
          if (j % 2) return;
          const t = j / Math.max(1, pts.length - 1);
          const [gx, gy] = this.toGrid(env, q[0], q[1]);
          this.stamp(env, gx, gy, r * (0.45 + 0.65 * Math.sin(Math.PI * t)), c2, 0.65, 0.45);
        });
      }
      this.dab(env, B, jitter(col), 0.2 + w * 0.025, 0.88, 0.7 + w * 0.06);
      if (p.castle) this.dab(env, L.bu((p.castle === 'k' ? 'f' : 'd') + (side === 'w' ? '1' : '8')), jitter(L.hexRgb(env.color(side, 'r'))), 0.3, 0.85, 1);
      if (p.promotion) this.dab(env, B, L.hexRgb(env.color(side, p.promotion)), 0.5, 0.9, 1.4);
      if (p.check) this.dab(env, L.bu(data[i].king[L.enemy(side)]), L.hexRgb(pal.accent), 0.22, 0.6, 0.5);
      for (let s = 0; s < st.K; s++) this.advect(env);
    },
    present(env, final) {
      const { S, pal, noise } = env;
      const st = env.state.oil, N = st.N;
      const { R, G: Gc, B, T, VX, VY } = st;
      const dX = new Float32Array(N * N), dY = new Float32Array(N * N);
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x; dX[i] = (T[i + 1] - T[i - 1]) * 0.5; dY[i] = (T[i + N] - T[i - N]) * 0.5; }
      const out = Math.round(Math.min(S, N * (final ? 3 : 1.6)));
      let Lx = -0.45, Ly = -0.6, Lz = 0.66;
      const Ll = Math.hypot(Lx, Ly, Lz); Lx /= Ll; Ly /= Ll; Lz /= Ll;
      let Hx = Lx, Hy = Ly, Hz = Lz + 1;
      const Hl = Math.hypot(Hx, Hy, Hz); Hx /= Hl; Hy /= Hl; Hz /= Hl;
      const specBase = Math.pow(Hz, 40), bump = 1.6 * (N / 380), specAmt = pal.dark ? 70 : 55, scale = N / out;
      L.renderPixels(env, out, out, (data) => {
        for (let py = 0; py < out; py++) {
          let gy = (py + 0.5) * scale - 0.5;
          gy = gy < 0 ? 0 : gy > N - 1.001 ? N - 1.001 : gy;
          const iy = gy | 0, fy = gy - iy;
          for (let pxl = 0; pxl < out; pxl++) {
            let gx = (pxl + 0.5) * scale - 0.5;
            gx = gx < 0 ? 0 : gx > N - 1.001 ? N - 1.001 : gx;
            const ix = gx | 0, fx = gx - ix, j = iy * N + ix;
            const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
            const s = (a) => a[j] * w00 + a[j + 1] * w10 + a[j + N] * w01 + a[j + N + 1] * w11;
            const r = s(R), g = s(Gc), b = s(B), t = s(T);
            let nx = -s(dX) * bump, ny = -s(dY) * bump, nz = 1;
            const vx = s(VX), vy = s(VY), vl = Math.hypot(vx, vy) || 1e-6, ca = vx / vl, sa = vy / vl;
            const br = noise((-gx * sa + gy * ca) * 1.5, (gx * ca + gy * sa) * 0.12);
            const tt = t > 1 ? 1 : t;
            nx += -sa * br * 0.18 * tt;
            ny += ca * br * 0.18 * tt;
            const nl = Math.hypot(nx, ny, nz);
            nx /= nl; ny /= nl; nz /= nl;
            const shade = 1 + (nx * Lx + ny * Ly + nz * Lz - Lz) * 0.85 + br * 0.025;
            const nh = nx * Hx + ny * Hy + nz * Hz;
            const spec = nh > 0 ? Math.max(0, Math.pow(nh, 40) - specBase) * specAmt * tt : 0;
            const o = (py * out + pxl) * 4;
            data[o] = r * shade + spec; data[o + 1] = g * shade + spec; data[o + 2] = b * shade + spec; data[o + 3] = 255;
          }
        }
      });
    },
    finish(env) {
      const k = L.matedKing(env);
      if (!k) return;
      this.dab(env, L.bu(k), L.hexRgb(env.pal.accent), 0.7, 0.75, 1.6);
      for (let s = 0; s < 6; s++) this.advect(env);
    },
  });

  // 2.2 Marbling ---------------------------------------------------------------
  // Mathematical marbling: a drop of radius r at c moves every existing point p
  // to c + (p − c)·√(1 + r²/|p − c|²); combs and swirls displace the rings.
  reg({
    code: '2.2', id: 'marbling', name: 'Marbling', retained: true,
    blurb: 'Ebru, the Turkish art of paper marbling, done with real marbling maths. Every move drops a ring of colour onto the water and pushes the older rings outward. Long moves drag a comb through the paint, and knights stir it into swirls.',
    setup(env) {
      // drop size chosen so the whole game's paint roughly covers the bath
      const R0 = env.S * Math.sqrt(1.3 / (Math.max(8, env.game.plies.length) * Math.PI));
      env.state.drops = [];
      env.state.R0 = R0;
      env.state.maxEdge = Math.max(1.2, R0 * 0.07);
    },
    displace(env, fn) { for (const d of env.state.drops) for (const p of d.pts) fn(p); },
    refine(env) {
      const maxEdge = env.state.maxEdge;
      for (const d of env.state.drops) {
        if (d.pts.length > 2400) continue;
        const pts = d.pts, out = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          out.push(a);
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (len > maxEdge) {
            const k = Math.min(6, Math.ceil(len / maxEdge));
            for (let j = 1; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
          }
        }
        d.pts = out;
      }
    },
    drop(env, x, y, r, rgb) {
      const r2 = r * r;
      this.displace(env, (p) => {
        const dx = p[0] - x, dy = p[1] - y, f = Math.sqrt(1 + r2 / (dx * dx + dy * dy + 1e-9));
        p[0] = x + dx * f; p[1] = y + dy * f;
      });
      const pts = [];
      for (let k = 0; k < 64; k++) { const a = (k / 64) * L.TAU; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      env.state.drops.push({ pts, rgb });
      this.refine(env);
    },
    comb(env, ax, ay, bx, by, strength, lambda) {
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      this.displace(env, (p) => {
        const rx = p[0] - ax, ry = p[1] - ay;
        const along = rx * ux + ry * uy, across = Math.abs(-rx * uy + ry * ux);
        const beyond = along < 0 ? -along : along > len ? along - len : 0;
        const z = ((strength * lambda) / (across + lambda)) * Math.exp(-((beyond / (lambda * 2)) ** 2));
        p[0] += ux * z; p[1] += uy * z;
      });
      this.refine(env);
    },
    swirl(env, cx, cy, angle, lambda) {
      this.displace(env, (p) => {
        const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy);
        const th = (angle * lambda) / (d + lambda), c = Math.cos(th), s = Math.sin(th);
        p[0] = cx + dx * c - dy * s; p[1] = cy + dx * s + dy * c;
      });
      this.refine(env);
    },
    ply(env, i) {
      const { game, pal, gauss, cell, data } = env;
      const p = game.plies[i], side = p.color, w = W[p.piece], R0 = env.state.R0;
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const j = () => gauss() * cell * 0.15;
      if (p.captured) this.drop(env, bx + j(), by + j(), R0 * (0.6 + W[p.captured] * 0.06), L.jitterRgb(env, L.hexRgb(L.victimColor(env, p)), 0.12));
      this.drop(env, bx + j(), by + j(), R0 * (0.62 + w * 0.07), L.jitterRgb(env, L.hexRgb(L.moverColor(env, p)), 0.12));
      if (p.piece === 'n') this.swirl(env, bx, by, (side === 'w' ? 1 : -1) * 1.4, R0);
      else if (Math.hypot(bx - ax, by - ay) > cell * 1.5) this.comb(env, ax, ay, bx, by, R0 * (0.45 + w * 0.08), R0 * 0.6);
      if (p.check) { const [kx, ky] = L.at(env, data[i].king[L.enemy(side)]); this.drop(env, kx, ky, R0 * 0.3, L.hexRgb(pal.accent)); }
    },
    present(env) {
      const { ctx, pal } = env;
      env.clear(pal.bg);
      for (const d of env.state.drops) { ctx.fillStyle = L.rgbStr(d.rgb); L.pathPoly(ctx, d.pts); ctx.fill(); }
    },
    finish(env) {
      const k = L.matedKing(env);
      if (k) { const [x, y] = L.at(env, k); this.drop(env, x, y, env.state.R0 * 1.3, L.hexRgb(env.pal.accent)); }
    },
  });

  // 2.3 Watercolour --------------------------------------------------------------
  reg({
    code: '2.3', id: 'watercolor', name: 'Watercolour',
    blurb: 'Layered transparent washes. Each move leaves an elongated wash pointing the way it travelled, over a faint pencil line. Captures bloom with a pale back-run, and every twelve moves a glaze records who controls which squares.',
    ply(env, i) {
      const { ctx, game, pal, rng, gauss, cell, data, S } = env;
      const p = game.plies[i], side = p.color, w = W[p.piece];
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const ang = Math.atan2(by - ay, bx - ax), d = Math.hypot(bx - ax, by - ay);
      const a = pal.dark ? 0.04 : 0.07;
      const cx = ax + (bx - ax) * 0.68 + gauss() * cell * 0.12, cy = ay + (by - ay) * 0.68 + gauss() * cell * 0.12;
      const major = Math.max(cell * 0.3, d * 0.42), minor = cell * (0.2 + w * 0.022);
      L.wash(env, L.ellipsePts(cx, cy, major, minor, ang, 12, rng), L.moverColor(env, p), 12, a, minor);
      ctx.strokeStyle = L.rgba(pal.fg, pal.dark ? 0.14 : 0.22);
      ctx.lineWidth = S * 0.0007;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx + gauss(), by + gauss()); ctx.stroke();
      if (p.captured) {
        const R = cell * (0.38 + W[p.captured] * 0.035), vc = L.victimColor(env, p);
        L.wash(env, L.circlePts(bx, by, R, 12, rng), vc, 14, a * 1.1, R);
        L.wash(env, L.circlePts(bx + gauss() * cell * 0.1, by + gauss() * cell * 0.1, R * 0.55, 10, rng), L.mix(vc, pal.bg, 0.65), 6, a * 1.4, R * 0.55);
      }
      if (p.check) { const [kx, ky] = L.at(env, data[i].king[L.enemy(side)]); L.wash(env, L.circlePts(kx, ky, cell * 0.3, 10, rng), pal.accent, 8, a, cell * 0.3); }
      if (i % 12 === 11) {
        const ctrl = data[i].ctrl;
        for (let s = 0; s < 64; s++) {
          if (Math.abs(ctrl[s]) < 2) continue;
          const [x, y] = L.at(env, L.sqName(s % 8, Math.floor(s / 8)));
          L.wash(env, L.circlePts(x + gauss() * cell * 0.2, y + gauss() * cell * 0.2, cell * 0.5, 10, rng), env.color(ctrl[s] > 0 ? 'w' : 'b', 'q'), 3, a * 0.5, cell * 0.5);
        }
      }
    },
    finish(env) {
      const k = L.matedKing(env);
      if (k) { const [x, y] = L.at(env, k); L.wash(env, L.circlePts(x, y, env.cell * 1.0, 14, env.rng), env.pal.accent, 18, env.pal.dark ? 0.025 : 0.035, env.cell); }
    },
  });

  // 2.4 Ink Wash (sumi-e) ----------------------------------------------------------
  function brushStroke(env, pts, W0, rgb, dryness) {
    const { ctx, rng, noise } = env;
    const n = pts.length;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = L.rgbStr(rgb, 0.05);
    ctx.lineWidth = W0 * 2.6;
    L.pathPoly(ctx, pts, false);
    ctx.stroke();
    const normals = pts.map((p, k) => {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
    const bristles = 14, seed = rng() * 100;
    for (let b = 0; b < bristles; b++) {
      const o = (b / (bristles - 1)) * 2 - 1;
      const load = 0.8 + rng() * 0.2;
      ctx.strokeStyle = L.rgbStr(rgb, 0.45 + 0.4 * load);
      ctx.lineWidth = ((W0 * 2) / bristles) * 1.7;
      ctx.beginPath();
      let drawing = false;
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        const press = Math.min(1, t / 0.12 + 0.15) * (1 - 0.65 * Math.pow(t, 2.5));
        const width = W0 * (0.3 + 0.7 * press);
        const ink = load - t * dryness * (0.6 + 0.8 * Math.abs(o)) + noise(seed + b * 1.7, t * 7) * 0.35;
        const x = pts[k][0] + normals[k][0] * o * width, y = pts[k][1] + normals[k][1] * o * width;
        if (ink < 0.28) { drawing = false; continue; }
        if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  function enso(env, x, y, R, rgb, W0) {
    const a0 = env.rng() * L.TAU, pts = [];
    for (let k = 0; k <= 40; k++) { const a = a0 + (k / 40) * L.TAU * 0.88; pts.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); }
    brushStroke(env, pts, W0, rgb, 0.75);
  }

  reg({
    code: '2.4', id: 'sumi', name: 'Ink Wash',
    blurb: 'Sumi-e brush painting. Every move is one calligraphic stroke whose bristles run dry as it travels. Checks draw an ensō, the Zen circle, around the king, and a red seal carries the result.',
    ply(env, i) {
      const { game, pal, rng, cell, data, S } = env;
      const p = game.plies[i], side = p.color, w = W[p.piece];
      const A = L.at(env, p.from), B = L.at(env, p.to);
      const ink = L.hexRgb(L.mix(pal.fg, env.color(side, 'r'), 0.28));
      const bow = Math.hypot(B[0] - A[0], B[1] - A[1]) * (p.piece === 'n' ? 0.45 : 0.12) * (side === 'w' ? 1 : -1);
      brushStroke(env, L.bowPts(A, B, bow, 28), cell * (0.045 + w * 0.011), ink, 0.25 + rng() * 0.55);
      if (p.captured) {
        const { ctx } = env;
        ctx.fillStyle = L.rgbStr(ink, 0.3);
        ctx.beginPath(); ctx.arc(B[0], B[1], cell * (0.12 + W[p.captured] * 0.015), 0, L.TAU); ctx.fill();
        ctx.fillStyle = L.rgbStr(ink, 0.8);
        for (let k = 0; k < 6 + W[p.captured] * 2; k++) {
          const a = rng() * L.TAU, r = cell * (0.25 + rng() * 0.5);
          ctx.beginPath(); ctx.arc(B[0] + Math.cos(a) * r, B[1] + Math.sin(a) * r, S * (0.001 + rng() * 0.003), 0, L.TAU); ctx.fill();
        }
      }
      if (p.check) { const [kx, ky] = L.at(env, data[i].king[L.enemy(side)]); enso(env, kx, ky, cell * 0.42, L.hexRgb(pal.fg), cell * 0.03); }
    },
    finish(env) {
      const { ctx, S, pal, game, cell, m, rng } = env;
      const k = L.matedKing(env);
      if (k) { const [x, y] = L.at(env, k); enso(env, x, y, cell * 0.85, L.hexRgb(pal.accent), cell * 0.06); }
      const s = cell * 0.72, x = S - m * 0.5 - s, y = S - m * 0.5 - s;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = L.rgba(pal.accent, 0.9);
      const edge = [];
      for (let q = 0; q < 4; q++) for (let k = 0; k < 6; k++) {
        const t = k / 6, c = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]], a = c[q], b = c[(q + 1) % 4];
        edge.push([a[0] + (b[0] - a[0]) * t + (rng() - 0.5) * s * 0.04, a[1] + (b[1] - a[1]) * t + (rng() - 0.5) * s * 0.04]);
      }
      L.pathPoly(ctx, edge); ctx.fill();
      ctx.strokeStyle = pal.bg; ctx.lineWidth = s * 0.05;
      ctx.strokeRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76);
      ctx.fillStyle = pal.bg;
      ctx.font = `700 ${s * 0.3}px ${L.SERIF}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const res = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½' }[game.result] || '∗';
      ctx.fillText(res, x + s / 2, y + s / 2);
      for (let k = 0; k < 40; k++) { ctx.fillStyle = L.rgba(pal.bg, 0.5 + rng() * 0.5); ctx.fillRect(x + rng() * s, y + rng() * s, S * 0.0015, S * 0.0015); }
      ctx.restore();
    },
  });

  // 2.5 Action Painting -----------------------------------------------------------
  function splatter(env, x, y, rgb, count, spread) {
    const { ctx, rng, gauss, S } = env;
    ctx.fillStyle = L.rgbStr(rgb, 0.92);
    for (let k = 0; k < count; k++) {
      const dx = gauss() * spread, dy = gauss() * spread, d = Math.hypot(dx, dy) || 1;
      const r = S * (0.0012 + -Math.log(1 - rng() * 0.98) * 0.0022);
      const stretch = 1 + Math.min(2, d / spread);
      ctx.save();
      ctx.translate(x + dx, y + dy);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath(); ctx.ellipse(0, 0, r * stretch, r, 0, 0, L.TAU); ctx.fill();
      ctx.restore();
      if (rng() < 0.4) { ctx.beginPath(); ctx.arc(x + dx * 1.35, y + dy * 1.35, r * 0.35, 0, L.TAU); ctx.fill(); }
    }
  }
  function drips(env, x, y, rgb, count) {
    const { ctx, rng, gauss, cell, S } = env;
    ctx.strokeStyle = L.rgbStr(rgb, 0.9);
    ctx.fillStyle = L.rgbStr(rgb, 0.9);
    ctx.lineCap = 'round';
    for (let k = 0; k < count; k++) {
      const x0 = x + gauss() * cell * 0.2, len = cell * (0.4 + rng() * 1.3), w0 = S * (0.002 + rng() * 0.002);
      let px = x0, py = y;
      for (let s = 1; s <= 10; s++) {
        const nx = x0 + Math.sin(s * 0.9 + k) * w0 * 0.6, ny = y + (len * s) / 10;
        ctx.lineWidth = w0 * (1 - s / 14);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        px = nx; py = ny;
      }
      ctx.beginPath(); ctx.arc(px, py, w0 * 0.85, 0, L.TAU); ctx.fill();
    }
  }

  reg({
    code: '2.5', id: 'action', name: 'Action Painting',
    blurb: 'Poured and flung paint, in the manner of the abstract expressionists. Every move is a looping skein of paint that overshoots its squares, and it lands with a splatter. Captures splash hard, and the victim’s colour runs down the canvas in drips.',
    ply(env, i) {
      const { ctx, game, pal, noise, cell, S } = env;
      const p = game.plies[i], side = p.color, w = W[p.piece];
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      const rgb = L.hexRgb(i % 5 === 4 ? pal.fg : L.moverColor(env, p));
      const loops = { p: 0, n: 2, b: 1, r: 0, q: 3, k: 1 }[p.piece];
      const pts = [];
      for (let k = 0; k <= 70; k++) {
        const t = -0.25 + (1.5 * k) / 70;
        const wob = noise(i * 3.7 + t * 2.5, 0.5) * cell * 0.5;
        const lr = loops ? cell * 0.22 : 0, om = loops * Math.PI * 3;
        pts.push([ax + dx * t + nx * wob + Math.cos(om * t) * lr, ay + dy * t + ny * wob + Math.sin(om * t) * lr]);
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = L.rgbStr(rgb, 0.92);
      for (let k = 1; k < pts.length; k++) {
        ctx.lineWidth = S * 0.0012 * (0.4 + 2.2 * Math.abs(noise(i * 1.3 + k * 0.09, 4.2))) * (1 + w * 0.08);
        ctx.beginPath(); ctx.moveTo(pts[k - 1][0], pts[k - 1][1]); ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke();
      }
      splatter(env, bx, by, rgb, 4 + w * 2, cell * 0.45);
      if (p.captured) {
        const vc = L.hexRgb(L.victimColor(env, p));
        splatter(env, bx, by, vc, 10 + W[p.captured] * 3, cell * 0.75);
        drips(env, bx, by, vc, 2 + Math.round(W[p.captured] / 3));
      }
      if (p.check) { const [kx, ky] = L.at(env, env.data[i].king[L.enemy(side)]); splatter(env, kx, ky, L.hexRgb(pal.accent), 8, cell * 0.35); }
    },
    finish(env) {
      const k = L.matedKing(env);
      if (k) { const [x, y] = L.at(env, k); splatter(env, x, y, L.hexRgb(env.pal.accent), 40, env.cell * 0.9); drips(env, x, y, L.hexRgb(env.pal.accent), 5); }
    },
  });

  // 2.6 Palette Knife -------------------------------------------------------------
  function knife(env, cx, cy, ang, len, wid, c1, c2) {
    const { ctx, rng } = env;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const j = () => (rng() - 0.5) * wid * 0.12;
    const s0 = [cx - ux * len / 2, cy - uy * len / 2], s1 = [cx + ux * len / 2, cy + uy * len / 2];
    const poly = [
      [s0[0] + nx * wid * 0.55 + j(), s0[1] + ny * wid * 0.55 + j()],
      [s1[0] + nx * wid * 0.42 + j(), s1[1] + ny * wid * 0.42 + j()],
      [s1[0] - nx * wid * 0.42 + j(), s1[1] - ny * wid * 0.42 + j()],
      [s0[0] - nx * wid * 0.55 + j(), s0[1] - ny * wid * 0.55 + j()],
    ];
    const g = ctx.createLinearGradient(cx + nx * wid / 2, cy + ny * wid / 2, cx - nx * wid / 2, cy - ny * wid / 2);
    g.addColorStop(0, c1); g.addColorStop(0.45, L.mix(c1, c2, 0.5)); g.addColorStop(0.55, L.mix(c1, '#ffffff', 0.18)); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    L.pathPoly(ctx, poly); ctx.fill();
    // streaks dragged by the blade
    for (let k = 0; k < 9; k++) {
      const o = (rng() - 0.5) * 0.9 * wid, t1 = 0.4 + rng() * 0.6;
      ctx.strokeStyle = L.rgba(rng() < 0.5 ? L.mix(c1, '#ffffff', 0.3) : L.mix(c2, '#000000', 0.15), 0.25 + rng() * 0.25);
      ctx.lineWidth = wid * (0.02 + rng() * 0.04);
      ctx.beginPath();
      ctx.moveTo(s0[0] + nx * o, s0[1] + ny * o);
      ctx.lineTo(s0[0] + ux * len * t1 + nx * o, s0[1] + uy * len * t1 + ny * o);
      ctx.stroke();
    }
    // the ridge of paint pushed up at the blade's end
    ctx.strokeStyle = L.rgba(L.mix(c1, '#000000', 0.25), 0.4);
    ctx.lineWidth = wid * 0.08;
    ctx.beginPath(); ctx.moveTo(poly[1][0], poly[1][1]); ctx.lineTo(poly[2][0], poly[2][1]); ctx.stroke();
    ctx.strokeStyle = L.rgba(L.mix(c1, '#ffffff', 0.5), 0.5);
    ctx.lineWidth = wid * 0.025;
    ctx.beginPath(); ctx.moveTo(poly[1][0] - ux * wid * 0.06, poly[1][1] - uy * wid * 0.06); ctx.lineTo(poly[2][0] - ux * wid * 0.06, poly[2][1] - uy * wid * 0.06); ctx.stroke();
  }

  reg({
    code: '2.6', id: 'knife', name: 'Palette Knife',
    blurb: 'Flat, sharp-edged smears of thick paint over a scraped ground. Each move is one sweep of the knife toward the square where the piece landed, blending two colours from that side with streaks and a ridge of paint at the end. Captures are knifed across first in the captured piece’s colour.',
    setup(env) {
      const { S, pal, gauss } = env;
      const tones = [pal.w[2], pal.b[2], pal.w[4], pal.b[4]];
      for (let k = 0; k < 16; k++) {
        const c = tones[k % 4];
        knife(env, S / 2 + gauss() * S * 0.08, ((k + 0.5) / 16) * S + gauss() * S * 0.01, gauss() * 0.03, S * 1.35, (S / 16) * 1.4, L.mix(pal.bg, c, 0.2), L.mix(pal.bg, tones[(k + 1) % 4], 0.12));
      }
    },
    ply(env, i) {
      const { game, cell, gauss, pal } = env;
      const p = game.plies[i], side = p.color, w = W[p.piece];
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const ang = Math.atan2(by - ay, bx - ax), steps = L.steps(p);
      const len = Math.min(3.4, Math.max(0.8, steps * 0.9 + 0.6)) * cell, wid = cell * (0.3 + w * 0.04);
      const sib = { p: 'n', n: 'b', b: 'q', r: 'k', q: 'r', k: 'p' }[p.piece];
      if (p.captured) {
        const vc = L.victimColor(env, p);
        knife(env, bx + gauss() * cell * 0.1, by + gauss() * cell * 0.1, ang + Math.PI / 2, cell * 1.1, cell * 0.35, vc, L.mix(vc, pal.bg, 0.35));
      }
      knife(env, bx - Math.cos(ang) * len * 0.35, by - Math.sin(ang) * len * 0.35, ang + gauss() * 0.06, len, wid, L.moverColor(env, p), env.color(side, sib));
      if (p.check) {
        const [kx, ky] = L.at(env, env.data[i].king[L.enemy(side)]);
        knife(env, kx, ky, ang + Math.PI / 4, cell * 0.6, cell * 0.16, pal.accent, L.mix(pal.accent, pal.bg, 0.3));
      }
    },
    finish: L.finishHalo,
  });
})();
