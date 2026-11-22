/* Group 5 — Pattern & Textile. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  // 5.1 Tartan --------------------------------------------------------------------
  reg({
    code: '5.1', id: 'tartan', name: 'Tartan', retained: true,
    blurb: 'A woven plaid whose sett (stripe sequence) comes from the game. White’s pieces make the warp and Black’s the weft, one stripe per piece type in the order they first moved, each as wide as that piece was busy. A thin over-check in the accent colour counts each side’s captures, and the sett is mirrored like a real tartan and woven in 2/2 twill.',
    present(env) {
      const { S, pal, game } = env;
      const ground = L.hexRgb(L.mix(pal.bg, pal.fg, pal.dark ? 0.1 : 0.08));
      const accent = L.hexRgb(pal.accent);
      const tally = { w: {}, b: {} }, order = { w: [], b: [] }, caps = { w: 0, b: 0 };
      for (let i = 0; i <= env.cur; i++) {
        const p = game.plies[i];
        if (!tally[p.color][p.piece]) { tally[p.color][p.piece] = 0; order[p.color].push(p.piece); }
        tally[p.color][p.piece] += 1;
        if (p.captured) caps[p.color]++;
      }
      const settFor = (side) => {
        const seq = [ground, ground, ground];
        for (const t of order[side]) {
          const c = L.hexRgb(env.color(side, t)), n = 2 + Math.round(tally[side][t] * 1.3);
          for (let k = 0; k < n; k++) seq.push(c);
          seq.push(ground, ground);
        }
        if (caps[side]) { const mid = Math.floor(seq.length / 2); seq.splice(mid, 0, ground, ...Array(1 + Math.floor(caps[side] / 4)).fill(accent), ground); }
        return seq;
      };
      const mirror = (seq) => seq.concat(seq.slice(1, -1).reverse());
      const warp = mirror(settFor('w')), weft = order.b.length ? mirror(settFor('b')) : warp;
      const T = Math.max(48, Math.min(170, Math.round(Math.max(warp.length, weft.length) * 1.6)));
      const out = Math.round(Math.min(S, 1600));
      L.renderPixels(env, out, out, (d) => {
        for (let y = 0; y < out; y++) {
          const fy = (y / out) * T, ty = fy | 0, weftC = weft[ty % weft.length], wy = fy - ty;
          for (let x = 0; x < out; x++) {
            const fx = (x / out) * T, tx = fx | 0;
            const warpOn = (tx + ty) % 4 < 2;
            const c = warpOn ? warp[tx % warp.length] : weftC;
            const shade = 0.84 + 0.2 * Math.sin((warpOn ? fx - tx : wy) * Math.PI);
            const o = (y * out + x) * 4;
            d[o] = c[0] * shade; d[o + 1] = c[1] * shade; d[o + 2] = c[2] * shade; d[o + 3] = 255;
          }
        }
      });
    },
    ply() {},
  });

  // 5.2 Quilt ----------------------------------------------------------------------
  reg({
    code: '5.2', id: 'quilt', name: 'Quilt', retained: true,
    blurb: 'A patchwork quilt with one block per square. The piece that visited a square most often decides its traditional block: nine-patch, flying geese, pinwheel, log cabin, Ohio star or square-in-a-square. Its fabrics are the first and last visitors’ colours, and every block is hand-stitched.',
    setup(env) { env.state.vis = Array.from({ length: 64 }, () => []); },
    ply(env, i) {
      const p = env.game.plies[i];
      env.state.vis[L.sqIdx(p.to)].push({ piece: p.piece, side: p.color, up: L.rankOf(p.to) >= L.rankOf(p.from) });
    },
    present(env) {
      const { ctx, S, pal, cell, m } = env;
      env.clear(L.mix(pal.bg, pal.fg, 0.14));
      ctx.fillStyle = pal.bg;
      ctx.fillRect(m * 0.6, m * 0.6, S - m * 1.2, S - m * 1.2);
      const g = cell * 0.07, light = L.mix(pal.bg, '#ffffff', 0.35);
      const tri = (pts, c) => { ctx.fillStyle = c; L.pathPoly(ctx, pts); ctx.fill(); };
      for (let s = 0; s < 64; s++) {
        const f = s % 8, r = Math.floor(s / 8);
        const x = m + f * cell + g / 2, y = m + (7 - r) * cell + g / 2, t = cell - g;
        const vs = env.state.vis[s];
        if (!vs.length) {
          ctx.fillStyle = L.mix(pal.bg, pal.fg, 0.06); ctx.fillRect(x, y, t, t);
          ctx.fillStyle = L.rgba(pal.fg, 0.1);
          for (let a = 1; a < 6; a++) for (let b = 1; b < 6; b++) if ((a + b) % 2) ctx.fillRect(x + (a * t) / 6, y + (b * t) / 6, t * 0.02, t * 0.02);
          continue;
        }
        const count = {};
        for (const v of vs) count[v.piece] = (count[v.piece] || 0) + 1;
        const kind = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
        const last = vs[vs.length - 1], first = vs[0];
        const c1 = env.color(last.side, last.piece), c2 = env.color(first.side, first.piece), c3 = light;
        const u = t / 3;
        switch (kind) {
          case 'p':
            for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { ctx.fillStyle = a === 1 && b === 1 ? c2 : (a + b) % 2 ? c3 : c1; ctx.fillRect(x + a * u, y + b * u, u + 0.5, u + 0.5); }
            break;
          case 'n': {
            ctx.fillStyle = c3; ctx.fillRect(x, y, t, t);
            for (let k = 0; k < 2; k++) {
              const y0 = y + (k * t) / 2, y1 = y0 + t / 2;
              tri(last.up ? [[x, y1], [x + t / 2, y0], [x + t, y1]] : [[x, y0], [x + t / 2, y1], [x + t, y0]], k ? c2 : c1);
            }
            break;
          }
          case 'b': {
            const h = t / 2;
            [[x, y], [x + h, y], [x + h, y + h], [x, y + h]].forEach(([qx, qy], k) => {
              ctx.fillStyle = c3; ctx.fillRect(qx, qy, h + 0.5, h + 0.5);
              const corners = [[qx, qy], [qx + h, qy], [qx + h, qy + h], [qx, qy + h]];
              tri([corners[k], corners[(k + 1) % 4], corners[(k + 2) % 4]], k % 2 ? c2 : c1);
            });
            break;
          }
          case 'r': {
            ctx.fillStyle = c3; ctx.fillRect(x, y, t, t);
            tri([[x + t, y], [x + t, y + t], [x, y + t]], c1);
            ctx.strokeStyle = pal.bg; ctx.lineWidth = t * 0.025;
            for (let k = 1; k < 4; k++) { const o = (k * t) / 8; ctx.strokeRect(x + o, y + o, t - 2 * o, t - 2 * o); }
            ctx.fillStyle = c2; ctx.fillRect(x + t * 0.4, y + t * 0.4, t * 0.2, t * 0.2);
            break;
          }
          case 'q': {
            ctx.fillStyle = c3; ctx.fillRect(x, y, t, t);
            ctx.fillStyle = c1; ctx.fillRect(x + u, y + u, u, u);
            const pts = [[[x + u, y + u], [x + 2 * u, y + u], [x + 1.5 * u, y]], [[x + 2 * u, y + u], [x + 2 * u, y + 2 * u], [x + 3 * u, y + 1.5 * u]], [[x + u, y + 2 * u], [x + 2 * u, y + 2 * u], [x + 1.5 * u, y + 3 * u]], [[x + u, y + u], [x + u, y + 2 * u], [x, y + 1.5 * u]]];
            pts.forEach(pp => tri(pp, c2));
            break;
          }
          default: {
            ctx.fillStyle = c3; ctx.fillRect(x, y, t, t);
            tri([[x + t / 2, y], [x + t, y + t / 2], [x + t / 2, y + t], [x, y + t / 2]], c1);
            ctx.fillStyle = c2; ctx.fillRect(x + t * 0.3, y + t * 0.3, t * 0.4, t * 0.4);
          }
        }
        ctx.strokeStyle = L.rgba(pal.fg, 0.35);
        ctx.lineWidth = Math.max(0.6, t * 0.012);
        ctx.setLineDash([t * 0.045, t * 0.035]);
        ctx.strokeRect(x + t * 0.045, y + t * 0.045, t * 0.91, t * 0.91);
        ctx.setLineDash([]);
      }
      // a faint weave over the whole quilt
      ctx.strokeStyle = L.rgba(pal.fg, 0.035);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = -S; k < S; k += Math.max(3, S / 220)) { ctx.moveTo(k, 0); ctx.lineTo(k + S, S); }
      ctx.stroke();
    },
  });

  // 5.3 Mosaic ----------------------------------------------------------------------
  function tileLine(env, u0, v0, colorFn, size) {
    const st = env.state.mos;
    const { cs, on, cells } = st;
    const key = (u, v) => { const x = Math.floor((u + 1) / cs), y = Math.floor((v + 1) / cs); return x < 0 || y < 0 || x >= on || y >= on ? -1 : y * on + x; };
    const ok = (u, v) => {
      const c = key(u, v);
      if (c < 0) return false;
      const x = c % on, y = (c / on) | 0;
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
        if (xx < 0 || yy < 0 || xx >= on || yy >= on) continue;
        const q = cells[yy * on + xx];
        if (q && (q[0] - u) ** 2 + (q[1] - v) ** 2 < (size * 0.92) ** 2) return false;
      }
      return true;
    };
    const place = (u, v, ang) => {
      const c = key(u, v);
      cells[c] = [u, v];
      const { ctx, cell, rng } = env;
      const s = (size * 0.44) * cell, x = L.px(env, u), y = L.px(env, v), j = () => (rng() - 0.5) * s * 0.16;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = L.rgbStr(colorFn());
      ctx.beginPath(); ctx.moveTo(-s + j(), -s + j()); ctx.lineTo(s + j(), -s + j()); ctx.lineTo(s + j(), s + j()); ctx.lineTo(-s + j(), s + j()); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    if (!ok(u0, v0)) return;
    const a0 = Math.atan2(...L.fieldAt(env, u0, v0).reverse());
    place(u0, v0, a0);
    for (const dir of [1, -1]) {
      let u = u0, v = v0;
      for (let s = 0; s < 60; s++) {
        const [vx, vy] = L.fieldAt(env, u, v), a = Math.atan2(vy, vx);
        u += Math.cos(a) * size * dir; v += Math.sin(a) * size * dir;
        if (u < -0.95 || u > 8.95 || v < -0.95 || v > 8.95 || !ok(u, v)) break;
        place(u, v, a);
      }
    }
  }
  reg({
    code: '5.3', id: 'mosaic', name: 'Mosaic',
    blurb: 'Roman mosaic in the opus vermiculatum manner, where rows of small tiles follow the contours of the design. Here the rows follow the game’s current: each move lays a run of tesserae in its colour, and plain tiles fill the background at the end.',
    setup(env) {
      L.buildField(env);
      const { ctx, S, pal } = env;
      ctx.fillStyle = L.mix(pal.bg, pal.fg, 0.28);
      ctx.fillRect(0, 0, S, S);
      const cs = 0.13, on = Math.ceil(10 / cs);
      env.state.mos = { cs, on, cells: new Array(on * on) };
    },
    ply(env, i) {
      for (const st of L.plyStrokes(env, i, 4, 1.4)) {
        const base = L.hexRgb(st.color);
        tileLine(env, st.seed[0], st.seed[1], () => L.jitterRgb(env, base, 0.22), 0.13);
      }
    },
    finish(env) {
      const { pal, gauss } = env;
      const ground = L.hexRgb(L.mix(pal.bg, pal.fg, 0.05));
      for (let v = -0.9; v < 8.9; v += 0.13) for (let u = -0.9; u < 8.9; u += 0.13) tileLine(env, u + gauss() * 0.02, v + gauss() * 0.02, () => L.jitterRgb(env, ground, 0.1), 0.13);
      L.finishHalo(env);
    },
  });

  // 5.4 Truchet -----------------------------------------------------------------------
  reg({
    code: '5.4', id: 'truchet', name: 'Truchet', retained: true,
    blurb: 'Truchet tiles: every tile carries two quarter-circle arcs, and turning a tile reroutes the paths that wind across the board. Each square holds 3 × 3 tiles in the colour of the last piece to land there, and every arrival turns its tiles.',
    setup(env) { env.state.last = new Array(64).fill(null); },
    ply(env, i) { const p = env.game.plies[i]; env.state.last[L.sqIdx(p.to)] = { c: L.moverColor(env, p), i }; },
    present(env) {
      const { ctx, S, pal, m, cell } = env;
      env.clear(pal.bg);
      const N = 27, t = S / N, neutral = L.mix(pal.bg, pal.fg, 0.16);
      ctx.lineCap = 'butt';
      for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
        const x = tx * t, y = ty * t;
        const f = Math.floor((x + t / 2 - m) / cell), r = 7 - Math.floor((y + t / 2 - m) / cell);
        const last = f >= 0 && f < 8 && r >= 0 && r < 8 ? env.state.last[r * 8 + f] : null;
        const bit = (L.h01(tx + ':' + ty) + (last ? last.i * 0.618 : 0)) % 1 < 0.5;
        const c = last ? last.c : neutral;
        for (const [w, col] of [[t * 0.3, c], [t * 0.07, last ? L.mix(c, '#ffffff', 0.45) : L.mix(neutral, pal.bg, 0.4)]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath();
          if (bit) { ctx.arc(x, y, t / 2, 0, Math.PI / 2); ctx.moveTo(x + t / 2, y + t); ctx.arc(x + t, y + t, t / 2, Math.PI, Math.PI * 1.5); }
          else { ctx.arc(x + t, y, t / 2, Math.PI / 2, Math.PI); ctx.moveTo(x + t, y + t / 2); ctx.arc(x, y + t, t / 2, -Math.PI / 2, 0); }
          ctx.stroke();
        }
      }
    },
  });

  // 5.5 Cross-Stitch ----------------------------------------------------------------
  reg({
    code: '5.5', id: 'crossstitch', name: 'Cross-Stitch', retained: true,
    blurb: 'An embroidered sampler on Aida cloth. Thread colours are painted along every move and pooled where pieces landed, then matched to the palette’s threads and stitched as crosses. Captured pieces leave their own colour behind.',
    setup(env) { const n = 56; env.state.cs = { n, r: new Float32Array(n * n), g: new Float32Array(n * n), b: new Float32Array(n * n), w: new Float32Array(n * n) }; },
    add(env, sq, rgb, sigmaUnits, val) {
      const st = env.state.cs, n = st.n, sc = (env.cell / env.S) * n;
      const [u, v] = L.bu(sq);
      this.addAt(env, u, v, rgb, sigmaUnits * sc, val);
      void n;
    },
    addAt(env, u, v, rgb, sigma, val) {
      const st = env.state.cs, n = st.n;
      const gx = ((env.m + u * env.cell) / env.S) * n - 0.5, gy = ((env.m + v * env.cell) / env.S) * n - 0.5, R = Math.ceil(sigma * 2.5);
      for (let y = Math.max(0, Math.floor(gy - R)); y <= Math.min(n - 1, Math.ceil(gy + R)); y++) {
        for (let x = Math.max(0, Math.floor(gx - R)); x <= Math.min(n - 1, Math.ceil(gx + R)); x++) {
          const k = val * Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / (2 * sigma * sigma)), i = y * n + x;
          st.r[i] += rgb[0] * k; st.g[i] += rgb[1] * k; st.b[i] += rgb[2] * k; st.w[i] += k;
        }
      }
    },
    ply(env, i) {
      const p = env.game.plies[i], w = W[p.piece], rgb = L.hexRgb(L.moverColor(env, p));
      const n = env.state.cs.n, sc = (env.cell / env.S) * n;
      const [ax, ay] = L.bu(p.from), [bx, by] = L.bu(p.to), steps = Math.max(2, L.steps(p) * 2);
      for (let k = 0; k <= steps; k++) { const t = k / steps; this.addAt(env, ax + (bx - ax) * t, ay + (by - ay) * t, rgb, sc * 0.2, 0.5 + (i / env.game.plies.length) * 0.5); }
      this.add(env, p.to, rgb, 0.42 + w * 0.02, 1 + i / env.game.plies.length);
      if (p.captured) this.add(env, p.to, L.hexRgb(L.victimColor(env, p)), 0.3, 2.5);
    },
    present(env) {
      const { ctx, S, pal } = env;
      env.clear(pal.bg);
      const st = env.state.cs, n = st.n, s = S / n;
      ctx.fillStyle = L.rgba(pal.fg, 0.1);
      for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) ctx.fillRect(x * s - s * 0.06, y * s - s * 0.06, s * 0.12, s * 0.12);
      const threads = [...pal.w, ...pal.b, pal.accent].map(L.hexRgb);
      ctx.lineCap = 'round';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (st.w[i] < 0.35) continue;
        const c = [st.r[i] / st.w[i], st.g[i] / st.w[i], st.b[i] / st.w[i]];
        let best = threads[0], bd = Infinity;
        for (const t of threads) { const d = (t[0] - c[0]) ** 2 + (t[1] - c[1]) ** 2 + (t[2] - c[2]) ** 2; if (d < bd) { bd = d; best = t; } }
        const x0 = x * s + s * 0.16, y0 = y * s + s * 0.16, x1 = x * s + s * 0.84, y1 = y * s + s * 0.84;
        ctx.lineWidth = s * 0.3;
        ctx.strokeStyle = L.rgbStr(L.mixRgb(best, [0, 0, 0], 0.18));
        ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y0); ctx.stroke();
        ctx.strokeStyle = L.rgbStr(best);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.lineWidth = s * 0.07;
        ctx.strokeStyle = L.rgbStr(L.mixRgb(best, L.WHITE, 0.4), 0.7);
        ctx.beginPath(); ctx.moveTo(x0 + s * 0.08, y0); ctx.lineTo(x1, y1 - s * 0.08); ctx.stroke();
      }
    },
  });

  // 5.6 Stained Glass ---------------------------------------------------------------
  reg({
    code: '5.6', id: 'glass', name: 'Stained Glass', retained: true,
    blurb: 'A leaded window. Every move sets a pane of glass where the piece landed, and long moves add a second pane along the way. Captures add a pane in the captured piece’s colour. The panes are Voronoi cells, glowing at the centre and bound by dark lead.',
    setup(env) {
      const { S, pal } = env;
      const r = L.prng(99 + env.variation * 7919), seeds = [];
      const tints = [pal.w[2], pal.b[2], pal.w[4], pal.b[4]];
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        seeds.push({ x: ((x + 0.5 + (r() - 0.5) * 0.8) / 7) * S, y: ((y + 0.5 + (r() - 0.5) * 0.8) / 7) * S, c: L.mix(L.mix(pal.bg, pal.fg, 0.08), tints[(x + y) % 4], 0.18) });
      }
      env.state.seeds = seeds;
    },
    ply(env, i) {
      const { game, gauss, cell } = env;
      const p = game.plies[i];
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      env.state.seeds.push({ x: bx + gauss() * cell * 0.28, y: by + gauss() * cell * 0.28, c: L.moverColor(env, p) });
      if (L.steps(p) >= 3) env.state.seeds.push({ x: (ax + bx) / 2 + gauss() * cell * 0.2, y: (ay + by) / 2 + gauss() * cell * 0.2, c: L.mix(L.moverColor(env, p), env.pal.bg, 0.3) });
      if (p.captured) env.state.seeds.push({ x: bx + gauss() * cell * 0.35, y: by + gauss() * cell * 0.35, c: L.victimColor(env, p) });
    },
    present(env) {
      const { ctx, S, pal } = env;
      const seeds = env.state.seeds;
      const cells = L.voronoi(seeds.map(s => [s.x, s.y]), 0, 0, S, S);
      const lead = L.mix(L.night(env), '#000000', 0.35);
      env.clear(lead);
      cells.forEach((poly, k) => {
        if (poly.length < 3) return;
        const s = seeds[k];
        const R = Math.sqrt(L.polyArea(poly)) * 0.8;
        const g = ctx.createRadialGradient(s.x - R * 0.2, s.y - R * 0.25, 0, s.x, s.y, R);
        g.addColorStop(0, L.mix(s.c, '#ffffff', 0.35));
        g.addColorStop(0.6, s.c);
        g.addColorStop(1, L.mix(s.c, '#000000', 0.25));
        ctx.fillStyle = g;
        L.pathPoly(ctx, poly); ctx.fill();
      });
      ctx.strokeStyle = lead; ctx.lineJoin = 'round'; ctx.lineWidth = S * 0.0065;
      cells.forEach((poly) => { if (poly.length >= 3) { L.pathPoly(ctx, poly); ctx.stroke(); } });
      ctx.strokeStyle = L.rgba('#ffffff', 0.1); ctx.lineWidth = S * 0.0015;
      cells.forEach((poly) => { if (poly.length >= 3) { L.pathPoly(ctx, L.shrinkPoly(poly, S * 0.004)); ctx.stroke(); } });
      const glow = ctx.createLinearGradient(0, 0, S, S);
      glow.addColorStop(0, 'rgba(255,255,255,0.10)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = lead; ctx.lineWidth = S * 0.02; ctx.strokeRect(0, 0, S, S);
    },
  });
})();
