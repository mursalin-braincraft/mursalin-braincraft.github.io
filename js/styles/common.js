/* The style registry (numbered groups) and the shared toolkit every style uses.
 *
 * A style is an object registered with a stable code such as "2.4":
 *   { code, id, name, blurb,
 *     setup(env), ply(env, i), finish(env)?,     // draw as the game is replayed
 *     present(env, final)?, retained?,           // or redraw everything from state
 *     heavy?, grain? }
 * Coordinates: board units u,v run 0…8 (a8 at the top-left); L.px maps them to
 * canvas pixels inside the artwork, whose side is env.S. */
window.CM = window.CM || {};
CM.art = CM.art || {};

(function () {
  const { WEIGHT, PIECE_INDEX } = CM.art;

  // ---- registry ---------------------------------------------------------------
  CM.art.GROUPS = [
    { n: 1, name: 'Currents', blurb: 'The whole game becomes one flowing current, drawn in different media.' },
    { n: 2, name: 'Fluid & Paint', blurb: 'Wet media: oil, marbling, watercolour, ink, poured paint and the palette knife.' },
    { n: 3, name: 'Geometric & Modern', blurb: 'Twentieth-century abstraction: grids, shapes, stripes and fields of colour.' },
    { n: 4, name: 'Line & Thread', blurb: 'Pure linework: string art, ridgelines, contour maps, rosettes, engraving and star charts.' },
    { n: 5, name: 'Pattern & Textile', blurb: 'Crafts and repeats: tartan, quilts, mosaic, tiles, cross-stitch and stained glass.' },
    { n: 6, name: 'Light & Cosmos', blurb: 'Night skies: nebulae, light painting, fireworks, bokeh, aurora and orbits.' },
    { n: 7, name: 'Nature & Organic', blurb: 'Things that grow: vines, cells, lichen, Turing patterns, gardens and landscapes.' },
    { n: 8, name: 'Print & Graphic', blurb: 'Printmaking and graphic design: risograph, halftone, linocut, pop art, blueprints and cut-outs.' },
    { n: 9, name: 'Diagram & Data', blurb: 'The game as an information graphic: chords, arcs, heatmaps, barcodes, clocks and a metro map.' },
    { n: 10, name: 'Type & Digital', blurb: 'Letters and pixels: ASCII, typography, 8-bit, glitch and circuit boards.' },
  ];
  CM.art.STYLES = {};
  CM.art.STYLE_LIST = [];
  CM.art.register = function (style) {
    const [g, n] = style.code.split('.').map(Number);
    style.group = g;
    style.index = n;
    CM.art.STYLES[style.id] = style;
    CM.art.STYLE_LIST.push(style);
    CM.art.STYLE_LIST.sort((a, b) => a.group - b.group || a.index - b.index);
    return style;
  };

  const L = (CM.art.lib = {});
  L.WEIGHT = WEIGHT;
  L.TAU = Math.PI * 2;
  L.SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
  L.SANS = 'ui-sans-serif, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  L.MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // ---- board geometry -----------------------------------------------------------
  L.fileOf = (sq) => sq.charCodeAt(0) - 97;
  L.rankOf = (sq) => parseInt(sq[1], 10) - 1;
  L.sqIdx = (sq) => L.rankOf(sq) * 8 + L.fileOf(sq);
  L.sqName = (f, r) => String.fromCharCode(97 + f) + (r + 1);
  L.enemy = (c) => (c === 'w' ? 'b' : 'w');
  L.bu = (sq) => [L.fileOf(sq) + 0.5, 7 - L.rankOf(sq) + 0.5];
  L.px = (env, u) => env.m + u * env.cell;
  L.at = (env, sq) => { const [u, v] = L.bu(sq); return [env.m + u * env.cell, env.m + v * env.cell]; };
  L.steps = (p) => Math.max(Math.abs(L.fileOf(p.from) - L.fileOf(p.to)), Math.abs(L.rankOf(p.from) - L.rankOf(p.to)));
  L.fenPieces = (fen) => {
    const out = [];
    fen.split(' ')[0].split('/').forEach((row, ri) => {
      let f = 0;
      for (const ch of row) {
        if (ch >= '0' && ch <= '9') { f += +ch; continue; }
        out.push({ square: L.sqName(f, 7 - ri), type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' });
        f++;
      }
    });
    return out;
  };

  // ---- deterministic randomness ---------------------------------------------------
  L.h01 = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  };
  /** A private random stream, for retained styles that redraw many times. */
  L.prng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---- colour ------------------------------------------------------------------
  L.hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  L.rgbHex = (c) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  L.mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  L.mix = (a, b, t) => L.rgbHex(L.mixRgb(L.hexRgb(a), L.hexRgb(b), t));
  L.rgba = (hex, a) => { const [r, g, b] = L.hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  L.rgbStr = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  L.luma = (hex) => { const [r, g, b] = L.hexRgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  L.WHITE = [255, 255, 255];
  /** A deep sky colour that still belongs to the palette. */
  L.night = (env) => (env.pal.dark ? env.pal.bg : L.mix(env.pal.fg, '#000000', 0.45));
  L.lightInk = (env) => (env.pal.dark ? env.pal.fg : env.pal.bg);
  L.darkInk = (env) => (env.pal.dark ? env.pal.bg : env.pal.fg);
  L.jitterRgb = (env, rgb, amt) => L.mixRgb(rgb, env.rng() < 0.5 ? L.WHITE : L.hexRgb(env.pal.bg), env.rng() * amt);
  L.moverColor = (env, p) => env.color(p.color, p.piece);
  L.victimColor = (env, p) => env.color(L.enemy(p.color), p.captured);

  // ---- the shared current (vector field built from every move) ------------------
  const D0 = -1, DSPAN = 10, G = 110; // covers board units −1 … 9, i.e. the whole canvas

  L.buildField = (env) => {
    if (env.state.field) return env.state.field;
    const { game, noise } = env;
    const fx = new Float32Array(G * G), fy = new Float32Array(G * G);
    const moves = game.plies.map((p) => {
      const [ax, ay] = L.bu(p.from), [bx, by] = L.bu(p.to);
      return { ax, ay, bx, by, w: 0.5 + WEIGHT[p.piece] * 0.15, s: p.color === 'w' ? 1 : -1 };
    });
    const mags = [];
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const px = D0 + (gx / (G - 1)) * DSPAN, py = D0 + (gy / (G - 1)) * DSPAN;
        const na = noise(px * 0.45, py * 0.45) * Math.PI * 4;
        let vx = Math.cos(na) * 0.12, vy = Math.sin(na) * 0.12;
        for (const m of moves) {
          const dx = m.bx - m.ax, dy = m.by - m.ay;
          const L2 = dx * dx + dy * dy || 1;
          let t = ((px - m.ax) * dx + (py - m.ay) * dy) / L2;
          t = Math.max(0, Math.min(1, t));
          const ox = px - (m.ax + dx * t), oy = py - (m.ay + dy * t);
          const d2 = ox * ox + oy * oy;
          const k = m.w * Math.exp(-d2 / 1.1);
          if (k < 0.002) continue;
          const len = Math.sqrt(L2);
          vx += (dx / len) * k;
          vy += (dy / len) * k;
          const d = Math.sqrt(d2) + 0.25;
          vx += (-oy / d) * k * 0.8 * m.s;
          vy += (ox / d) * k * 0.8 * m.s;
        }
        fx[gy * G + gx] = vx;
        fy[gy * G + gx] = vy;
        mags.push(Math.hypot(vx, vy));
      }
    }
    mags.sort((a, b) => a - b);
    env.state.field = { fx, fy, median: mags[mags.length >> 1] || 1 };
    return env.state.field;
  };

  L.fieldAt = (env, u, v) => {
    const { fx, fy } = env.state.field;
    const gxf = ((u - D0) / DSPAN) * (G - 1), gyf = ((v - D0) / DSPAN) * (G - 1);
    const gx = Math.max(0, Math.min(G - 2, Math.floor(gxf))), gy = Math.max(0, Math.min(G - 2, Math.floor(gyf)));
    const tx = Math.min(1, Math.max(0, gxf - gx)), ty = Math.min(1, Math.max(0, gyf - gy));
    const i = gy * G + gx;
    const l = (a) => (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - ty) + (a[i + G] * (1 - tx) + a[i + G + 1] * tx) * ty;
    return [l(fx), l(fy)];
  };

  /** Follow the current both ways from (u, v); returns points in board units. */
  L.trace = (env, u, v, steps, stepLen = 0.045) => {
    const fwd = [], back = [];
    for (const dir of [1, -1]) {
      let x = u, y = v;
      const out = dir === 1 ? fwd : back;
      for (let s = 0; s < steps / 2; s++) {
        const [vx, vy] = L.fieldAt(env, x, y);
        const a = Math.atan2(vy, vx);
        x += Math.cos(a) * stepLen * dir;
        y += Math.sin(a) * stepLen * dir;
        if (x < -0.95 || x > 8.95 || y < -0.95 || y > 8.95) break;
        out.push([x, y]);
      }
    }
    return back.reverse().concat([[u, v]], fwd);
  };

  L.seedOnMove = (env, p, spread) => {
    const [ax, ay] = L.bu(p.from), [bx, by] = L.bu(p.to);
    const t = env.rng();
    return [ax + (bx - ax) * t + env.gauss() * spread, ay + (by - ay) * t + env.gauss() * spread];
  };
  L.seedAround = (env, sq, spread) => {
    const [x, y] = L.bu(sq);
    return [x + env.gauss() * spread, y + env.gauss() * spread];
  };

  /** The common recipe for "what gets painted for this ply": seeds along the
   *  move, extra ones for castling, captures (victim's colour), checks
   *  (accent) and promotions. */
  L.plyStrokes = (env, i, base, perWeight) => {
    const p = env.game.plies[i];
    const side = p.color;
    const w = WEIGHT[p.piece];
    const out = [];
    const n = base + Math.round(w * perWeight);
    for (let s = 0; s < n; s++) out.push({ seed: L.seedOnMove(env, p, 0.3), color: env.color(side, p.piece), w, kind: 'move' });
    if (p.castle) {
      const rank = side === 'w' ? '1' : '8';
      const rf = (p.castle === 'k' ? 'h' : 'a') + rank;
      for (let s = 0; s < base + 2; s++) out.push({ seed: L.seedAround(env, rf, 0.4), color: env.color(side, 'r'), w: 5, kind: 'move' });
    }
    if (p.captured) {
      const cw = WEIGHT[p.captured];
      for (let s = 0; s < Math.round(base * 0.6 + cw * perWeight * 0.7); s++) {
        out.push({ seed: L.seedAround(env, p.to, 0.45), color: env.color(L.enemy(side), p.captured), w: cw, kind: 'capture' });
      }
    }
    if (p.check) {
      const k = env.data[i].king[L.enemy(side)];
      for (let s = 0; s < Math.max(3, Math.round(base * 0.5)); s++) out.push({ seed: L.seedAround(env, k, 0.3), color: env.pal.accent, w: 2, kind: 'check' });
    }
    if (p.promotion) {
      for (let s = 0; s < base + 3; s++) out.push({ seed: L.seedAround(env, p.to, 0.3), color: env.color(side, p.promotion), w: 9, kind: 'move' });
    }
    return out;
  };

  L.matedKing = (env) => {
    const { game, data } = env;
    if (!game.isCheckmate) return null;
    const last = game.plies[game.plies.length - 1];
    return data[data.length - 1].king[L.enemy(last.color)];
  };

  L.softHalo = (env, sq, scale = 1) => {
    const { ctx, pal } = env;
    const [x, y] = L.at(env, sq);
    const R = env.cell * 1.7 * scale;
    ctx.save();
    ctx.globalCompositeOperation = pal.dark ? 'screen' : 'source-over';
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, L.rgba(pal.accent, 0.45));
    g.addColorStop(0.5, L.rgba(pal.accent, 0.15));
    g.addColorStop(1, L.rgba(pal.accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R, 0, L.TAU); ctx.fill();
    ctx.restore();
  };
  L.finishHalo = (env) => { const k = L.matedKing(env); if (k) L.softHalo(env, k); };

  // ---- shapes & polygons -----------------------------------------------------------
  L.pathPoly = (ctx, pts, closed = true) => {
    ctx.beginPath();
    if (!pts.length) return;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  };
  L.circlePts = (x, y, R, n, rng, wobble = 0.15) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * L.TAU, r = R * (1 - wobble + rng() * wobble * 2);
      out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return out;
  };
  L.ellipsePts = (x, y, a, b, ang, n, rng, wobble = 0.15) => {
    const out = [], c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * L.TAU, k = 1 - wobble + rng() * wobble * 2;
      const ex = Math.cos(t) * a * k, ey = Math.sin(t) * b * k;
      out.push([x + ex * c - ey * s, y + ex * s + ey * c]);
    }
    return out;
  };
  /** Recursive midpoint displacement (the watercolour polygon trick). */
  L.deform = (pts, depth, variance, gauss) => {
    let v = variance;
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        next.push(a);
        next.push([(a[0] + b[0]) / 2 + gauss() * v, (a[1] + b[1]) / 2 + gauss() * v]);
      }
      pts = next;
      v *= 0.55;
    }
    return pts;
  };
  /** A watercolour wash: many translucent, slightly different deformations. */
  L.wash = (env, base, color, layers, alpha, R) => {
    const { ctx, gauss } = env;
    const b = L.deform(base, 2, R * 0.28, gauss);
    ctx.fillStyle = L.rgba(color, alpha);
    for (let l = 0; l < layers; l++) {
      L.pathPoly(ctx, L.deform(b, 3, R * 0.18, gauss));
      ctx.fill();
    }
  };
  L.centroid = (pts) => {
    let x = 0, y = 0;
    for (const p of pts) { x += p[0]; y += p[1]; }
    return [x / pts.length, y / pts.length];
  };
  L.polyArea = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(a) / 2;
  };
  /** Move every vertex toward the centroid by d pixels. */
  L.shrinkPoly = (pts, d) => {
    const [cx, cy] = L.centroid(pts);
    return pts.map(([x, y]) => { const dx = cx - x, dy = cy - y, l = Math.hypot(dx, dy) || 1; const k = Math.min(d, l * 0.9) / l; return [x + dx * k, y + dy * k]; });
  };
  L.chaikin = (pts, iters = 2) => {
    for (let k = 0; k < iters; k++) {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      pts = out;
    }
    return pts;
  };
  /** Keep the part of a convex polygon where nx*x + ny*y <= c. */
  L.clipPoly = (poly, nx, ny, c) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
      if (da <= 0) out.push(a);
      if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  };
  /** Voronoi cells by half-plane clipping (fine for a few hundred seeds). */
  L.voronoi = (pts, x0, y0, x1, y1) => pts.map((p, i) => {
    let poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const others = [];
    for (let j = 0; j < pts.length; j++) if (j !== i) others.push([(pts[j][0] - p[0]) ** 2 + (pts[j][1] - p[1]) ** 2, j]);
    others.sort((a, b) => a[0] - b[0]);
    let maxR2 = Infinity;
    for (const [d2, j] of others) {
      if (d2 > 4 * maxR2) break;
      if (d2 < 1e-9) continue;
      const q = pts[j];
      const nx = q[0] - p[0], ny = q[1] - p[1];
      poly = L.clipPoly(poly, nx, ny, (q[0] * q[0] + q[1] * q[1] - p[0] * p[0] - p[1] * p[1]) / 2);
      if (!poly.length) break;
      maxR2 = 0;
      for (const v of poly) maxR2 = Math.max(maxR2, (v[0] - p[0]) ** 2 + (v[1] - p[1]) ** 2);
    }
    return poly;
  });
  /** Offset a polyline sideways by d (with mitred joins). */
  L.offsetPolyline = (pts, d) => {
    const n = pts.length;
    if (n < 2 || !d) return pts.slice();
    const out = [];
    const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    for (let i = 0; i < n; i++) {
      const n1 = i > 0 ? nrm(pts[i - 1], pts[i]) : null, n2 = i < n - 1 ? nrm(pts[i], pts[i + 1]) : null;
      let nx, ny, k = 1;
      if (n1 && n2) {
        nx = n1[0] + n2[0]; ny = n1[1] + n2[1];
        const l = Math.hypot(nx, ny);
        if (l < 1e-6) { nx = n1[0]; ny = n1[1]; } else { nx /= l; ny /= l; k = 1 / Math.max(0.4, nx * n1[0] + ny * n1[1]); }
      } else { [nx, ny] = n1 || n2; }
      out.push([pts[i][0] + nx * d * k, pts[i][1] + ny * d * k]);
    }
    return out;
  };
  /** Points along a quadratic curve from A to B that bows sideways by `bow` px. */
  L.bowPts = (A, B, bow, n = 24) => {
    const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1;
    const cx = (A[0] + B[0]) / 2 - (dy / d) * bow, cy = (A[1] + B[1]) / 2 + (dx / d) * bow;
    const out = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, it = 1 - t;
      out.push([it * it * A[0] + 2 * it * t * cx + t * t * B[0], it * it * A[1] + 2 * it * t * cy + t * t * B[1]]);
    }
    return out;
  };

  // ---- scalar grids over the artwork -------------------------------------------
  L.grid = (n) => ({ n, a: new Float32Array(n * n) });
  L.gscale = (env, g) => (env.cell / env.S) * g.n; // grid cells per board unit
  L.gpos = (env, g, u, v) => [((env.m + u * env.cell) / env.S) * g.n - 0.5, ((env.m + v * env.cell) / env.S) * g.n - 0.5];
  L.gposSq = (env, g, sq) => { const [u, v] = L.bu(sq); return L.gpos(env, g, u, v); };
  L.splat = (g, gx, gy, sigma, val) => {
    const n = g.n, a = g.a, R = Math.ceil(sigma * 2.6);
    const x0 = Math.max(0, Math.floor(gx - R)), x1 = Math.min(n - 1, Math.ceil(gx + R));
    const y0 = Math.max(0, Math.floor(gy - R)), y1 = Math.min(n - 1, Math.ceil(gy + R));
    const k = 1 / (2 * sigma * sigma);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a[y * n + x] += val * Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) * k);
  };
  /** Splat along a move's path (in board units) as well as at its landing square. */
  L.splatMove = (env, g, p, sigmaUnits, val, along = 0.35) => {
    const sc = L.gscale(env, g);
    const [ax, ay] = L.gposSq(env, g, p.from), [bx, by] = L.gposSq(env, g, p.to);
    L.splat(g, bx, by, sigmaUnits * sc, val);
    const steps = Math.max(1, Math.round(L.steps(p) * 1.5));
    for (let k = 1; k < steps; k++) { const t = k / steps; L.splat(g, ax + (bx - ax) * t, ay + (by - ay) * t, sigmaUnits * sc * 0.6, val * along); }
  };
  L.sample = (g, gx, gy) => {
    const n = g.n;
    gx = gx < 0 ? 0 : gx > n - 1.001 ? n - 1.001 : gx;
    gy = gy < 0 ? 0 : gy > n - 1.001 ? n - 1.001 : gy;
    const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * n + ix, a = g.a;
    return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + n] * (1 - fx) + a[i + n + 1] * fx) * fy;
  };
  /** Sample a grid at artwork pixel (x, y). */
  L.sampleAt = (env, g, x, y) => L.sample(g, (x / env.S) * g.n - 0.5, (y / env.S) * g.n - 0.5);
  L.blur = (g, passes = 1) => {
    const n = g.n;
    let src = g.a, dst = new Float32Array(n * n);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          let s = 0, c = 0;
          for (let yy = Math.max(0, y - 1); yy <= Math.min(n - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(n - 1, x + 1); xx++) { s += src[yy * n + xx]; c++; }
          dst[y * n + x] = s / c;
        }
      }
      const t = src === g.a ? new Float32Array(n * n) : src;
      src = dst; dst = t;
    }
    return { n, a: src };
  };
  L.maxAbs = (g) => { let m = 1e-9; for (const v of g.a) { const a = v < 0 ? -v : v; if (a > m) m = a; } return m; };
  /** Marching squares: line segments (pairs of [x, y] in grid units) at `level`. */
  L.contours = (a, n, level) => {
    const segs = [];
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const i = y * n + x;
        const v0 = a[i], v1 = a[i + 1], v2 = a[i + n + 1], v3 = a[i + n];
        const idx = (v0 > level ? 1 : 0) | (v1 > level ? 2 : 0) | (v2 > level ? 4 : 0) | (v3 > level ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        const f = (va, vb) => (level - va) / (vb - va);
        const T = [x + f(v0, v1), y], R = [x + 1, y + f(v1, v2)], B = [x + f(v3, v2), y + 1], Lf = [x, y + f(v0, v3)];
        switch (idx) {
          case 1: case 14: segs.push(Lf, T); break;
          case 2: case 13: segs.push(T, R); break;
          case 3: case 12: segs.push(Lf, R); break;
          case 4: case 11: segs.push(R, B); break;
          case 5: segs.push(Lf, T, R, B); break;
          case 6: case 9: segs.push(T, B); break;
          case 7: case 8: segs.push(Lf, B); break;
          case 10: segs.push(T, R, B, Lf); break;
        }
      }
    }
    return segs;
  };

  // ---- pixels & offscreen canvases ---------------------------------------------
  L.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  /** Fill a w×h RGBA buffer via fill(data, w, h) and draw it over the artwork. */
  L.renderPixels = (env, w, h, fill, smooth = true) => {
    const c = L.canvas(w, h), cx = c.getContext('2d');
    const img = cx.createImageData(c.width, c.height);
    fill(img.data, c.width, c.height);
    cx.putImageData(img, 0, 0);
    L.blit(env, c, smooth);
  };
  L.blit = (env, c, smooth = true) => {
    const { ctx, S } = env;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = smooth;
    if (smooth) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, S, S);
    ctx.restore();
  };
  /** Draw `src` (a mask drawn in any colour) tinted with `color`. */
  L.tinted = (src, color) => {
    const c = L.canvas(src.width, src.height), cx = c.getContext('2d');
    cx.drawImage(src, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = color;
    cx.fillRect(0, 0, c.width, c.height);
    return c;
  };

  // ---- skies --------------------------------------------------------------------
  L.nightSky = (env, stars = 200) => {
    const { ctx, S } = env;
    const r = L.prng(77);
    const sky = L.night(env);
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, L.mix(sky, '#000000', 0.3));
    g.addColorStop(1, L.mix(sky, env.pal.accent, 0.07));
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < stars; i++) {
      const x = r() * S, y = r() * S, rad = S * (0.0004 + r() ** 3 * 0.0016);
      ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, L.TAU); ctx.fill();
    }
    ctx.restore();
  };

  CM.art.rgba = L.rgba;
})();
