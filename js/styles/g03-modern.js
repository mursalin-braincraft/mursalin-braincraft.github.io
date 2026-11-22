/* Group 3 — Geometric & Modern. Twentieth-century abstraction, driven by moves. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;

  // 3.1 De Stijl ----------------------------------------------------------------
  reg({
    code: '3.1', id: 'destijl', name: 'De Stijl', retained: true,
    blurb: 'A Neo-Plastic grid. Each move can split the rectangle it lands in, with a black line running across the move’s direction. Heavier pieces draw thicker lines. Rooks and queens tend to fill their rectangle with colour, captures fill it with the captured piece’s colour, and checks fill it with the accent colour.',
    setup(env) {
      const { S } = env;
      env.state.rects = [{ x: 0, y: 0, w: S, h: S, fill: null }];
      env.state.lines = [];
      env.state.min = S * 0.075;
    },
    find(env, x, y) {
      return env.state.rects.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || env.state.rects[0];
    },
    split(env, r, vertical, at, t, px, py) {
      const st = env.state, min = st.min;
      const i = st.rects.indexOf(r);
      if (vertical) {
        if (r.w < 2 * min) return false;
        const sx = Math.max(r.x + min, Math.min(r.x + r.w - min, at));
        st.rects.splice(i, 1, { x: r.x, y: r.y, w: sx - r.x, h: r.h, fill: px < sx ? null : r.fill }, { x: sx, y: r.y, w: r.x + r.w - sx, h: r.h, fill: px >= sx ? null : r.fill });
        st.lines.push({ x: sx - t / 2, y: r.y - t / 2, w: t, h: r.h + t });
      } else {
        if (r.h < 2 * min) return false;
        const sy = Math.max(r.y + min, Math.min(r.y + r.h - min, at));
        st.rects.splice(i, 1, { x: r.x, y: r.y, w: r.w, h: sy - r.y, fill: py < sy ? null : r.fill }, { x: r.x, y: sy, w: r.w, h: r.y + r.h - sy, fill: py >= sy ? null : r.fill });
        st.lines.push({ x: r.x - t / 2, y: sy - t / 2, w: r.w + t, h: t });
      }
      return true;
    },
    ply(env, i) {
      const { game, rng, S, data, cell, pal } = env;
      const p = game.plies[i], w = W[p.piece], side = p.color;
      const [ax, ay] = L.at(env, p.from);
      let [x, y] = L.at(env, p.to);
      x += (L.h01(p.to + 'x') - 0.5) * cell * 0.6;
      y += (L.h01(p.to + 'y') - 0.5) * cell * 0.6;
      const r = this.find(env, x, y);
      const vertical = p.piece === 'n' ? i % 2 === 0 : Math.abs(x - ax) >= Math.abs(y - ay);
      const t = S * (0.006 + w * 0.0011);
      let did = false;
      if (rng() < 1.4 / (1 + env.state.rects.length / 9)) {
        did = this.split(env, r, vertical, vertical ? x : y, t, x, y) || this.split(env, r, !vertical, vertical ? y : x, t, x, y);
      }
      if (!did && rng() < (w >= 5 ? 0.3 : 0.07)) this.find(env, x, y).fill = L.moverColor(env, p);
      if (p.captured && (W[p.captured] >= 3 || rng() < 0.25)) this.find(env, x, y).fill = L.victimColor(env, p);
      if (p.promotion) this.find(env, x, y).fill = env.color(side, p.promotion);
      if (p.check) { const [kx, ky] = L.at(env, data[i].king[L.enemy(side)]); this.find(env, kx, ky).fill = pal.accent; }
    },
    present(env) {
      const { ctx, pal } = env;
      env.clear(pal.bg);
      for (const r of env.state.rects) if (r.fill) { ctx.fillStyle = r.fill; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.fillStyle = pal.fg;
      for (const l of env.state.lines) ctx.fillRect(l.x, l.y, l.w, l.h);
    },
  });

  // 3.2 Composition (Kandinsky) -----------------------------------------------------
  reg({
    code: '3.2', id: 'composition', name: 'Composition',
    blurb: 'Abstract geometry in the spirit of Kandinsky’s Bauhaus years. Each piece is a shape: pawns are dots, knights triangles, bishops paired lines, rooks bars, queens concentric circles and kings crosses. Captures leave chequered patches, and checks strike with a zigzag.',
    setup(env) {
      const { ctx, S, pal, game, cell } = env;
      const g = ctx.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, L.mix(pal.bg, pal.w[2], 0.1));
      g.addColorStop(1, L.mix(pal.bg, pal.b[2], 0.12));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      for (const side of ['w', 'b']) {
        const ps = game.plies.filter(p => p.color === side);
        if (!ps.length) continue;
        let sx = 0, sy = 0;
        for (const p of ps) { const [x, y] = L.at(env, p.to); sx += x; sy += y; }
        const cx = sx / ps.length, cy = sy / ps.length;
        ctx.fillStyle = L.rgba(pal[side][4], 0.16);
        if (side === 'w') { ctx.beginPath(); ctx.arc(cx, cy, cell * 2.6, 0, L.TAU); ctx.fill(); }
        else { ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35); ctx.fillRect(-cell * 2.2, -cell * 1.4, cell * 4.4, cell * 2.8); ctx.restore(); }
      }
    },
    ply(env, i) {
      const { ctx, game, pal, rng, gauss, cell, S, data } = env;
      const p = game.plies[i], side = p.color;
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const ang = Math.atan2(by - ay, bx - ax);
      const c = L.moverColor(env, p);
      const x = bx + gauss() * cell * 0.12, y = by + gauss() * cell * 0.12;
      ctx.lineCap = 'butt';
      if (p.piece !== 'b') {
        ctx.strokeStyle = L.rgba(pal.fg, 0.35); ctx.lineWidth = S * 0.0011;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      switch (p.piece) {
        case 'p': {
          ctx.fillStyle = L.rgba(c, 0.92); ctx.beginPath(); ctx.arc(0, 0, cell * 0.09, 0, L.TAU); ctx.fill();
          if (rng() < 0.35) { ctx.strokeStyle = L.rgba(pal.fg, 0.5); ctx.lineWidth = S * 0.001; ctx.beginPath(); ctx.arc(0, 0, cell * 0.17, 0, L.TAU); ctx.stroke(); }
          break;
        }
        case 'n': {
          const s = cell * 0.36;
          ctx.fillStyle = L.rgba(c, 0.85);
          ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.6, s * 0.55); ctx.lineTo(-s * 0.6, -s * 0.55); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = L.rgba(pal.fg, 0.6); ctx.lineWidth = S * 0.0012; ctx.stroke();
          break;
        }
        case 'b': {
          ctx.restore(); ctx.save();
          ctx.strokeStyle = L.rgba(pal.fg, 0.75); ctx.lineWidth = S * 0.0016;
          const nx = -Math.sin(ang) * cell * 0.05, ny = Math.cos(ang) * cell * 0.05;
          for (const s of [1, -1]) { ctx.beginPath(); ctx.moveTo(ax + nx * s, ay + ny * s); ctx.lineTo(bx + nx * s, by + ny * s); ctx.stroke(); }
          ctx.translate(x, y); ctx.rotate(ang);
          ctx.fillStyle = L.rgba(c, 0.85); ctx.beginPath(); ctx.arc(0, 0, cell * 0.17, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
          break;
        }
        case 'r': {
          ctx.fillStyle = L.rgba(c, 0.82); ctx.fillRect(-cell * 0.28, -cell * 0.11, cell * 0.56, cell * 0.22);
          ctx.strokeStyle = L.rgba(pal.fg, 0.4); ctx.lineWidth = S * 0.001; ctx.strokeRect(-cell * 0.28, -cell * 0.11, cell * 0.56, cell * 0.22);
          break;
        }
        case 'q': {
          const r = cell * 0.62;
          ctx.fillStyle = L.rgba(c, 0.22); ctx.beginPath(); ctx.arc(0, 0, r, 0, L.TAU); ctx.fill();
          ctx.fillStyle = L.rgba(c, 0.85); ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, L.TAU); ctx.fill();
          ctx.fillStyle = L.rgba(env.color(L.enemy(side), 'q'), 0.9); ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, L.TAU); ctx.fill();
          ctx.strokeStyle = L.rgba(pal.fg, 0.5); ctx.lineWidth = S * 0.0012; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, L.TAU); ctx.stroke();
          break;
        }
        case 'k': {
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = L.rgba(c, 0.9);
          ctx.fillRect(-cell * 0.27, -cell * 0.045, cell * 0.54, cell * 0.09);
          ctx.fillRect(-cell * 0.045, -cell * 0.27, cell * 0.09, cell * 0.54);
          ctx.fillStyle = L.rgba(pal.fg, 0.8); ctx.beginPath(); ctx.arc(0, 0, cell * 0.12, 0, Math.PI); ctx.fill();
          break;
        }
      }
      ctx.restore();
      if (p.captured) {
        const cs = cell * 0.1, vc = L.victimColor(env, p);
        ctx.save(); ctx.translate(bx, by); ctx.rotate(ang + 0.3);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { ctx.fillStyle = (a + b) % 2 ? L.rgba(pal.fg, 0.85) : L.rgba(vc, 0.95); ctx.fillRect(a * cs - cs / 2 + cell * 0.25, b * cs - cs / 2, cs, cs); }
        ctx.restore();
      }
      if (p.check) {
        const [kx, ky] = L.at(env, data[i].king[L.enemy(side)]);
        const dx = kx - bx, dy = ky - by, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
        ctx.strokeStyle = pal.accent; ctx.lineWidth = S * 0.0018; ctx.lineJoin = 'miter';
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const t = k / 8, o = (k % 2 ? 1 : -1) * cell * 0.08; const px = bx + dx * t * 0.85 + nx * o, py = by + dy * t * 0.85 + ny * o; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
    },
    finish(env) {
      const k = L.matedKing(env);
      if (!k) return;
      const { ctx, cell, S, pal } = env;
      const [x, y] = L.at(env, k);
      ctx.strokeStyle = pal.accent; ctx.lineWidth = S * 0.004;
      ctx.beginPath(); ctx.arc(x, y, cell * 0.8, 0, L.TAU); ctx.stroke();
      ctx.fillStyle = pal.fg; ctx.beginPath(); ctx.arc(x, y, cell * 0.16, 0, L.TAU); ctx.fill();
    },
  });

  // 3.3 Suprematism ----------------------------------------------------------------
  function bar(ctx, cx, cy, len, thick, ang, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = color; ctx.fillRect(-len / 2, -thick / 2, len, thick); ctx.restore();
  }
  reg({
    code: '3.3', id: 'suprematism', name: 'Suprematism',
    blurb: 'Floating bars and squares on a tilted plane, after Malevich. Sliding pieces become bars as long as their move, pawns small squares and knights little L-shapes. Captures leave black squares, checks cut a thin line through the king, and checkmate is a black circle.',
    setup(env) { env.state.tilt = -(0.12 + env.rng() * 0.22); },
    tilted(env, fn) {
      const { ctx, S } = env;
      ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(env.state.tilt); ctx.scale(0.92, 0.92); ctx.translate(-S / 2, -S / 2);
      fn(); ctx.restore();
    },
    ply(env, i) {
      const { ctx, game, pal, cell, S, data, gauss } = env;
      const p = game.plies[i], side = p.color, w = W[p.piece];
      const [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      const ang = Math.atan2(by - ay, bx - ax), d = Math.hypot(bx - ax, by - ay);
      const c = L.moverColor(env, p);
      this.tilted(env, () => {
        if (p.piece === 'p') {
          const s = cell * 0.15;
          ctx.save(); ctx.translate(bx + gauss() * cell * 0.06, by + gauss() * cell * 0.06); ctx.rotate(gauss() * 0.15); ctx.fillStyle = c; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
        } else if (p.piece === 'n') {
          const long = Math.abs(bx - ax) > Math.abs(by - ay);
          const ex = long ? bx : ax, ey = long ? ay : by;
          bar(ctx, (ax + ex) / 2, (ay + ey) / 2, Math.hypot(ex - ax, ey - ay) + cell * 0.12, cell * 0.09, Math.atan2(ey - ay, ex - ax), c);
          bar(ctx, (ex + bx) / 2, (ey + by) / 2, Math.hypot(bx - ex, by - ey) + cell * 0.12, cell * 0.09, Math.atan2(by - ey, bx - ex), c);
        } else {
          bar(ctx, (ax + bx) / 2, (ay + by) / 2, Math.max(cell * 0.5, d * 0.95), cell * (0.05 + w * 0.022), ang, c);
        }
        if (p.captured) {
          const s = cell * (0.22 + W[p.captured] * 0.035);
          ctx.save(); ctx.translate(bx, by); ctx.rotate(ang * 0.5); ctx.fillStyle = pal.fg; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
        }
        if (p.check) {
          const [kx, ky] = L.at(env, data[i].king[L.enemy(side)]);
          bar(ctx, kx, ky, cell * 5, S * 0.0016, ang, pal.fg);
        }
      });
    },
    finish(env) {
      const k = L.matedKing(env);
      if (!k) return;
      const { ctx, cell, pal } = env;
      const [x, y] = L.at(env, k);
      this.tilted(env, () => {
        ctx.fillStyle = pal.fg; ctx.beginPath(); ctx.arc(x, y, cell * 0.55, 0, L.TAU); ctx.fill();
        ctx.strokeStyle = pal.accent; ctx.lineWidth = cell * 0.05; ctx.beginPath(); ctx.arc(x, y, cell * 0.72, 0, L.TAU); ctx.stroke();
      });
    },
  });

  // 3.4 Bauhaus Tiles ------------------------------------------------------------
  reg({
    code: '3.4', id: 'bauhaus', name: 'Bauhaus Tiles', retained: true,
    blurb: 'The board as a Bauhaus poster. Every square a piece lands on becomes a tile whose shape comes from that piece (circle, quarter-circle, triangle, square, half-moon or flower), turned toward the direction it arrived from. The tile’s backing remembers the previous visitor, or the piece that was captured there.',
    setup(env) { env.state.visits = Array.from({ length: 64 }, () => []); },
    ply(env, i) {
      const p = env.game.plies[i];
      const [ax, ay] = L.bu(p.from), [bx, by] = L.bu(p.to);
      const q = (bx >= ax ? 0 : 1) + (by >= ay ? 0 : 2);
      env.state.visits[L.sqIdx(p.to)].push({ piece: p.piece, side: p.color, q, cap: p.captured });
    },
    present(env) {
      const { ctx, pal, cell, m } = env;
      env.clear(pal.bg);
      const g = cell * 0.05;
      for (let s = 0; s < 64; s++) {
        const f = s % 8, r = Math.floor(s / 8);
        const x = m + f * cell + g / 2, y = m + (7 - r) * cell + g / 2, t = cell - g;
        const vs = env.state.visits[s];
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, t, t); ctx.clip();
        if (!vs.length) {
          ctx.fillStyle = L.mix(pal.bg, pal.fg, 0.05); ctx.fillRect(x, y, t, t);
          ctx.fillStyle = L.rgba(pal.fg, 0.18); ctx.beginPath(); ctx.arc(x + t / 2, y + t / 2, t * 0.035, 0, L.TAU); ctx.fill();
          ctx.restore();
          continue;
        }
        const last = vs[vs.length - 1], prev = vs.length > 1 ? vs[vs.length - 2] : null;
        const fgc = env.color(last.side, last.piece);
        const bgc = last.cap ? env.color(L.enemy(last.side), last.cap) : prev ? L.mix(env.color(prev.side, prev.piece), pal.bg, 0.45) : L.mix(pal.bg, pal.fg, 0.09);
        ctx.fillStyle = bgc; ctx.fillRect(x, y, t, t);
        ctx.fillStyle = fgc;
        const cx = x + t / 2, cy = y + t / 2;
        const corners = [[x, y], [x + t, y], [x, y + t], [x + t, y + t]];
        const [kx, ky] = corners[last.q];
        ctx.beginPath();
        switch (last.piece) {
          case 'p': ctx.arc(cx, cy, t * 0.3, 0, L.TAU); break;
          case 'n': ctx.moveTo(kx, ky); ctx.arc(kx, ky, t * 0.95, 0, L.TAU); break;
          case 'b': { const o = corners[3 - last.q]; ctx.moveTo(kx, ky); ctx.lineTo(o[0], ky); ctx.lineTo(kx, o[1]); ctx.closePath(); break; }
          case 'r': ctx.rect(x + t * 0.16, y + t * 0.16, t * 0.68, t * 0.68); break;
          case 'q': { const side = last.q; const ex = side % 2 ? x + t : x, ey = side < 2 ? y + t / 2 : y + t / 2; ctx.arc(ex, ey, t / 2, 0, L.TAU); break; }
          case 'k': for (const [qx, qy] of corners) { ctx.moveTo(qx, qy); ctx.arc(qx, qy, t * 0.42, 0, L.TAU); } break;
        }
        ctx.fill();
        if (last.piece === 'r') { ctx.fillStyle = bgc; ctx.fillRect(x + t * 0.36, y + t * 0.36, t * 0.28, t * 0.28); }
        if (last.piece === 'q') { ctx.fillStyle = pal.bg; ctx.beginPath(); ctx.arc(cx, cy, t * 0.12, 0, L.TAU); ctx.fill(); }
        if (vs.length >= 3) { ctx.strokeStyle = L.rgba(pal.fg, 0.45); ctx.lineWidth = t * 0.03; ctx.beginPath(); ctx.arc(cx, cy, t * 0.36, 0, L.TAU); ctx.stroke(); }
        ctx.restore();
      }
    },
  });

  // 3.5 Op Art --------------------------------------------------------------------
  reg({
    code: '3.5', id: 'opart', name: 'Op Art', retained: true,
    blurb: 'Optical stripes in the manner of Bridget Riley. White’s moves push the stripes up and Black’s push them down, so the busiest squares ripple. Where a side has pressed hardest, the stripes take on that side’s colour.',
    setup(env) { env.state.g = L.grid(96); },
    ply(env, i) {
      const p = env.game.plies[i], g = env.state.g, w = W[p.piece], s = p.color === 'w' ? 1 : -1;
      const sc = L.gscale(env, g), [gx, gy] = L.gposSq(env, g, p.to);
      L.splat(g, gx, gy, sc * 0.9, s * (0.6 + w * 0.12));
      if (p.captured) L.splat(g, gx, gy, sc * 0.45, -s * 0.8);
    },
    present(env) {
      const { ctx, S, pal } = env;
      const g = env.state.g;
      env.clear(pal.bg);
      const mx = L.maxAbs(g);
      const bands = 46, bh = S / bands, amp = bh * 3.2, cols = 120;
      const D = (x, y) => L.sampleAt(env, g, x, y) / mx;
      const neutral = L.mix(pal.fg, pal.bg, 0.2);
      const curves = [];
      for (let k = 0; k <= bands; k++) {
        const y0 = k * bh, c = [];
        for (let j = 0; j <= cols; j++) { const x = (j / cols) * S; c.push([x, y0 + D(x, y0) * amp]); }
        curves.push(c);
      }
      for (let k = 0; k < bands; k += 2) {
        const top = curves[k], bot = curves[k + 1], ymid = (k + 0.5) * bh;
        const gr = ctx.createLinearGradient(0, 0, S, 0);
        for (let j = 0; j <= 10; j++) {
          const v = D((j / 10) * S, ymid);
          gr.addColorStop(j / 10, v > 0 ? L.mix(neutral, pal.w[3], Math.min(1, v * 1.8)) : L.mix(neutral, pal.b[3], Math.min(1, -v * 1.8)));
        }
        ctx.fillStyle = gr;
        ctx.beginPath();
        top.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        for (let j = bot.length - 1; j >= 0; j--) ctx.lineTo(bot[j][0], bot[j][1]);
        ctx.closePath();
        ctx.fill();
      }
    },
  });

  // 3.6 Colour Field ---------------------------------------------------------------
  reg({
    code: '3.6', id: 'colorfield', name: 'Colour Field', retained: true,
    blurb: 'Three luminous, soft-edged rectangles stacked like a Rothko: the opening, the middlegame and the endgame. Each is coloured by the pieces that did the most work in that phase. A rectangle’s height follows how long its phase lasted.',
    setup(env) {
      const { game, pal } = env;
      const N = game.plies.length;
      let a = game.plies.findIndex(p => p.captured);
      if (a < 0 || a > N * 0.45) a = Math.round(N * 0.3);
      a = Math.max(1, Math.min(a, N - 2));
      let b = game.plies.findIndex((p, i) => i > a && p.before.material.w + p.before.material.b <= 50);
      if (b < 0) b = Math.round(N * 0.72);
      b = Math.max(a + 1, Math.min(b, N - 1));
      const all = {};
      env.state.phases = [[0, a], [a, b], [b, N]].filter(([s, e]) => e > s).map(([s, e]) => {
        const tally = {};
        for (let i = s; i < e; i++) {
          const p = game.plies[i], key = p.color + p.piece, v = W[p.piece] + (p.captured ? W[p.captured] : 0);
          tally[key] = (tally[key] || 0) + v;
          all[p.color] = (all[p.color] || 0) + v;
        }
        const top = Object.entries(tally).sort((x, y) => y[1] - x[1]);
        const c1 = env.color(top[0][0][0], top[0][0][1]);
        const c2 = top[1] ? env.color(top[1][0][0], top[1][0][1]) : L.mix(c1, pal.bg, 0.4);
        return { s, e, c1, c2 };
      });
      const lead = (all.w || 0) >= (all.b || 0) ? 'w' : 'b';
      env.state.ground = L.mix(pal.bg, pal[lead][3], pal.dark ? 0.16 : 0.2);
    },
    present(env) {
      const { ctx, S, game } = env;
      env.clear(env.state.ground);
      const N = game.plies.length, cur = env.cur;
      const ph = env.state.phases;
      const raw = ph.map(q => Math.max(0.2, (q.e - q.s) / N));
      const sum = raw.reduce((a, b) => a + b, 0);
      const top = S * 0.07, gap = S * 0.04, left = S * 0.09, width = S * 0.82;
      const avail = S * 0.86 - gap * (ph.length - 1);
      let y = top;
      ph.forEach((q, k) => {
        const h = (avail * raw[k]) / sum;
        if (cur >= q.s) {
          const prog = Math.min(1, (cur - q.s + 1) / (q.e - q.s));
          const rnd = L.prng(1000 + k * 77 + env.variation * 7919);
          for (let l = 0; l < 44; l++) {
            const jx = (rnd() - 0.5) * width * 0.03, jy = (rnd() - 0.5) * h * 0.05, sw = (rnd() - 0.5) * width * 0.05, sh = (rnd() - 0.5) * h * 0.08;
            const g = ctx.createLinearGradient(0, y, 0, y + h);
            g.addColorStop(0, L.rgba(q.c1, 0.045 * prog));
            g.addColorStop(1, L.rgba(L.mix(q.c1, q.c2, 0.6), 0.045 * prog));
            ctx.fillStyle = g;
            ctx.fillRect(left + jx - sw / 2, y + jy - sh / 2, width + sw, h + sh);
          }
          // an inner glow, built from soft layers so it has no hard edge
          const glow = L.mix(q.c1, '#ffffff', 0.35);
          for (let l = 0; l < 24; l++) {
            const ix = width * (0.06 + rnd() * 0.12), iy = h * (0.08 + rnd() * 0.18);
            ctx.fillStyle = L.rgba(glow, 0.012 * prog);
            ctx.fillRect(left + ix, y + iy, width - 2 * ix, h - 2 * iy);
          }
        }
        y += h + gap;
      });
    },
  });
})();
