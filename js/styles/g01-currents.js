/* Group 1 — Currents. Every move pushes a current along its path and swirls it
 * (clockwise for White, anticlockwise for Black); these styles draw that one
 * shared field in different ways. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  function strokeUV(env, pts, color, alpha, width) {
    const { ctx } = env;
    ctx.strokeStyle = L.rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([u, v], k) => (k ? ctx.lineTo(L.px(env, u), L.px(env, v)) : ctx.moveTo(L.px(env, u), L.px(env, v))));
    ctx.stroke();
  }

  // 1.1 Flow ---------------------------------------------------------------------
  reg({
    code: '1.1', id: 'flow', name: 'Flow',
    blurb: 'Pure line. Particles released along every move trace the current that the whole game creates. White swirls one way, Black the other.',
    setup(env) { L.buildField(env); },
    ply(env, i) {
      const { S, pal, rng } = env;
      for (const st of L.plyStrokes(env, i, 10, 5)) {
        const pts = L.trace(env, st.seed[0], st.seed[1], st.kind === 'move' ? 50 + rng() * 90 : 30 + rng() * 60);
        strokeUV(env, pts, st.color, pal.alpha * (st.kind === 'capture' ? 1.1 : 0.9), S * (st.kind === 'capture' ? 0.0016 : 0.001 * (1 + st.w * 0.12)));
      }
    },
    finish: L.finishHalo,
  });

  // 1.2 Silk ---------------------------------------------------------------------
  function ribbon(env, pts, width, color, alpha) {
    const { ctx } = env;
    const n = pts.length;
    if (n < 4) return;
    const P = pts.map(([u, v]) => [L.px(env, u), L.px(env, v)]);
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const t = i / (n - 1);
      const w = width * Math.pow(Math.sin(Math.PI * t), 0.85) * (0.85 + 0.15 * Math.sin(t * 9));
      left.push([P[i][0] - ty * w, P[i][1] + tx * w]);
      right.push([P[i][0] + ty * w, P[i][1] - tx * w]);
    }
    const fill = (pa, pb, c, a) => {
      ctx.fillStyle = L.rgbStr(c, a);
      ctx.beginPath();
      ctx.moveTo(pa[0][0], pa[0][1]);
      for (const q of pa) ctx.lineTo(q[0], q[1]);
      for (let i = pb.length - 1; i >= 0; i--) ctx.lineTo(pb[i][0], pb[i][1]);
      ctx.closePath();
      ctx.fill();
    };
    const rgb = L.hexRgb(color);
    fill(left, right, rgb, alpha);
    const mid = P.map((p, i) => [p[0] * 0.55 + left[i][0] * 0.45, p[1] * 0.55 + left[i][1] * 0.45]);
    fill(mid, P, L.mixRgb(rgb, L.WHITE, 0.45), alpha * 0.7);
  }

  reg({
    code: '1.2', id: 'silk', name: 'Silk',
    blurb: 'Translucent ribbons that taper at both ends and catch a little sheen. They follow the same current as Flow, so the moves fold over one another like fabric.',
    setup(env) { L.buildField(env); },
    ply(env, i) {
      const { S, pal, rng } = env;
      for (const st of L.plyStrokes(env, i, 3, 0.8)) {
        const pts = L.trace(env, st.seed[0], st.seed[1], 70 + rng() * 100, 0.05);
        const width = S * 0.005 * (1 + st.w * 0.2) * (0.55 + rng() * 0.8) * (st.kind === 'check' ? 0.6 : 1);
        ribbon(env, pts, width, st.color, pal.alpha * (st.kind === 'capture' ? 0.7 : 0.5));
      }
    },
    finish: L.finishHalo,
  });

  // 1.3 Pointillist ----------------------------------------------------------------
  reg({
    code: '1.3', id: 'dots', name: 'Pointillist',
    blurb: 'The current drawn as dots, Seurat-style. Dots swell in the middle of each stream and shrink toward its ends, with small shifts in tone so the colours shimmer.',
    setup(env) { L.buildField(env); },
    ply(env, i) {
      const { ctx, S, pal, rng } = env;
      const ground = L.hexRgb(pal.bg);
      for (const st of L.plyStrokes(env, i, 6, 2.5)) {
        const pts = L.trace(env, st.seed[0], st.seed[1], 50 + rng() * 80, 0.05);
        const base = L.hexRgb(st.color);
        const n = pts.length;
        for (let k = 0; k < n; k += 3) {
          const t = k / Math.max(1, n - 1);
          const r = S * 0.0026 * (1 + st.w * 0.1) * (0.35 + 0.9 * Math.sin(Math.PI * t)) * (st.kind === 'capture' ? 1.3 : 1);
          ctx.fillStyle = L.rgbStr(L.mixRgb(base, rng() < 0.5 ? L.WHITE : ground, rng() * 0.28), pal.dark ? 0.7 : 0.8);
          const [u, v] = pts[k];
          ctx.beginPath();
          ctx.arc(L.px(env, u) + env.gauss() * S * 0.0008, L.px(env, v) + env.gauss() * S * 0.0008, r, 0, L.TAU);
          ctx.fill();
        }
      }
    },
    finish: L.finishHalo,
  });

  // 1.4 Smoke --------------------------------------------------------------------
  reg({
    code: '1.4', id: 'smoke', name: 'Smoke',
    blurb: 'Long, slow plumes that drift and thicken into haze the further they travel. On dark palettes it reads as smoke; on light ones, as ink dropped into water.',
    setup(env) { L.buildField(env); },
    ply(env, i) {
      const { S, rng, noise } = env;
      for (const st of L.plyStrokes(env, i, 4, 1.4)) {
        const raw = L.trace(env, st.seed[0], st.seed[1], 150 + rng() * 170, 0.035);
        const mid = raw.length / 2 || 1;
        const pts = raw.map(([u, v], k) => {
          const t = Math.abs(k - mid) / mid;
          const a = noise(u * 1.3 + i * 0.07, v * 1.3) * L.TAU;
          return [u + Math.cos(a) * t * 0.35, v + Math.sin(a) * t * 0.35];
        });
        strokeUV(env, pts, st.color, 0.025, S * 0.016);
        strokeUV(env, pts, st.color, 0.05, S * 0.005);
        strokeUV(env, pts, st.color, st.kind === 'capture' ? 0.32 : 0.22, S * 0.001);
      }
    },
    finish: L.finishHalo,
  });

  // 1.5 Wind Map -----------------------------------------------------------------
  // Evenly spaced streamlines (each new line stops before it gets too close to
  // an existing one), tapered like arrows pointing downstream.
  function windLine(env, u0, v0, color, alpha, width, maxSteps) {
    const st = env.state.wind;
    const { occ, on, cs } = st;
    const cellOf = (u, v) => {
      const x = Math.floor((u + 1) / cs), y = Math.floor((v + 1) / cs);
      return x < 0 || y < 0 || x >= on || y >= on ? -1 : y * on + x;
    };
    const free = (u, v) => {
      const c = cellOf(u, v);
      if (c < 0) return false;
      const x = c % on, y = (c / on) | 0;
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
        if (xx >= 0 && yy >= 0 && xx < on && yy < on && occ[yy * on + xx]) return false;
      }
      return true;
    };
    if (!free(u0, v0)) return;
    const fwd = [], back = [];
    for (const dir of [1, -1]) {
      let x = u0, y = v0;
      const out = dir === 1 ? fwd : back;
      for (let s = 0; s < maxSteps; s++) {
        const [vx, vy] = L.fieldAt(env, x, y);
        const a = Math.atan2(vy, vx);
        x += Math.cos(a) * 0.04 * dir;
        y += Math.sin(a) * 0.04 * dir;
        if (x < -0.95 || x > 8.95 || y < -0.95 || y > 8.95 || !free(x, y)) break;
        out.push([x, y]);
      }
    }
    const pts = back.reverse().concat([[u0, v0]], fwd);
    if (pts.length < 8) return;
    for (const [x, y] of pts) { const c = cellOf(x, y); if (c >= 0) occ[c] = 1; }
    const { ctx } = env;
    ctx.strokeStyle = L.rgba(color, alpha);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const chunks = 6, n = pts.length;
    for (let c = 0; c < chunks; c++) {
      const a = Math.floor((c * (n - 1)) / chunks), b = Math.floor(((c + 1) * (n - 1)) / chunks);
      ctx.lineWidth = width * (0.2 + 0.8 * ((c + 1) / chunks));
      ctx.beginPath();
      for (let k = a; k <= b; k++) { const x = L.px(env, pts[k][0]), y = L.px(env, pts[k][1]); k === a ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }

  reg({
    code: '1.5', id: 'wind', name: 'Wind Map',
    blurb: 'The current as a weather map. Streamlines are evenly spaced and taper like arrows pointing downstream. Lines start near each move in its colour, and quiet grey lines fill the calm air.',
    setup(env) {
      L.buildField(env);
      const cs = 0.07; // occupancy cell, board units (line spacing ≈ 2 cells)
      const on = Math.ceil(10 / cs);
      env.state.wind = { cs, on, occ: new Uint8Array(on * on) };
    },
    ply(env, i) {
      const { S, rng } = env;
      for (const st of L.plyStrokes(env, i, 4, 1.5)) {
        windLine(env, st.seed[0], st.seed[1], st.color, 0.9, S * 0.0026 * (1 + st.w * 0.05), 70 + rng() * 60);
      }
    },
    finish(env) {
      const { S, pal, gauss } = env;
      const calm = L.mix(pal.bg, pal.fg, 0.33);
      for (let v = -0.9; v < 8.9; v += 0.16) for (let u = -0.9; u < 8.9; u += 0.16) {
        windLine(env, u + gauss() * 0.04, v + gauss() * 0.04, calm, 0.75, S * 0.0018, 60);
      }
      L.finishHalo(env);
    },
  });

  // 1.6 Brushwork ------------------------------------------------------------------
  function dash(env, u, v, rgb, len, width, alpha = 1) {
    const { ctx } = env;
    const [vx, vy] = L.fieldAt(env, u, v);
    const a = Math.atan2(vy, vx);
    const c = (Math.cos(a) * len) / 2, s = (Math.sin(a) * len) / 2;
    const x0 = L.px(env, u - c), y0 = L.px(env, v - s), x1 = L.px(env, u + c), y1 = L.px(env, v + s);
    const w = width * env.cell;
    ctx.lineCap = 'round';
    ctx.strokeStyle = L.rgbStr(rgb, alpha);
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    // a lighter ridge along one side, where thick paint catches the light
    const ox = -Math.sin(a) * w * 0.22, oy = Math.cos(a) * w * 0.22;
    ctx.strokeStyle = L.rgbStr(L.mixRgb(rgb, L.WHITE, 0.35), alpha * 0.55);
    ctx.lineWidth = w * 0.3;
    ctx.beginPath(); ctx.moveTo(x0 - ox, y0 - oy); ctx.lineTo(x1 - ox, y1 - oy); ctx.stroke();
  }

  reg({
    code: '1.6', id: 'brushwork', name: 'Brushwork',
    blurb: 'Short, thick dabs of paint that follow the current, in the spirit of post-impressionist skies. A quiet ground is laid first, then every move adds a cluster of bright strokes.',
    setup(env) {
      L.buildField(env);
      const { pal, rng, gauss, noise } = env;
      const bg = L.hexRgb(pal.bg);
      const tints = [pal.w[2], pal.b[2], pal.w[4], pal.b[4]].map(L.hexRgb);
      for (let v = -0.9; v < 8.95; v += 0.2) {
        for (let u = -0.9; u < 8.95; u += 0.2) {
          const k = Math.max(0, Math.min(3, Math.floor((noise(u * 0.3 + 5, v * 0.3) * 0.5 + 0.5) * 4)));
          dash(env, u + gauss() * 0.06, v + gauss() * 0.06, L.mixRgb(bg, tints[k], 0.12 + rng() * 0.14), 0.26 + rng() * 0.12, 0.07);
        }
      }
    },
    ply(env, i) {
      const { rng, gauss } = env;
      for (const st of L.plyStrokes(env, i, 14, 6)) {
        const rgb = L.jitterRgb(env, L.hexRgb(st.color), 0.22);
        dash(env, st.seed[0] + gauss() * 0.15, st.seed[1] + gauss() * 0.15, rgb, 0.22 + rng() * 0.22, 0.065 * (1 + st.w * 0.03));
      }
    },
    finish: L.finishHalo,
  });
})();
