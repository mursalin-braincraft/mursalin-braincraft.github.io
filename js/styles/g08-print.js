/* Group 8 — Print & Graphic. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  // 8.1 Risograph ------------------------------------------------------------------
  reg({
    code: '8.1', id: 'riso', name: 'Risograph', retained: true,
    blurb: 'A three-colour risograph print, slightly out of register. White’s moves are printed on one drum and Black’s on another, as bold lines with a dot, square or ring where the piece landed. Captures and checks go on a third, halftoned drum. The ink coverage is grainy, like real riso.',
    setup(env) {
      const { S } = env;
      const mk = () => { const c = L.canvas(S, S); return { c, x: c.getContext('2d') }; };
      env.state.layers = [mk(), mk(), mk()];
      const gr = L.canvas(S, S), gx = gr.getContext('2d'), img = gx.createImageData(gr.width, gr.height), r = L.prng(3);
      for (let i = 3; i < img.data.length; i += 4) if (r() < 0.33) img.data[i] = 70 + r() * 150;
      gx.putImageData(img, 0, 0);
      env.state.grain = gr;
      const t = Math.max(4, Math.round(S / 120)), pc = L.canvas(t, t), px = pc.getContext('2d');
      px.fillStyle = '#000'; px.beginPath(); px.arc(t / 2, t / 2, t * 0.34, 0, L.TAU); px.fill();
      env.state.dots = env.state.layers[2].x.createPattern(pc, 'repeat');
    },
    ply(env, i) {
      const { game, cell, gauss, data } = env;
      const p = game.plies[i], w = W[p.piece];
      const c = env.state.layers[p.color === 'w' ? 0 : 1].x;
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      c.strokeStyle = '#000'; c.fillStyle = '#000'; c.lineCap = 'round';
      c.lineWidth = cell * (0.07 + w * 0.012);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      if (p.piece === 'p') { const s = cell * 0.2; c.fillRect(bx - s / 2, by - s / 2, s, s); }
      else if (p.piece === 'q') { c.lineWidth = cell * 0.07; c.beginPath(); c.arc(bx, by, cell * 0.34, 0, L.TAU); c.stroke(); }
      else { c.beginPath(); c.arc(bx, by, cell * (0.1 + w * 0.02), 0, L.TAU); c.fill(); }
      const c2 = env.state.layers[2].x;
      if (p.captured) { c2.fillStyle = env.state.dots; c2.beginPath(); c2.arc(bx + gauss() * cell * 0.1, by + gauss() * cell * 0.1, cell * (0.3 + W[p.captured] * 0.045), 0, L.TAU); c2.fill(); }
      if (p.check) { const [kx, ky] = L.at(env, data[i].king[L.enemy(p.color)]); c2.strokeStyle = '#000'; c2.lineWidth = cell * 0.06; c2.beginPath(); c2.arc(kx, ky, cell * 0.42, 0, L.TAU); c2.stroke(); }
    },
    present(env) {
      const { ctx, S, pal } = env;
      env.clear(pal.bg);
      const inks = [pal.w[3], pal.b[3], pal.accent];
      const offs = [[0, 0], [S * 0.004, -S * 0.003], [-S * 0.003, S * 0.004]];
      ctx.save();
      ctx.globalCompositeOperation = pal.dark ? 'screen' : 'multiply';
      env.state.layers.forEach((ly, k) => {
        const t = L.tinted(ly.c, inks[k]), tx = t.getContext('2d');
        tx.globalCompositeOperation = 'destination-out';
        tx.drawImage(env.state.grain, (k * 3) % 5, (k * 5) % 7);
        ctx.drawImage(t, offs[k][0], offs[k][1], S, S);
      });
      ctx.restore();
    },
  });

  // 8.2 Halftone -----------------------------------------------------------------------
  reg({
    code: '8.2', id: 'halftone', name: 'Halftone', retained: true,
    blurb: 'Comic-book halftone. The game’s activity is printed as three screens of dots at different angles: White’s moves in one ink at 15°, Black’s in another at 75°, and captures and checks in the accent ink at 45°. Bigger dots mean more happened there.',
    setup(env) { env.state.g = [L.grid(96), L.grid(96), L.grid(96)]; },
    ply(env, i) {
      const p = env.game.plies[i], w = W[p.piece];
      L.splatMove(env, env.state.g[p.color === 'w' ? 0 : 1], p, 0.8, 0.5 + w * 0.15, 0.35);
      if (p.captured) { const g = env.state.g[2]; const [gx, gy] = L.gposSq(env, g, p.to); L.splat(g, gx, gy, L.gscale(env, g) * 0.6, 0.6 + W[p.captured] * 0.2); }
      if (p.check) { const g = env.state.g[2]; const [gx, gy] = L.gposSq(env, g, env.data[i].king[L.enemy(p.color)]); L.splat(g, gx, gy, L.gscale(env, g) * 0.45, 0.8); }
    },
    present(env) {
      const { ctx, S, pal } = env;
      env.clear(pal.bg);
      const screens = [[env.state.g[0], 15, pal.w[3]], [env.state.g[1], 75, pal.b[3]], [env.state.g[2], 45, pal.accent]];
      const d = S / 62;
      ctx.save();
      ctx.globalCompositeOperation = pal.dark ? 'screen' : 'multiply';
      for (const [g, deg, color] of screens) {
        const mx = L.maxAbs(g);
        if (mx < 1e-6) continue;
        const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
        const K = Math.ceil((S * 0.75) / d);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = -K; i <= K; i++) for (let j = -K; j <= K; j++) {
          const x = S / 2 + (i * ux - j * uy) * d, y = S / 2 + (i * uy + j * ux) * d;
          if (x < -d || y < -d || x > S + d || y > S + d) continue;
          const t = Math.min(1, L.sampleAt(env, g, x, y) / mx);
          const r = d * 0.62 * Math.sqrt(t);
          if (r < d * 0.05) continue;
          ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, L.TAU);
        }
        ctx.fill();
      }
      ctx.restore();
    },
  });

  // 8.3 Linocut ------------------------------------------------------------------------
  reg({
    code: '8.3', id: 'linocut', name: 'Linocut', retained: true,
    blurb: 'A two-block relief print. The key block is inked solid and then carved: windows are cut where pieces landed, and gouges follow the game’s current around every move. A colour block printed underneath shows through the cuts in the colours of the pieces.',
    setup(env) {
      L.buildField(env);
      const { S, pal, m } = env;
      const r = L.prng(8);
      const key = L.canvas(S, S), kx = key.getContext('2d');
      kx.fillStyle = pal.fg;
      const edge = [], inset = m * 0.55;
      const corners = [[inset, inset], [S - inset, inset], [S - inset, S - inset], [inset, S - inset]];
      for (let q = 0; q < 4; q++) for (let k = 0; k < 30; k++) {
        const a = corners[q], b = corners[(q + 1) % 4], t = k / 30;
        edge.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * S * 0.006, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * S * 0.006]);
      }
      L.pathPoly(kx, edge); kx.fill();
      kx.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < (S * S) / 500; k++) { kx.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; kx.fillRect(r() * S, r() * S, S * 0.0012, S * 0.0012); }
      const color = L.canvas(S, S);
      const cs = 0.09, on = Math.ceil(10 / cs);
      Object.assign(env.state, { key, kx, color, cx: color.getContext('2d'), cs, on, occ: new Uint8Array(on * on) });
    },
    cut(env, u0, v0, width) {
      const st = env.state, { cs, on, occ, kx } = st;
      const cellOf = (u, v) => { const x = Math.floor((u + 1) / cs), y = Math.floor((v + 1) / cs); return x < 0 || y < 0 || x >= on || y >= on ? -1 : y * on + x; };
      const free = (u, v) => { const c = cellOf(u, v); if (c < 0) return false; const x = c % on, y = (c / on) | 0; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (xx >= 0 && yy >= 0 && xx < on && yy < on && occ[yy * on + xx]) return false; return true; };
      if (!free(u0, v0)) return;
      const fwd = [], back = [];
      for (const dir of [1, -1]) {
        let x = u0, y = v0;
        const out = dir === 1 ? fwd : back;
        for (let s = 0; s < 40; s++) {
          const [vx, vy] = L.fieldAt(env, x, y), a = Math.atan2(vy, vx);
          x += Math.cos(a) * 0.04 * dir; y += Math.sin(a) * 0.04 * dir;
          if (x < -0.6 || x > 8.6 || y < -0.6 || y > 8.6 || !free(x, y)) break;
          out.push([x, y]);
        }
      }
      const pts = back.reverse().concat([[u0, v0]], fwd);
      if (pts.length < 5) return;
      for (const [x, y] of pts) { const c = cellOf(x, y); if (c >= 0) occ[c] = 1; }
      const P = pts.map(([u, v]) => [L.px(env, u), L.px(env, v)]), n = P.length, left = [], right = [];
      for (let i = 0; i < n; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const w = width * Math.pow(Math.sin((Math.PI * i) / (n - 1)), 0.7);
        left.push([P[i][0] - (dy / l) * w, P[i][1] + (dx / l) * w]);
        right.push([P[i][0] + (dy / l) * w, P[i][1] - (dx / l) * w]);
      }
      kx.globalCompositeOperation = 'destination-out';
      kx.fillStyle = '#000';
      L.pathPoly(kx, left.concat(right.reverse())); kx.fill();
    },
    ply(env, i) {
      const { game, cell, rng, gauss } = env;
      const p = game.plies[i], w = W[p.piece], st = env.state;
      const [bx, by] = L.at(env, p.to);
      const blob = (x, y, R, color) => { st.cx.fillStyle = color; L.pathPoly(st.cx, L.deform(L.circlePts(x, y, R, 10, rng, 0.25), 1, R * 0.15, gauss)); st.cx.fill(); };
      if (p.captured) blob(bx, by, cell * (0.42 + W[p.captured] * 0.04), L.victimColor(env, p));
      blob(bx + gauss() * cell * 0.08, by + gauss() * cell * 0.08, cell * (0.3 + w * 0.04), L.moverColor(env, p));
      st.kx.globalCompositeOperation = 'destination-out';
      st.kx.fillStyle = '#000';
      L.pathPoly(st.kx, L.deform(L.circlePts(bx, by, cell * (0.12 + w * 0.014), 9, rng, 0.2), 1, cell * 0.03, gauss)); st.kx.fill();
      for (let k = 0; k < 3 + w; k++) { const s = L.seedOnMove(env, p, 0.35); this.cut(env, s[0], s[1], cell * (0.03 + w * 0.004)); }
    },
    finish(env) {
      const { gauss, cell } = env;
      for (let v = -0.4; v < 8.4; v += 0.28) for (let u = -0.4; u < 8.4; u += 0.28) this.cut(env, u + gauss() * 0.05, v + gauss() * 0.05, cell * 0.016);
    },
    present(env) {
      const { ctx, pal } = env;
      env.clear(pal.bg);
      L.blit(env, env.state.color);
      L.blit(env, env.state.key);
      void ctx;
    },
  });

  // 8.4 Pop Art -----------------------------------------------------------------------
  reg({
    code: '8.4', id: 'popart', name: 'Pop Art', retained: true,
    blurb: 'A Warhol-style four-panel screenprint. The game’s motif (every move as a bold stroke, every landing as a dot, every capture as a starburst) is printed four times, each panel in a different colourway with an off-register shadow.',
    setup(env) { const h = Math.round(env.S / 2); env.state.motif = L.canvas(h, h); env.state.mx = env.state.motif.getContext('2d'); },
    ply(env, i) {
      const { game, cell } = env;
      const p = game.plies[i], w = W[p.piece], c = env.state.mx;
      const [ax, ay] = L.at(env, p.from).map(v => v / 2), [bx, by] = L.at(env, p.to).map(v => v / 2);
      const k = cell / 2;
      c.fillStyle = '#000'; c.strokeStyle = '#000'; c.lineCap = 'round';
      c.lineWidth = k * (0.1 + w * 0.012);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.beginPath(); c.arc(bx, by, k * (0.12 + w * 0.025), 0, L.TAU); c.fill();
      if (p.captured) {
        const R = k * (0.38 + W[p.captured] * 0.03);
        c.beginPath();
        for (let s = 0; s < 18; s++) { const r = s % 2 ? R * 0.45 : R, a = (s / 18) * L.TAU; c[s ? 'lineTo' : 'moveTo'](bx + Math.cos(a) * r, by + Math.sin(a) * r); }
        c.closePath(); c.fill();
      }
    },
    present(env) {
      const { ctx, S, pal } = env;
      env.clear(pal.fg);
      const h = S / 2, gap = S * 0.012;
      const schemes = [
        [pal.w[2], pal.b[3], pal.accent],
        [pal.b[2], pal.w[3], L.mix(pal.fg, pal.bg, 0.3)],
        [pal.accent, pal.b[0], pal.w[1]],
        [L.mix(pal.bg, pal.w[0], 0.5), pal.fg, pal.b[1]],
      ];
      schemes.forEach(([bg, ink, shadow], q) => {
        const x0 = (q % 2) * h, y0 = Math.floor(q / 2) * h;
        ctx.save();
        ctx.beginPath(); ctx.rect(x0 + gap / 2, y0 + gap / 2, h - gap, h - gap); ctx.clip();
        ctx.fillStyle = bg; ctx.fillRect(x0, y0, h, h);
        ctx.drawImage(L.tinted(env.state.motif, shadow), x0 + S * 0.008, y0 + S * 0.008, h, h);
        ctx.drawImage(L.tinted(env.state.motif, ink), x0, y0, h, h);
        ctx.restore();
      });
    },
  });

  // 8.5 Blueprint ---------------------------------------------------------------------
  reg({
    code: '8.5', id: 'blueprint', name: 'Blueprint', grain: false,
    blurb: 'A technical drawing of the game on blueprint paper. Every move is a dimensioned vector with an arrowhead and a tick at each square it crosses, and knights take a dashed L-route. Notable moves are annotated, captures get callouts and the sheet has a title block.',
    setup(env) {
      const { ctx, S, pal, cell, m } = env;
      const ground = L.mix(L.night(env), pal.b[3], 0.42), ink = L.lightInk(env);
      env.state.ink = ink;
      ctx.fillStyle = ground; ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = L.rgba(ink, 0.07); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = m % (cell / 4); x < S; x += cell / 4) { ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.moveTo(0, x); ctx.lineTo(S, x); }
      ctx.stroke();
      ctx.strokeStyle = L.rgba(ink, 0.16);
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) { const x = m + k * cell; ctx.moveTo(x, m); ctx.lineTo(x, S - m); ctx.moveTo(m, x); ctx.lineTo(S - m, x); }
      ctx.stroke();
      ctx.strokeStyle = L.rgba(ink, 0.85); ctx.lineWidth = S * 0.0016;
      ctx.strokeRect(m, m, S - 2 * m, S - 2 * m);
      ctx.lineWidth = S * 0.0008;
      ctx.strokeRect(m * 0.35, m * 0.35, S - m * 0.7, S - m * 0.7);
      ctx.fillStyle = L.rgba(ink, 0.7);
      ctx.font = `${S * 0.016}px ${L.MONO}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < 8; k++) { ctx.fillText('abcdefgh'[k], m + (k + 0.5) * cell, S - m * 0.6); ctx.fillText(String(8 - k), m * 0.62, m + (k + 0.5) * cell); }
    },
    ply(env, i) {
      const { ctx, S, cell, game, data, pal } = env;
      const p = game.plies[i], ink = env.state.ink;
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const steps = L.steps(p);
      ctx.strokeStyle = L.rgba(ink, 0.85); ctx.fillStyle = L.rgba(ink, 0.85); ctx.lineWidth = S * 0.0012;
      let ex = ax, ey = ay, ang;
      if (p.piece === 'n') {
        const longX = Math.abs(bx - ax) > Math.abs(by - ay);
        ex = longX ? bx : ax; ey = longX ? ay : by;
        ctx.setLineDash([S * 0.006, S * 0.004]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]);
        const s = cell * 0.08, sx = Math.sign(ax - ex) || 1, sy = Math.sign(by - ey) || 1;
        ctx.strokeRect(Math.min(ex, ex + sx * s), Math.min(ey, ey + sy * s), s, s);
        ang = Math.atan2(by - ey, bx - ex);
      } else {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ang = Math.atan2(by - ay, bx - ax);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        for (let k = 1; k < steps; k++) { const t = k / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; ctx.beginPath(); ctx.moveTo(x - nx * cell * 0.06, y - ny * cell * 0.06); ctx.lineTo(x + nx * cell * 0.06, y + ny * cell * 0.06); ctx.stroke(); }
      }
      const h = cell * 0.14;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.cos(ang - 0.4) * h, by - Math.sin(ang - 0.4) * h); ctx.lineTo(bx - Math.cos(ang + 0.4) * h, by - Math.sin(ang + 0.4) * h); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(ax, ay, cell * 0.04, 0, L.TAU); ctx.stroke();
      if (p.captured || p.check || steps >= 3 || 'qk'.includes(p.piece)) {
        const mx = (ax + bx) / 2 - Math.sin(ang) * cell * 0.16, my = (ay + by) / 2 + Math.cos(ang) * cell * 0.16;
        ctx.font = `${S * 0.012}px ${L.MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${p.moveNumber}${p.color === 'w' ? '.' : '…'}${p.san}`, mx, my);
      }
      if (p.captured) {
        ctx.beginPath(); ctx.arc(bx, by, cell * 0.3, 0, L.TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + cell * 0.21, by - cell * 0.21); ctx.lineTo(bx + cell * 0.5, by - cell * 0.5); ctx.lineTo(bx + cell * 0.75, by - cell * 0.5); ctx.stroke();
        ctx.textAlign = 'left'; ctx.font = `${S * 0.011}px ${L.MONO}`;
        ctx.fillText('× ' + p.captured.toUpperCase(), bx + cell * 0.78, by - cell * 0.5);
      }
      if (p.check) {
        const [kx, ky] = L.at(env, data[i].king[L.enemy(p.color)]);
        ctx.strokeStyle = L.rgba(pal.accent, 0.9); ctx.setLineDash([S * 0.004, S * 0.004]);
        ctx.beginPath(); ctx.arc(kx, ky, cell * 0.38, 0, L.TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    },
    finish(env) {
      const { ctx, S, m, game, cell, pal } = env;
      const ink = env.state.ink, h = game.headers;
      const k = L.matedKing(env);
      if (k) {
        const [x, y] = L.at(env, k);
        ctx.strokeStyle = pal.accent; ctx.lineWidth = S * 0.002;
        for (const r of [0.42, 0.5]) { ctx.beginPath(); ctx.arc(x, y, cell * r, 0, L.TAU); ctx.stroke(); }
      }
      const bw = S * 0.46, bh = m * 0.5, x = S - m * 0.35 - bw, y = S - m * 0.35 - bh;
      ctx.fillStyle = L.mix(L.night(env), pal.b[3], 0.42); ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = L.rgba(ink, 0.85); ctx.lineWidth = S * 0.0008; ctx.strokeRect(x, y, bw, bh);
      ctx.beginPath(); ctx.moveTo(x + bw * 0.62, y); ctx.lineTo(x + bw * 0.62, y + bh); ctx.stroke();
      ctx.fillStyle = L.rgba(ink, 0.85); ctx.font = `${bh * 0.32}px ${L.MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const name = `${(h.White || 'White').split(/[ ,]/).filter(Boolean).pop()} v ${(h.Black || 'Black').split(/[ ,]/).filter(Boolean).pop()}`.toUpperCase();
      ctx.fillText(name.slice(0, 26), x + bw * 0.03, y + bh * 0.5);
      ctx.fillText(`RESULT ${game.result}`, x + bw * 0.65, y + bh * 0.5);
    },
  });

  // 8.6 Cut-Outs ----------------------------------------------------------------------
  const LOBES = { p: 3, n: 5, b: 2, r: 4, q: 7, k: 6 };
  function cutout(env, x, y, R, lobes, ang, color, sharp = 0.6) {
    const { ctx, noise } = env;
    const pts = [], seed = env.rng() * 50;
    for (let k = 0; k < 96; k++) {
      const t = (k / 96) * L.TAU;
      const r = R * (0.45 + 0.55 * Math.pow(Math.abs(Math.cos((lobes * t) / 2)), sharp)) * (1 + noise(seed + Math.cos(t), Math.sin(t)) * 0.18);
      pts.push([x + Math.cos(t + ang) * r, y + Math.sin(t + ang) * r]);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    L.pathPoly(ctx, pts.map(([a, b]) => [a + R * 0.06, b + R * 0.09])); ctx.fill();
    ctx.fillStyle = color;
    L.pathPoly(ctx, pts); ctx.fill();
  }
  reg({
    code: '8.6', id: 'cutouts', name: 'Cut-Outs',
    blurb: 'Painted-paper cut-outs, after Matisse’s late work. Each move pins a hand-cut shape where the piece landed. Every piece has its own form: three lobes for a pawn, a five-pointed shape for a knight, a long leaf for a bishop, up to seven lobes for a queen. Captures are spiky stars.',
    setup(env) {
      const { ctx, S, pal, noise } = env;
      const block = (y0, y1, color, seed) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(S * 0.05, y0);
        for (let x = S * 0.05; x <= S * 0.95; x += S / 60) ctx.lineTo(x, y0 + noise(x / S * 5, seed) * S * 0.008);
        for (let x = S * 0.95; x >= S * 0.05; x -= S / 60) ctx.lineTo(x, y1 + noise(x / S * 5, seed + 3) * S * 0.008);
        ctx.closePath(); ctx.fill();
      };
      block(S * 0.05, S * 0.49, L.mix(pal.bg, pal.b[2], 0.3), 1);
      block(S * 0.51, S * 0.95, L.mix(pal.bg, pal.w[2], 0.3), 7);
    },
    ply(env, i) {
      const { game, cell, gauss, data, pal } = env;
      const p = game.plies[i], w = W[p.piece];
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const ang = Math.atan2(by - ay, bx - ax);
      if (p.captured) cutout(env, bx + gauss() * cell * 0.1, by + gauss() * cell * 0.1, cell * (0.3 + W[p.captured] * 0.03), 9, ang, L.victimColor(env, p), 3);
      cutout(env, bx + gauss() * cell * 0.12, by + gauss() * cell * 0.12, cell * (0.24 + w * 0.035), LOBES[p.piece], ang, L.moverColor(env, p));
      if (p.check) { const [kx, ky] = L.at(env, data[i].king[L.enemy(p.color)]); cutout(env, kx, ky, cell * 0.16, 5, 0, pal.accent, 2); }
    },
    finish(env) {
      const k = L.matedKing(env);
      if (k) { const [x, y] = L.at(env, k); cutout(env, x, y, env.cell * 0.7, 12, 0, env.pal.accent, 2.5); }
    },
  });
})();
