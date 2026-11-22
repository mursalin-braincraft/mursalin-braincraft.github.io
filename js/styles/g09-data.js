/* Group 9 — Diagram & Data. The game as an information graphic. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  // 9.1 Chord Diagram ---------------------------------------------------------------
  const GAP = 0.07, SPAN = (L.TAU - 8 * GAP) / 8;
  const chordAngle = (sq) => -Math.PI / 2 + L.fileOf(sq) * (SPAN + GAP) + ((L.rankOf(sq) + 0.5) / 8) * SPAN;
  reg({
    code: '9.1', id: 'chord', name: 'Chord Diagram',
    blurb: 'The 64 squares around a circle, grouped by file from a to h with ranks 1–8 inside each group. Every move is a chord from the square it left to the square it reached, curving through the middle. Ticks on the rim build up wherever pieces land.',
    setup(env) {
      const { ctx, S, pal } = env;
      const R = S * 0.4;
      ctx.lineCap = 'butt';
      for (let f = 0; f < 8; f++) {
        const a0 = -Math.PI / 2 + f * (SPAN + GAP);
        ctx.strokeStyle = L.rgba(pal.fg, 0.22); ctx.lineWidth = S * 0.006;
        ctx.beginPath(); ctx.arc(S / 2, S / 2, R * 1.015, a0, a0 + SPAN); ctx.stroke();
        const am = a0 + SPAN / 2;
        ctx.fillStyle = L.rgba(pal.fg, 0.65); ctx.font = `${S * 0.024}px ${L.SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('abcdefgh'[f], S / 2 + Math.cos(am) * R * 1.13, S / 2 + Math.sin(am) * R * 1.13);
      }
      env.state.R = R;
    },
    ply(env, i) {
      const { ctx, S, game } = env;
      const p = game.plies[i], w = W[p.piece], R = env.state.R;
      const a1 = chordAngle(p.from), a2 = chordAngle(p.to);
      const x1 = S / 2 + Math.cos(a1) * R, y1 = S / 2 + Math.sin(a1) * R, x2 = S / 2 + Math.cos(a2) * R, y2 = S / 2 + Math.sin(a2) * R;
      const cx = S / 2 + ((x1 + x2) / 2 - S / 2) * 0.15, cy = S / 2 + ((y1 + y2) / 2 - S / 2) * 0.15;
      ctx.strokeStyle = L.rgba(p.captured ? L.victimColor(env, p) : L.moverColor(env, p), p.captured ? 0.75 : 0.4);
      ctx.lineWidth = S * (0.0012 + w * 0.00028) * (p.captured ? 1.6 : 1);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
      ctx.strokeStyle = L.rgba(L.moverColor(env, p), 0.7); ctx.lineWidth = S * 0.0025;
      ctx.beginPath(); ctx.moveTo(S / 2 + Math.cos(a2) * R * 1.035, S / 2 + Math.sin(a2) * R * 1.035); ctx.lineTo(S / 2 + Math.cos(a2) * R * 1.075, S / 2 + Math.sin(a2) * R * 1.075); ctx.stroke();
    },
    finish(env) {
      const { ctx, S, game, pal } = env;
      ctx.fillStyle = L.rgba(pal.fg, 0.85); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${S * 0.05}px ${L.SERIF}`;
      ctx.fillText(game.result && game.result !== '*' ? game.result : '·', S / 2, S / 2 - S * 0.012);
      ctx.fillStyle = L.rgba(pal.fg, 0.55); ctx.font = `${S * 0.016}px ${L.MONO}`;
      ctx.fillText(`${game.plies.length} PLIES`, S / 2, S / 2 + S * 0.03);
    },
  });

  // 9.2 Arc Diagram ------------------------------------------------------------------
  reg({
    code: '9.2', id: 'arcs', name: 'Arc Diagram',
    blurb: 'All 64 squares in a row, from a1 to h8. White’s moves arc above the line and Black’s below, so an arc’s height shows how far the piece travelled. Rank labels mark the line, and captures are dots on it, sized by the value of the piece taken.',
    setup(env) {
      const { ctx, S, pal, m } = env;
      env.state.x = (sq) => m + ((L.sqIdx(sq) + 0.5) / 64) * (S - 2 * m);
      ctx.strokeStyle = L.rgba(pal.fg, 0.45); ctx.lineWidth = S * 0.0012;
      ctx.beginPath(); ctx.moveTo(m, S / 2); ctx.lineTo(S - m, S / 2); ctx.stroke();
      ctx.fillStyle = L.rgba(pal.fg, 0.6); ctx.font = `${S * 0.013}px ${L.MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let k = 0; k < 64; k++) {
        const x = m + ((k + 0.5) / 64) * (S - 2 * m), major = k % 8 === 0;
        ctx.fillRect(x - 0.5, S / 2 - (major ? S * 0.008 : S * 0.003), 1, major ? S * 0.016 : S * 0.006);
        if (major) ctx.fillText('a' + (k / 8 + 1), x, S / 2 + S * 0.012);
      }
    },
    ply(env, i) {
      const { ctx, S, game } = env;
      const p = game.plies[i], w = W[p.piece];
      const x1 = env.state.x(p.from), x2 = env.state.x(p.to), r = Math.abs(x2 - x1) / 2, cx = (x1 + x2) / 2;
      ctx.strokeStyle = L.rgba(L.moverColor(env, p), 0.5);
      ctx.lineWidth = S * (0.001 + w * 0.0003);
      ctx.beginPath();
      if (p.color === 'w') ctx.arc(cx, S / 2, r, Math.PI, 0, false); else ctx.arc(cx, S / 2, r, 0, Math.PI, false);
      ctx.stroke();
      if (p.captured) { ctx.fillStyle = L.victimColor(env, p); ctx.beginPath(); ctx.arc(x2, S / 2, S * (0.003 + W[p.captured] * 0.0009), 0, L.TAU); ctx.fill(); }
      if (p.mate) {
        ctx.strokeStyle = env.pal.accent; ctx.lineWidth = S * 0.004;
        ctx.beginPath();
        if (p.color === 'w') ctx.arc(cx, S / 2, r, Math.PI, 0, false); else ctx.arc(cx, S / 2, r, 0, Math.PI, false);
        ctx.stroke();
      }
    },
  });

  // 9.3 Territory ---------------------------------------------------------------------
  reg({
    code: '9.3', id: 'territory', name: 'Territory', retained: true,
    blurb: 'A weather map of control. After every move, each square counts how many White and Black pieces attack it, and the totals are added up over the whole game. Squares White dominated warm into White’s colour and Black’s into theirs, with isolines like isobars.',
    setup(env) { env.state.acc = new Float32Array(64); },
    ply(env, i) { const c = env.data[i].ctrl, a = env.state.acc; for (let s = 0; s < 64; s++) a[s] += c[s]; },
    present(env) {
      const { ctx, S, pal, m, cell } = env;
      env.clear(pal.bg);
      const acc = env.state.acc;
      let mx = 1e-6; for (const v of acc) mx = Math.max(mx, Math.abs(v));
      const n = 120, g = L.grid(n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const u = (((x + 0.5) / n) * S - m) / cell - 0.5, v = 7 - ((((y + 0.5) / n) * S - m) / cell - 0.5);
        let s = 0, wsum = 0;
        for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) { const d2 = (f - u) ** 2 + (r - v) ** 2, k = Math.exp(-d2 / 0.9); s += k * acc[r * 8 + f]; wsum += k; }
        g.a[y * n + x] = s / (wsum || 1) / mx;
      }
      const bg = L.hexRgb(pal.bg), wc = L.hexRgb(pal.w[3]), bc = L.hexRgb(pal.b[3]);
      L.renderPixels(env, n, n, (d) => {
        for (let i = 0; i < n * n; i++) {
          const t = g.a[i], c = L.mixRgb(bg, t > 0 ? wc : bc, Math.min(1, Math.pow(Math.abs(t), 0.75)) * 0.85);
          d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
        }
      });
      const toPx = (v) => ((v + 0.5) / n) * S;
      ctx.lineWidth = S * 0.0012;
      for (const lv of [-0.8, -0.55, -0.3, -0.1, 0.1, 0.3, 0.55, 0.8]) {
        const segs = L.contours(g.a, n, lv);
        ctx.strokeStyle = L.rgba(pal.fg, Math.abs(lv) > 0.5 ? 0.55 : 0.3);
        ctx.beginPath();
        for (let s = 0; s < segs.length; s += 2) { ctx.moveTo(toPx(segs[s][0]), toPx(segs[s][1])); ctx.lineTo(toPx(segs[s + 1][0]), toPx(segs[s + 1][1])); }
        ctx.stroke();
      }
      ctx.fillStyle = L.rgba(pal.fg, 0.25);
      for (let f = 0; f <= 8; f++) for (let r = 0; r <= 8; r++) ctx.fillRect(m + f * cell - 1, m + r * cell - 1, 2, 2);
    },
  });

  // 9.4 Barcode ----------------------------------------------------------------------
  reg({
    code: '9.4', id: 'barcode', name: 'Barcode',
    blurb: 'The game’s fingerprint: one bar per move, left to right, in the piece’s colour. With clock times in the PGN, a bar’s width is the time spent thinking. Captures carry a band of the captured piece’s colour, checks a mark in the accent colour, and a line traces the material balance.',
    setup(env) {
      const { game, S, m } = env;
      const unit = (p) => (game.hasClocks && p.thinkTime != null ? 0.4 + Math.log2(1 + p.thinkTime / 3) : 1);
      const ws = game.plies.map(unit), total = ws.reduce((a, b) => a + b, 0);
      let x = m;
      env.state.bars = ws.map((w) => { const bw = (w / total) * (S - 2 * m); const b = [x, bw]; x += bw; return b; });
      env.state.top = m * 1.2; env.state.bottom = S - m * 1.8;
      env.state.prev = null;
    },
    ply(env, i) {
      const { ctx, game, pal, S, m } = env;
      const p = game.plies[i], [x, bw] = env.state.bars[i], top = env.state.top, bottom = env.state.bottom, h = bottom - top;
      ctx.fillStyle = L.moverColor(env, p);
      ctx.fillRect(x, top, bw + 0.5, h);
      const tension = Math.min(1, (p.before.captures || 0) / 10);
      ctx.fillStyle = L.rgba('#ffffff', 0.18);
      ctx.fillRect(x, top, bw + 0.5, h * 0.18 * tension);
      if (p.captured) { ctx.fillStyle = L.victimColor(env, p); ctx.fillRect(x, top + h * 0.42, bw + 0.5, h * 0.16); }
      if (p.check) { ctx.fillStyle = pal.accent; ctx.fillRect(x, bottom - h * 0.05, bw + 0.5, h * 0.05); }
      const bal = p.before.balance + (p.captured ? (p.color === 'w' ? 1 : -1) * W[p.captured] : 0);
      const y = top + h / 2 - Math.max(-1, Math.min(1, bal / 12)) * h * 0.4, cx = x + bw / 2;
      if (env.state.prev) {
        ctx.strokeStyle = L.rgba(pal.fg, 0.9); ctx.lineWidth = S * 0.0022;
        ctx.beginPath(); ctx.moveTo(env.state.prev[0], env.state.prev[1]); ctx.lineTo(cx, y); ctx.stroke();
      }
      env.state.prev = [cx, y];
      if (p.color === 'w' && p.moveNumber % 10 === 0) {
        ctx.fillStyle = L.rgba(pal.fg, 0.6); ctx.font = `${S * 0.013}px ${L.MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(String(p.moveNumber), cx, bottom + m * 0.25);
      }
    },
  });

  // 9.5 Radial Clock --------------------------------------------------------------------
  reg({
    code: '9.5', id: 'radial', name: 'Radial Clock',
    blurb: 'The game as a clock face, with time running clockwise from the top. The rings, inside out: which piece moved, what was captured (and how valuable it was), how tense the position was, and the material balance as a radial line that bulges toward the side ahead.',
    setup(env) {
      const { ctx, S, pal } = env;
      const c = S / 2, rs = [0.13, 0.21, 0.27, 0.32, 0.46].map(k => k * S);
      env.state.rs = rs;
      ctx.strokeStyle = L.rgba(pal.fg, 0.12); ctx.lineWidth = S * 0.0008;
      for (const r of rs) { ctx.beginPath(); ctx.arc(c, c, r, 0, L.TAU); ctx.stroke(); }
      ctx.setLineDash([S * 0.003, S * 0.004]);
      ctx.beginPath(); ctx.arc(c, c, (rs[3] + rs[4]) / 2, 0, L.TAU); ctx.stroke();
      ctx.setLineDash([]);
    },
    ang(env, i) { return -Math.PI / 2 + (i / env.game.plies.length) * L.TAU; },
    wedge(ctx, c, r0, r1, a0, a1) { ctx.beginPath(); ctx.arc(c, c, r1, a0, a1); ctx.arc(c, c, r0, a1, a0, true); ctx.closePath(); },
    ply(env, i) {
      const { ctx, S, game, pal } = env;
      const p = game.plies[i], c = S / 2, rs = env.state.rs;
      const a0 = this.ang(env, i), a1 = this.ang(env, i + 1) - Math.min(0.01, (L.TAU / game.plies.length) * 0.15);
      ctx.fillStyle = L.moverColor(env, p); this.wedge(ctx, c, rs[0], rs[1], a0, a1); ctx.fill();
      if (p.captured) { ctx.fillStyle = L.victimColor(env, p); this.wedge(ctx, c, rs[1] + S * 0.005, rs[1] + S * 0.005 + (rs[2] - rs[1] - S * 0.01) * (W[p.captured] / 9), a0, a1); ctx.fill(); }
      const t = Math.min(1, (p.before.captures || 0) / 10);
      ctx.fillStyle = p.check ? pal.accent : L.rgba(pal.fg, 0.28);
      this.wedge(ctx, c, rs[2] + S * 0.004, rs[2] + S * 0.004 + (rs[3] - rs[2] - S * 0.008) * (p.check ? 1 : t), a0, a1); ctx.fill();
      const mid = (rs[3] + rs[4]) / 2, bal = Math.max(-12, Math.min(12, p.before.balance));
      if (bal) { ctx.fillStyle = L.rgba(bal > 0 ? pal.w[3] : pal.b[3], 0.8); this.wedge(ctx, c, mid, mid + (bal / 12) * (rs[4] - rs[3]) * 0.5, a0, a1); ctx.fill(); }
    },
    finish(env) {
      const { ctx, S, game, pal } = env;
      ctx.fillStyle = L.rgba(pal.fg, 0.9); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${S * 0.045}px ${L.SERIF}`;
      ctx.fillText(game.result && game.result !== '*' ? game.result : '·', S / 2, S / 2 - S * 0.01);
      ctx.fillStyle = L.rgba(pal.fg, 0.5); ctx.font = `${S * 0.013}px ${L.MONO}`;
      ctx.fillText(`${Math.ceil(game.plies.length / 2)} MOVES`, S / 2, S / 2 + S * 0.03);
      for (let i = 0; i < game.plies.length; i++) {
        const p = game.plies[i];
        if (p.color !== 'w' || p.moveNumber % 10) continue;
        const a = this.ang(env, i);
        ctx.fillText(String(p.moveNumber), S / 2 + Math.cos(a) * S * 0.48, S / 2 + Math.sin(a) * S * 0.48);
      }
    },
  });

  // 9.6 Metro Map -----------------------------------------------------------------------
  reg({
    code: '9.6', id: 'metro', name: 'Metro Map', retained: true,
    blurb: 'A transit map of the game. Every piece that moved is a line, routed at 45° and 90° angles through the squares it stopped on, with a knight’s L-shaped jump as an elbow. Squares two pieces shared become interchanges, captured lines end at a buffer stop, and a river runs between the two halves.',
    present(env) {
      const { ctx, S, pal, cell, data, noise } = env;
      env.clear(pal.bg);
      ctx.strokeStyle = L.rgba(L.mix(pal.bg, pal.b[2], 0.6), 0.6);
      ctx.lineWidth = cell * 0.5; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = -cell; x <= S + cell; x += S / 60) { const y = S / 2 + Math.sin(x / S * L.TAU * 1.1 + 0.6) * cell * 0.35 + noise(x / S * 3, 2) * cell * 0.2; x <= -cell ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      const T = data.track, cur = env.cur, lw = cell * 0.085;
      const count = {}, lines = [];
      Object.values(T.ids).forEach((P, idx) => {
        const path = P.path.filter(s => s.ply <= cur);
        if (path.length < 2) return;
        const pts = [L.at(env, path[0].sq)], stops = [0];
        for (let k = 1; k < path.length; k++) {
          const a = path[k - 1].sq, b = path[k].sq, df = L.fileOf(b) - L.fileOf(a), dr = L.rankOf(b) - L.rankOf(a);
          if (Math.abs(df) && Math.abs(dr) && Math.abs(df) !== Math.abs(dr)) {
            const e = Math.abs(df) > Math.abs(dr) ? L.sqName(L.fileOf(b), L.rankOf(a)) : L.sqName(L.fileOf(a), L.rankOf(b));
            pts.push(L.at(env, e));
          }
          pts.push(L.at(env, b));
          stops.push(pts.length - 1);
        }
        for (const s of path) count[s.sq] = (count[s.sq] || 0) + 1;
        const lane = (Math.floor(L.h01(P.id) * 5) - 2) * lw * 0.95;
        const shade = (idx % 4) * 0.12;
        lines.push({ P, stops, pts: L.offsetPolyline(pts, lane), color: L.mix(env.color(P.color, P.type), P.color === 'w' ? '#ffffff' : '#000000', shade), path, dead: P.captured != null && P.captured <= cur });
      });
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const ln of lines) { ctx.strokeStyle = ln.color; ctx.lineWidth = lw; L.pathPoly(ctx, ln.pts, false); ctx.stroke(); }
      for (const ln of lines) {
        ln.path.forEach((s, k) => {
          const pt = ln.pts[ln.stops[k]];
          if (count[s.sq] > 1) return;
          ctx.fillStyle = pal.bg; ctx.strokeStyle = ln.color; ctx.lineWidth = lw * 0.35;
          ctx.beginPath(); ctx.arc(pt[0], pt[1], lw * 0.42, 0, L.TAU); ctx.fill(); ctx.stroke();
        });
        if (ln.dead) {
          const a = ln.pts[ln.pts.length - 2], b = ln.pts[ln.pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          ctx.strokeStyle = ln.color; ctx.lineWidth = lw * 0.6; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(b[0] - Math.sin(ang) * lw * 1.3, b[1] + Math.cos(ang) * lw * 1.3); ctx.lineTo(b[0] + Math.sin(ang) * lw * 1.3, b[1] - Math.cos(ang) * lw * 1.3); ctx.stroke();
          ctx.lineCap = 'round';
        }
      }
      ctx.font = `600 ${S * 0.0125}px ${L.SANS}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (const sq in count) {
        if (count[sq] < 2) continue;
        const [x, y] = L.at(env, sq), r = lw * (1.1 + Math.min(4, count[sq]) * 0.15);
        ctx.fillStyle = pal.bg; ctx.strokeStyle = pal.fg; ctx.lineWidth = lw * 0.4;
        ctx.beginPath(); ctx.arc(x, y, r, 0, L.TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = pal.fg; ctx.fillText(sq, x + r + lw * 0.4, y - r * 0.9);
      }
    },
    ply() {},
  });
})();
