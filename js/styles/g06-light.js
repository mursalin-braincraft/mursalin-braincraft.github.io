/* Group 6 — Light & Cosmos. These always render on a night sky taken from the
 * palette (its background if dark, otherwise a deep shade of its ink). */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  function glowDot(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, L.rgba(color, alpha));
    g.addColorStop(1, L.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, L.TAU); ctx.fill();
  }

  // 6.1 Nebula --------------------------------------------------------------------
  reg({
    code: '6.1', id: 'nebula', name: 'Nebula',
    blurb: 'A deep-space nebula. Every move breathes coloured gas along its path, and the piece’s landing square becomes a star that brightens with each visit. Captures ignite star clusters, and dark dust lanes drift through the busiest regions.',
    setup(env) { L.nightSky(env, 380); env.state.vis = {}; },
    ply(env, i) {
      const { ctx, game, rng, gauss, cell, S, pal } = env;
      const p = game.plies[i], w = W[p.piece], c = L.moverColor(env, p);
      ctx.globalCompositeOperation = 'screen';
      for (let k = 0; k < 4 + w; k++) {
        const [u, v] = k < 2 ? L.seedAround(env, p.to, 0.5) : L.seedOnMove(env, p, 0.45);
        glowDot(ctx, L.px(env, u), L.px(env, v), cell * (0.4 + rng() * 0.9) * (1 + w * 0.04), c, 0.075);
      }
      let [bx, by] = L.at(env, p.to);
      bx += (L.h01(p.to + 'nx') - 0.5) * cell * 0.7;
      by += (L.h01(p.to + 'ny') - 0.5) * cell * 0.7;
      const vis = (env.state.vis[p.to] = (env.state.vis[p.to] || 0) + 1);
      const r = S * 0.0016 * (1 + w * 0.12) * (1 + Math.min(6, vis) * 0.2);
      glowDot(ctx, bx, by, r * 8, L.mix(c, '#ffffff', 0.5), 0.35);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(bx, by, r, 0, L.TAU); ctx.fill();
      if (p.captured) {
        const vc = L.victimColor(env, p);
        glowDot(ctx, bx, by, cell * 1.2, vc, 0.18);
        for (let k = 0; k < 14 + W[p.captured] * 2; k++) {
          ctx.fillStyle = L.rgba(L.mix(vc, '#ffffff', 0.5), 0.6 + rng() * 0.4);
          ctx.beginPath(); ctx.arc(bx + gauss() * cell * 0.35, by + gauss() * cell * 0.35, S * (0.0006 + rng() * 0.0012), 0, L.TAU); ctx.fill();
        }
      }
      if (i % 6 === 5) {
        ctx.globalCompositeOperation = 'source-over';
        const [u, v] = L.seedOnMove(env, p, 0.6);
        glowDot(ctx, L.px(env, u), L.px(env, v), cell * (0.6 + rng() * 0.6), L.night(env), 0.35);
      }
      if (p.check) { ctx.globalCompositeOperation = 'screen'; const [kx, ky] = L.at(env, env.data[i].king[L.enemy(p.color)]); glowDot(ctx, kx, ky, cell * 0.6, pal.accent, 0.25); }
      ctx.globalCompositeOperation = 'source-over';
    },
    finish(env) {
      const k = L.matedKing(env);
      if (!k) return;
      const { ctx, cell, S, pal } = env;
      const [x, y] = L.at(env, k);
      ctx.globalCompositeOperation = 'screen';
      glowDot(ctx, x, y, cell * 1.6, pal.accent, 0.4);
      ctx.strokeStyle = L.rgba('#ffffff', 0.8); ctx.lineWidth = S * 0.0012;
      for (let a = 0; a < 4; a++) { const ang = (a / 4) * L.TAU; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * cell, y - Math.sin(ang) * cell); ctx.lineTo(x + Math.cos(ang) * cell, y + Math.sin(ang) * cell); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    },
  });

  // 6.2 Light Painting -------------------------------------------------------------
  function gesture(env, p) {
    const { cell } = env;
    const A = L.at(env, p.from), B = L.at(env, p.to);
    const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    const side = p.color === 'w' ? 1 : -1, n = 90, pts = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      let o = 0, a = 0;
      switch (p.piece) {
        case 'n': o = Math.sin(Math.PI * t) * d * 0.55 * side; break;
        case 'b': o = Math.sin(t * L.TAU * Math.max(2, (d / cell) * 1.2)) * cell * 0.13; break;
        case 'r': o = Math.tanh(Math.sin(t * L.TAU * Math.max(2, d / cell)) * 4) * cell * 0.1; break;
        case 'q': { const om = L.TAU * Math.max(3, (d / cell) * 1.4), rr = cell * 0.18; o = Math.sin(om * t) * rr; a = Math.cos(om * t) * rr; break; }
        default: break;
      }
      pts.push([A[0] + dx * t + nx * o + ux * a, A[1] + dy * t + ny * o + uy * a]);
    }
    if (p.piece === 'k') {
      for (let k = 0; k <= 60; k++) { const a = (k / 60) * L.TAU * 2; pts.push([B[0] + Math.cos(a) * cell * 0.2, B[1] + Math.sin(a) * cell * 0.2]); }
    }
    return pts;
  }
  function glowLine(env, pts, color, scale = 1, dashed = false) {
    const { ctx, cell, S } = env;
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, a, c] of [[cell * 0.22, 0.05, color], [cell * 0.07, 0.16, color], [S * 0.0018, 0.95, L.mix(color, '#ffffff', 0.6)]]) {
      ctx.strokeStyle = L.rgba(c, a); ctx.lineWidth = w * scale;
      if (dashed && a > 0.5) ctx.setLineDash([cell * 0.06, cell * 0.08]);
      L.pathPoly(ctx, pts, false); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  reg({
    code: '6.2', id: 'lightpaint', name: 'Light Painting',
    blurb: 'A long-exposure photograph of the pieces as torches, and each piece moves with its own gesture. Pawns march in dashes and knights leap in arcs. Bishops weave, rooks step in square waves, queens loop and kings circle. Captures flare like a lens.',
    setup(env) { L.nightSky(env, 120); },
    ply(env, i) {
      const { ctx, game, cell, pal, rng } = env;
      const p = game.plies[i];
      glowLine(env, gesture(env, p), L.moverColor(env, p), 1 + W[p.piece] * 0.04, p.piece === 'p');
      if (p.captured) {
        const [x, y] = L.at(env, p.to), vc = L.victimColor(env, p);
        ctx.globalCompositeOperation = 'screen';
        glowDot(ctx, x, y, cell * 0.9, vc, 0.35);
        ctx.strokeStyle = L.rgba(L.mix(vc, '#ffffff', 0.5), 0.7); ctx.lineWidth = env.S * 0.001;
        for (let k = 0; k < 8; k++) { const a = (k / 8) * L.TAU + rng() * 0.2, r = cell * (0.4 + (k % 2) * 0.35); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
        ctx.globalCompositeOperation = 'source-over';
      }
      if (p.check) {
        const [kx, ky] = L.at(env, env.data[i].king[L.enemy(p.color)]);
        const ring = []; for (let k = 0; k <= 40; k++) { const a = (k / 40) * L.TAU; ring.push([kx + Math.cos(a) * cell * 0.4, ky + Math.sin(a) * cell * 0.4]); }
        glowLine(env, ring, pal.accent, 0.8);
      }
    },
    finish: L.finishHalo,
  });

  // 6.3 Fireworks ------------------------------------------------------------------
  function burst(env, x, y, color, sparks, speed, crackle) {
    const { ctx, rng, S, cell } = env;
    ctx.globalCompositeOperation = 'screen';
    glowDot(ctx, x, y, speed * 0.5, color, 0.25);
    ctx.lineCap = 'round';
    for (let k = 0; k < sparks; k++) {
      const a = (k / sparks) * L.TAU + rng() * 0.25, v = speed * (0.7 + rng() * 0.5);
      let px = x, py = y;
      for (let s = 1; s <= 8; s++) {
        const t = s / 8, nx = x + Math.cos(a) * v * t, ny = y + Math.sin(a) * v * t + cell * 0.35 * t * t;
        ctx.strokeStyle = L.rgba(L.mix(color, '#ffffff', 0.2 * (1 - t)), 0.85 * (1 - t * 0.85));
        ctx.lineWidth = S * 0.0014 * (1.2 - t);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        px = nx; py = ny;
      }
      if (crackle) { ctx.fillStyle = L.rgba('#ffffff', 0.8); ctx.beginPath(); ctx.arc(px, py, S * 0.0012, 0, L.TAU); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  reg({
    code: '6.3', id: 'fireworks', name: 'Fireworks',
    blurb: 'A fireworks display. Each move launches a rocket from the bottom of the sky that bursts over its landing square, sized by the piece. Captures are big double-ringed shells with crackle, checks strobe around the king, and checkmate is the finale.',
    setup(env) {
      L.nightSky(env, 150);
      const { ctx, S, pal } = env;
      const g = ctx.createLinearGradient(0, S * 0.75, 0, S);
      g.addColorStop(0, L.rgba(pal.accent, 0)); g.addColorStop(1, L.rgba(pal.accent, 0.1));
      ctx.fillStyle = g; ctx.fillRect(0, S * 0.75, S, S * 0.25);
    },
    ply(env, i) {
      const { ctx, game, cell, S, gauss, pal } = env;
      const p = game.plies[i], w = W[p.piece], c = L.moverColor(env, p);
      const [bx, by] = L.at(env, p.to);
      const x0 = bx + gauss() * cell * 0.3;
      ctx.strokeStyle = L.rgba(c, 0.18); ctx.lineWidth = S * 0.0009;
      ctx.beginPath(); ctx.moveTo(x0, S); ctx.quadraticCurveTo(x0, (S + by) / 2, bx, by); ctx.stroke();
      burst(env, bx, by, c, 12 + w * 4, cell * (0.35 + w * 0.06), false);
      if (p.captured) {
        burst(env, bx, by, L.victimColor(env, p), 24 + W[p.captured] * 4, cell * (0.7 + W[p.captured] * 0.07), true);
      }
      if (p.check) {
        const [kx, ky] = L.at(env, env.data[i].king[L.enemy(p.color)]);
        ctx.globalCompositeOperation = 'screen';
        for (let k = 0; k < 16; k++) { glowDot(ctx, kx + gauss() * cell * 0.35, ky + gauss() * cell * 0.35, cell * 0.06, pal.accent, 0.8); }
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    finish(env) {
      const k = L.matedKing(env);
      if (!k) return;
      const [x, y] = L.at(env, k);
      burst(env, x, y, env.pal.accent, 60, env.cell * 1.9, true);
      burst(env, x, y, '#ffffff', 30, env.cell * 1.0, false);
    },
  });

  // 6.4 Bokeh -------------------------------------------------------------------
  reg({
    code: '6.4', id: 'bokeh', name: 'Bokeh', retained: true,
    blurb: 'The game seen through a lens with shallow focus. Each move is a disc of out-of-focus light at its landing square. The latest moves are small and sharp, and older ones drift backward, growing larger, softer and dimmer, so the game’s past dissolves into bokeh.',
    present(env) {
      const { ctx, S, game, cell } = env;
      env.clear(L.night(env));
      L.nightSky(env, 0);
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i <= env.cur; i++) {
        const p = game.plies[i], w = W[p.piece], age = env.cur - i, depth = Math.min(1, age / 18);
        const [bx, by] = L.at(env, p.to);
        const x = bx + (L.h01(i + 'bx') - 0.5) * cell * 0.7, y = by + (L.h01(i + 'by') - 0.5) * cell * 0.7;
        const r = cell * (0.2 + w * 0.05) * (1 + depth * 1.7);
        const a = 0.55 * (1 - depth * 0.62), soft = 0.15 + depth * 0.55;
        const draw = (color, rad, alpha) => {
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          g.addColorStop(0, L.rgba(color, alpha * 0.55));
          g.addColorStop(Math.max(0.05, 1 - soft), L.rgba(color, alpha * 0.85));
          g.addColorStop(1, L.rgba(color, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, L.TAU); ctx.fill();
        };
        if (p.captured) draw(L.victimColor(env, p), r * 1.35, a * 0.8);
        draw(L.moverColor(env, p), r, a);
        if (age < 3) { ctx.fillStyle = L.rgba('#ffffff', 0.7 - age * 0.2); ctx.beginPath(); ctx.arc(x, y, S * 0.0018, 0, L.TAU); ctx.fill(); }
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    ply() {},
  });

  // 6.5 Aurora --------------------------------------------------------------------
  reg({
    code: '6.5', id: 'aurora', name: 'Aurora',
    blurb: 'Northern lights over a dark horizon. Every move hangs a curtain of light in a band across the sky, above its landing square’s file and nudged up or down by its rank. Heavier pieces hang wider and taller curtains, which are brightest along the lower edge and fade upward into a second colour from the same side.',
    setup(env) {
      L.nightSky(env, 320);
      const { ctx, S, noise } = env;
      ctx.fillStyle = L.mix(L.night(env), '#000000', 0.5);
      ctx.beginPath(); ctx.moveTo(0, S);
      for (let x = 0; x <= S; x += S / 80) ctx.lineTo(x, S * 0.92 - (noise(x / S * 4, 9) * 0.5 + 0.5) * S * 0.06);
      ctx.lineTo(S, S); ctx.closePath(); ctx.fill();
    },
    ply(env, i) {
      const { ctx, game, cell, S, noise, rng } = env;
      const p = game.plies[i], w = W[p.piece];
      const [bx] = L.at(env, p.to);
      // the curtains hang in one band across the sky; the rank nudges them up or down
      const band = (x) => S * 0.6 + Math.sin((x / S) * L.TAU * 0.9 + 1.3) * S * 0.07 + noise(x / S * 3, 4) * S * 0.04;
      const span = cell * (1.6 + w * 0.18), height = cell * (2.2 + w * 0.3), lift = (L.rankOf(p.to) - 3.5) * cell * 0.12;
      const c1 = L.moverColor(env, p), c2 = env.color(p.color, { p: 'b', n: 'q', b: 'n', r: 'q', q: 'b', k: 'n' }[p.piece]);
      const rays = Math.max(12, Math.round(span / (S * 0.0032)));
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = S * 0.003;
      for (let k = 0; k < rays; k++) {
        const t = k / (rays - 1), x = bx - span / 2 + span * t, fade = Math.pow(Math.sin(Math.PI * t), 0.8);
        const y0 = band(x) - lift + noise(x / cell * 2, i * 0.4) * cell * 0.12;
        const h = height * fade * (0.6 + 0.4 * Math.abs(noise(x / cell * 4, i)));
        const g = ctx.createLinearGradient(0, y0, 0, y0 - h);
        g.addColorStop(0, L.rgba(L.mix(c1, '#ffffff', 0.25), 0.16 * fade));
        g.addColorStop(0.12, L.rgba(c1, 0.1 * fade));
        g.addColorStop(0.6, L.rgba(c2, 0.04 * fade));
        g.addColorStop(1, L.rgba(c2, 0));
        ctx.strokeStyle = g;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (rng() - 0.5) * cell * 0.04, y0 - h); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    finish: L.finishHalo,
  });

  // 6.6 Orrery -------------------------------------------------------------------
  const ORBIT = { p: 0.13, n: 0.2, b: 0.26, r: 0.32, q: 0.38, k: 0.44 };
  reg({
    code: '6.6', id: 'orrery', name: 'Orrery',
    blurb: 'The game as a clockwork solar system. Each piece type has its own orbit, pawns innermost and kings outermost. The 64 squares run around the dial, and every move is an arc along its piece’s orbit from one square to the other, ending in a planet. Captures leave comets.',
    setup(env) {
      L.nightSky(env, 160);
      const { ctx, S, pal } = env;
      ctx.strokeStyle = L.rgba('#ffffff', 0.1); ctx.lineWidth = S * 0.0009;
      for (const r of Object.values(ORBIT)) { ctx.beginPath(); ctx.arc(S / 2, S / 2, r * S, 0, L.TAU); ctx.stroke(); }
      for (let k = 0; k < 64; k++) {
        const a = this.angle(k), r0 = S * 0.465, r1 = S * (k % 8 === 0 ? 0.485 : 0.475);
        ctx.beginPath(); ctx.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0); ctx.lineTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1); ctx.stroke();
      }
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.08);
      g.addColorStop(0, L.rgba(L.mix(pal.accent, '#ffffff', 0.5), 0.95)); g.addColorStop(0.4, L.rgba(pal.accent, 0.6)); g.addColorStop(1, L.rgba(pal.accent, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.08, 0, L.TAU); ctx.fill();
    },
    angle(k) { return -Math.PI / 2 + ((k + 0.5) / 64) * L.TAU; },
    ply(env, i) {
      const { ctx, game, S } = env;
      const p = game.plies[i], w = W[p.piece], c = L.moverColor(env, p);
      const R = S * (ORBIT[p.piece] + (p.color === 'w' ? -0.007 : 0.007));
      let a0 = this.angle(L.sqIdx(p.from)), a1 = this.angle(L.sqIdx(p.to));
      let da = a1 - a0;
      if (da > Math.PI) da -= L.TAU;
      if (da < -Math.PI) da += L.TAU;
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = L.rgba(c, 0.55); ctx.lineWidth = S * (0.0018 + w * 0.0003); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(S / 2, S / 2, R, a0, a0 + da, da < 0); ctx.stroke();
      const x = S / 2 + Math.cos(a1) * R, y = S / 2 + Math.sin(a1) * R;
      glowDot(ctx, x, y, S * 0.012 * (1 + w * 0.08), c, 0.5);
      ctx.fillStyle = L.mix(c, '#ffffff', 0.5); ctx.beginPath(); ctx.arc(x, y, S * 0.0035 * (1 + w * 0.08), 0, L.TAU); ctx.fill();
      if (p.captured) {
        const vr = S * ORBIT[p.captured];
        const vx = S / 2 + Math.cos(a1) * vr, vy = S / 2 + Math.sin(a1) * vr;
        const g = ctx.createLinearGradient(vx, vy, S / 2 + (vx - S / 2) * 0.82, S / 2 + (vy - S / 2) * 0.82);
        g.addColorStop(0, L.rgba(L.victimColor(env, p), 0.9)); g.addColorStop(1, L.rgba(L.victimColor(env, p), 0));
        ctx.strokeStyle = g; ctx.lineWidth = S * 0.003;
        ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(S / 2 + (vx - S / 2) * 0.82, S / 2 + (vy - S / 2) * 0.82); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    finish(env) {
      const { ctx, S, game } = env;
      ctx.fillStyle = L.rgba('#ffffff', 0.55);
      ctx.font = `${S * 0.016}px ${L.MONO}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let f = 0; f < 8; f++) { const a = this.angle(f * 8 + 3.5); ctx.fillText(String(f + 1), S / 2 + Math.cos(a) * S * 0.495, S / 2 + Math.sin(a) * S * 0.495); }
      ctx.fillStyle = L.rgba('#ffffff', 0.85);
      ctx.font = `600 ${S * 0.03}px ${L.SERIF}`;
      ctx.fillText(game.result && game.result !== '*' ? game.result : '', S / 2, S / 2);
    },
  });
})();
