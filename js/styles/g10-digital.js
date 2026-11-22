/* Group 10 — Type & Digital. */
(function () {
  const { register: reg, lib: L } = CM.art;
  const W = L.WEIGHT;
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const SYMBOL_FONT = '"Apple Symbols", "Segoe UI Symbol", "DejaVu Sans", "Noto Sans Symbols 2", sans-serif';

  // 10.1 ASCII ----------------------------------------------------------------------
  reg({
    code: '10.1', id: 'ascii', name: 'ASCII', retained: true, grain: false,
    blurb: 'Terminal art. The game’s activity is mapped to a ramp of characters, from a blank for a quiet square to @ for the busiest, and coloured by the side that was more active there. Captures and checks are typed into the picture in their own notation.',
    setup(env) { env.state.tone = L.grid(72); env.state.side = L.grid(72); env.state.words = []; },
    ply(env, i) {
      const p = env.game.plies[i], w = W[p.piece];
      L.splatMove(env, env.state.tone, p, 0.7, 0.6 + w * 0.15 + (p.captured ? W[p.captured] * 0.2 : 0), 0.45);
      L.splatMove(env, env.state.side, p, 0.8, p.color === 'w' ? 1 : -1, 0.3);
      if (p.captured || p.check) env.state.words.push({ sq: p.to, text: p.san, c: p.captured ? L.victimColor(env, p) : env.pal.accent });
    },
    present(env) {
      const { ctx, S, pal } = env;
      env.clear(pal.bg);
      const cols = 64, cw = S / cols, ch = cw * 1.65, rows = Math.floor(S / ch), oy = (S - rows * ch) / 2;
      const ramp = ' .:-=+*#%@';
      let mx = 1e-6; for (const v of env.state.tone.a) if (v > mx) mx = v;
      ctx.font = `${ch * 0.9}px ${L.MONO}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * cw + cw / 2, y = oy + r * ch + ch / 2;
        const t = Math.min(1, L.sampleAt(env, env.state.tone, x, y) / mx);
        const k = Math.round(Math.pow(t, 0.75) * (ramp.length - 1));
        if (!k) { if ((r * 7 + c * 3) % 11 === 0) { ctx.fillStyle = L.rgba(pal.fg, 0.12); ctx.fillText('.', x, y); } continue; }
        const sd = L.sampleAt(env, env.state.side, x, y);
        ctx.fillStyle = L.mix(L.mix(pal.fg, pal.bg, 0.35), sd >= 0 ? pal.w[3] : pal.b[3], Math.min(1, 0.35 + t * 0.65));
        ctx.fillText(ramp[k], x, y);
      }
      ctx.font = `700 ${ch * 0.9}px ${L.MONO}`;
      for (const wd of env.state.words) {
        const [x, y] = L.at(env, wd.sq);
        const c0 = Math.round(x / cw - wd.text.length / 2), r0 = Math.round((y - oy) / ch - 0.5);
        ctx.fillStyle = pal.bg;
        ctx.fillRect(c0 * cw, oy + r0 * ch, wd.text.length * cw, ch);
        ctx.fillStyle = wd.c;
        [...wd.text].forEach((chr, k) => ctx.fillText(chr, (c0 + k) * cw + cw / 2, oy + r0 * ch + ch / 2));
      }
    },
  });

  // 10.2 Concrete Poetry ------------------------------------------------------------
  reg({
    code: '10.2', id: 'typo', name: 'Concrete Poetry',
    blurb: 'Typography that flows. Every move’s own notation (Nf3, exd5, Qxf7#) is set along the game’s current, repeated until the stream runs out, in a size set by the piece. White writes in italic serif and Black in bold sans. Captured pieces speak in their own colour.',
    setup(env) { L.buildField(env); env.state.glyphs = new Map(); },
    /** Each glyph is rasterised once into a small bitmap, then stamped with a
     *  transform: far faster than thousands of rotated fillText calls. */
    glyph(env, font, size, color, ch) {
      const key = font + '|' + color + '|' + ch;
      let g = env.state.glyphs.get(key);
      if (!g) {
        const m = env.ctx;
        m.save(); m.font = font; const w = m.measureText(ch).width; m.restore();
        const c = L.canvas(Math.ceil(w) + 4, Math.ceil(size * 1.5) + 4), x = c.getContext('2d');
        x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(ch, c.width / 2, c.height / 2);
        g = { c, adv: w };
        env.state.glyphs.set(key, g);
      }
      return g;
    },
    ply(env, i) {
      const { ctx, S, game, rng } = env;
      const p = game.plies[i], w = W[p.piece];
      const size = Math.max(6, S * (0.0095 + w * 0.0021));
      const font = p.color === 'w' ? `italic ${size}px ${L.SERIF}` : `600 ${size}px ${L.SANS}`;
      const text = p.san + '  ';
      for (const st of L.plyStrokes(env, i, 2, 0.35)) {
        const P = L.trace(env, st.seed[0], st.seed[1], 110 + rng() * 80, 0.04).map(([u, v]) => [L.px(env, u), L.px(env, v)]);
        if (P.length < 4) continue;
        const cum = [0];
        for (let k = 1; k < P.length; k++) cum.push(cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
        const total = cum[cum.length - 1];
        ctx.globalAlpha = st.kind === 'move' ? 0.85 : 0.95;
        let s = rng() * size, k = 0, idx = 0;
        while (s < total - size) {
          const g = this.glyph(env, font, size, st.color, text[idx % text.length]);
          const at = s + g.adv / 2;
          while (k < cum.length - 2 && cum[k + 1] < at) k++;
          const t = (at - cum[k]) / ((cum[k + 1] - cum[k]) || 1);
          const x = P[k][0] + (P[k + 1][0] - P[k][0]) * t, y = P[k][1] + (P[k + 1][1] - P[k][1]) * t;
          const a = Math.atan2(P[k + 1][1] - P[k][1], P[k + 1][0] - P[k][0]), ca = Math.cos(a), sa = Math.sin(a);
          ctx.setTransform(ca, sa, -sa, ca, env.ox + x, env.oy + y);
          ctx.drawImage(g.c, -g.c.width / 2, -g.c.height / 2);
          s += Math.max(1, g.adv * 1.04); idx++;
        }
        ctx.setTransform(1, 0, 0, 1, env.ox, env.oy);
        ctx.globalAlpha = 1;
      }
    },
    finish: L.finishHalo,
  });

  // 10.3 8-Bit -------------------------------------------------------------------------
  const SPRITES = {
    p: ['........', '...##...', '..#oo#..', '..#oo#..', '...##...', '..#oo#..', '.#oooo#.', '.######.'],
    n: ['........', '..##....', '.#oo##..', '#ooooo#.', '.##.#o#.', '...#oo#.', '..#ooo#.', '.######.'],
    b: ['...##...', '..#oo#..', '.#o##o#.', '.#oooo#.', '..#oo#..', '...##...', '..#oo#..', '.######.'],
    r: ['#.#..#.#', '#o#oo#o#', '#oooooo#', '.#oooo#.', '.#oooo#.', '.#oooo#.', '#oooooo#', '########'],
    q: ['#.#..#.#', '.#o##o#.', '.#oooo#.', '..#oo#..', '..#oo#..', '.#oooo#.', '#oooooo#', '########'],
    k: ['...##...', '..#oo#..', '...##...', '.##oo##.', '#oooooo#', '.#oooo#.', '.#oooo#.', '########'],
  };
  reg({
    code: '10.3', id: 'pixel', name: '8-Bit', retained: true, grain: false,
    blurb: 'A 64 × 64 pixel board, as on an 8-bit console. The current position is shown in pixel sprites, and the last dozen moves leave pixel trails that dither away as they age. Captures explode in the colour of the piece that was taken.',
    present(env) {
      const { ctx, S, pal, game } = env;
      const cur = env.cur, P = S / 64;
      const light = L.mix(pal.bg, pal.fg, 0.24), dark = L.mix(pal.bg, pal.fg, 0.1);
      for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) { ctx.fillStyle = (f + r) % 2 ? light : dark; ctx.fillRect(f * 8 * P, (7 - r) * 8 * P, 8 * P + 0.5, 8 * P + 0.5); }
      const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * P), Math.round(y * P), Math.ceil(P), Math.ceil(P)); };
      const center = (sq) => [L.fileOf(sq) * 8 + 3, (7 - L.rankOf(sq)) * 8 + 4];
      for (let i = Math.max(0, cur - 11); i <= cur; i++) {
        const p = game.plies[i], age = cur - i, c = L.moverColor(env, p);
        let [x0, y0] = center(p.from);
        const [x1, y1] = center(p.to);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (let guard = 0; guard < 200; guard++) {
          if (age < 5 || (x0 + y0) % 2 === 0) px(x0, y0, c);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
        if (p.captured && age < 3) {
          const vc = L.victimColor(env, p), [cx, cy] = center(p.to);
          for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2], [-4, -1], [4, 1], [1, -4], [-1, 4]]) px(cx + a, cy + b, vc);
        }
      }
      const outline = { w: L.mix(L.night(env), '#000000', 0.4), b: L.mix(pal.b[2], '#ffffff', 0.45) };
      const body = { w: L.mix(pal.w[5], '#ffffff', 0.15), b: L.mix(pal.b[3], '#000000', 0.4) };
      for (const pc of L.fenPieces(game.fens[cur + 1])) {
        const ox = L.fileOf(pc.square) * 8, oy = (7 - L.rankOf(pc.square)) * 8, spr = SPRITES[pc.type];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const ch = spr[y][x];
          if (ch === '#') px(ox + x, oy + y, outline[pc.color]);
          else if (ch === 'o') px(ox + x, oy + y, body[pc.color]);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      for (let y = 0; y < 64; y++) ctx.fillRect(0, (y + 0.5) * P, S, Math.max(1, P * 0.25));
    },
    ply() {},
  });

  // 10.4 Glitch -----------------------------------------------------------------------
  reg({
    code: '10.4', id: 'glitch', name: 'Glitch', retained: true, heavy: true, grain: false,
    blurb: 'Datamoshed chess. The board (squares tinted by their last visitor, recent moves as strokes, the pieces as glyphs) is corrupted by the game itself. Captures pixel-sort the row they happened on, checks split the colour channels, and long moves tear blocks of the image sideways.',
    present(env) {
      const { ctx, S, pal, game, cell, m } = env;
      const cur = env.cur;
      env.clear(pal.bg);
      const last = new Array(64).fill(null);
      for (let i = 0; i <= cur; i++) last[L.sqIdx(game.plies[i].to)] = game.plies[i];
      for (let s = 0; s < 64; s++) {
        const f = s % 8, r = Math.floor(s / 8);
        ctx.fillStyle = last[s] ? L.mix(L.moverColor(env, last[s]), pal.bg, 0.25) : (f + r) % 2 ? L.mix(pal.bg, pal.fg, 0.08) : L.mix(pal.bg, pal.fg, 0.16);
        ctx.fillRect(m + f * cell, m + (7 - r) * cell, cell + 0.5, cell + 0.5);
      }
      ctx.lineCap = 'round';
      for (let i = Math.max(0, cur - 12); i <= cur; i++) {
        const p = game.plies[i], [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
        ctx.strokeStyle = L.moverColor(env, p); ctx.lineWidth = cell * 0.08;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.font = `${cell * 0.78}px ${SYMBOL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const pc of L.fenPieces(game.fens[cur + 1])) {
        const [x, y] = L.at(env, pc.square);
        ctx.fillStyle = pc.color === 'w' ? L.mix(pal.w[5], '#ffffff', 0.3) : L.mix(pal.b[3], '#000000', 0.35);
        ctx.fillText(GLYPH[pc.type] + '︎', x, y + cell * 0.04);
      }
      const ox = Math.round(env.ox), oy = Math.round(env.oy), Wd = Math.round(S);
      const img = ctx.getImageData(ox, oy, Wd, Wd), d = img.data;
      const lum = (o) => d[o] * 0.3 + d[o + 1] * 0.59 + d[o + 2] * 0.11;
      for (let i = 0; i <= cur; i++) {
        const p = game.plies[i];
        const [bx, by] = L.at(env, p.to).map(Math.round);
        if (p.captured) {
          const h = Math.round(cell * (0.12 + W[p.captured] * 0.035)), x0 = p.color === 'w' ? bx : 0, x1 = p.color === 'w' ? Wd : bx;
          for (let y = Math.max(0, by - h); y < Math.min(Wd, by + h); y++) {
            const row = [];
            for (let x = x0; x < x1; x++) { const o = (y * Wd + x) * 4; row.push([lum(o), d[o], d[o + 1], d[o + 2]]); }
            row.sort((a, b) => a[0] - b[0]);
            row.forEach((v, k) => { const o = (y * Wd + x0 + k) * 4; d[o] = v[1]; d[o + 1] = v[2]; d[o + 2] = v[3]; });
          }
        }
        if (p.check) {
          const [, ky] = L.at(env, env.data[i].king[L.enemy(p.color)]).map(Math.round);
          const h = Math.round(cell * 0.22), sR = Math.round(cell * 0.18), sB = Math.round(cell * 0.1);
          for (let y = Math.max(0, ky - h); y < Math.min(Wd, ky + h); y++) {
            const r = new Uint8ClampedArray(Wd), b = new Uint8ClampedArray(Wd);
            for (let x = 0; x < Wd; x++) { r[x] = d[(y * Wd + x) * 4]; b[x] = d[(y * Wd + x) * 4 + 2]; }
            for (let x = 0; x < Wd; x++) { d[(y * Wd + x) * 4] = r[Math.max(0, x - sR)]; d[(y * Wd + x) * 4 + 2] = b[Math.min(Wd - 1, x + sB)]; }
          }
        }
        if (L.steps(p) >= 4 && i % 2 === 0) {
          const [ax, ay] = L.at(env, p.from).map(Math.round), h = Math.round(cell * 0.14), shift = Math.round((bx - ax) * 0.35);
          for (let y = Math.max(0, ay - h); y < Math.min(Wd, ay + h); y++) {
            const rowStart = y * Wd * 4, copy = d.slice(rowStart, rowStart + Wd * 4);
            for (let x = 0; x < Wd; x++) { const sx = x - shift; if (sx < 0 || sx >= Wd) continue; d.set(copy.subarray(sx * 4, sx * 4 + 4), rowStart + x * 4); }
          }
        }
      }
      for (let y = 0; y < Wd; y += 3) for (let x = 0; x < Wd; x++) { const o = (y * Wd + x) * 4; d[o] *= 0.9; d[o + 1] *= 0.9; d[o + 2] *= 0.9; }
      ctx.putImageData(img, ox, oy);
    },
    ply() {},
  });

  // 10.5 Circuit Board -------------------------------------------------------------------
  reg({
    code: '10.5', id: 'circuit', name: 'Circuit Board', grain: false,
    blurb: 'A printed circuit board. Every move is a copper trace routed at 45° from pad to pad, with a via at the bend. Captures get square pads and part labels, checks get a silkscreen ring, and the pieces left on the board at the end are soldered on as components.',
    setup(env) {
      const { ctx, S, pal } = env;
      const mask = L.mix(L.night(env), pal.b[1], 0.32), silk = L.lightInk(env), copper = L.mix(pal.w[2], '#d9a25b', 0.35);
      Object.assign(env.state, { mask, silk, copper, pads: {}, n: 1 });
      ctx.fillStyle = mask; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = L.rgba(silk, 0.05);
      for (let y = S * 0.02; y < S; y += S / 80) for (let x = S * 0.02; x < S; x += S / 80) ctx.fillRect(x, y, 1, 1);
      ctx.strokeStyle = L.rgba(silk, 0.5); ctx.lineWidth = S * 0.0015;
      ctx.strokeRect(S * 0.02, S * 0.02, S * 0.96, S * 0.96);
      for (const [x, y] of [[0.04, 0.04], [0.96, 0.04], [0.04, 0.96], [0.96, 0.96]]) {
        ctx.fillStyle = copper; ctx.beginPath(); ctx.arc(x * S, y * S, S * 0.013, 0, L.TAU); ctx.fill();
        ctx.fillStyle = L.mix(L.night(env), '#000000', 0.5); ctx.beginPath(); ctx.arc(x * S, y * S, S * 0.007, 0, L.TAU); ctx.fill();
      }
    },
    pad(env, x, y, square) {
      const { ctx, S } = env, st = env.state, k = Math.round(x) + ',' + Math.round(y);
      if (st.pads[k] && !square) return;
      st.pads[k] = 1;
      ctx.fillStyle = st.copper;
      if (square) ctx.fillRect(x - S * 0.008, y - S * 0.008, S * 0.016, S * 0.016);
      else { ctx.beginPath(); ctx.arc(x, y, S * 0.0058, 0, L.TAU); ctx.fill(); }
      ctx.fillStyle = L.mix(L.night(env), '#000000', 0.5);
      ctx.beginPath(); ctx.arc(x, y, S * 0.0024, 0, L.TAU); ctx.fill();
    },
    ply(env, i) {
      const { ctx, S, game, data, cell } = env;
      const st = env.state, p = game.plies[i], w = W[p.piece];
      const lane = (Math.floor(L.h01(String(data.track.mover[i])) * 5) - 2) * S * 0.0045;
      let [ax, ay] = L.at(env, p.from), [bx, by] = L.at(env, p.to);
      ax += lane; ay += lane; bx += lane; by += lane;
      const dx = bx - ax, dy = by - ay;
      const P1 = Math.abs(dx) >= Math.abs(dy) ? [bx - Math.sign(dx) * Math.abs(dy), ay] : [ax, by - Math.sign(dy) * Math.abs(dx)];
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = st.copper; ctx.lineWidth = S * (0.0022 + w * 0.0004);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(P1[0], P1[1]); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = L.rgba('#ffffff', 0.25); ctx.lineWidth = S * 0.0007;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(P1[0], P1[1]); ctx.lineTo(bx, by); ctx.stroke();
      if (Math.hypot(P1[0] - ax, P1[1] - ay) > 2 && Math.hypot(P1[0] - bx, P1[1] - by) > 2) {
        ctx.strokeStyle = st.copper; ctx.lineWidth = S * 0.0018;
        ctx.beginPath(); ctx.arc(P1[0], P1[1], S * 0.0035, 0, L.TAU); ctx.stroke();
      }
      this.pad(env, ax, ay);
      this.pad(env, bx, by, !!p.captured);
      ctx.fillStyle = L.rgba(st.silk, 0.75); ctx.font = `${S * 0.0105}px ${L.MONO}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      if (p.captured) ctx.fillText('X' + st.n++, bx + S * 0.011, by - S * 0.011);
      if (p.check) {
        const [kx, ky] = L.at(env, data[i].king[L.enemy(p.color)]);
        ctx.strokeStyle = L.rgba(st.silk, 0.8); ctx.lineWidth = S * 0.0012;
        ctx.beginPath(); ctx.arc(kx, ky, cell * 0.33, 0, L.TAU); ctx.stroke();
      }
    },
    finish(env) {
      const { ctx, S, cell, game, pal } = env;
      const st = env.state, silk = L.rgba(st.silk, 0.85), counts = {};
      ctx.lineWidth = S * 0.0013; ctx.font = `${S * 0.0105}px ${L.MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const pc of CM.art.finalPieces(game)) {
        const [x, y] = L.at(env, pc.square), c = cell;
        const pre = { k: 'U', q: 'C', r: 'R', b: 'D', n: 'Q', p: 'J' }[pc.type];
        counts[pre] = (counts[pre] || 0) + 1;
        ctx.strokeStyle = silk; ctx.fillStyle = st.copper;
        if (pc.type === 'k') {
          ctx.strokeRect(x - c * 0.25, y - c * 0.18, c * 0.5, c * 0.36);
          for (let k = 0; k < 4; k++) { ctx.fillRect(x - c * 0.2 + k * c * 0.12, y - c * 0.26, c * 0.05, c * 0.07); ctx.fillRect(x - c * 0.2 + k * c * 0.12, y + c * 0.19, c * 0.05, c * 0.07); }
          ctx.beginPath(); ctx.arc(x - c * 0.25, y, c * 0.05, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        } else if (pc.type === 'q') {
          ctx.beginPath(); ctx.arc(x, y, c * 0.22, 0, L.TAU); ctx.stroke();
          ctx.fillStyle = silk; ctx.fillText('+', x - c * 0.1, y - c * 0.08);
        } else if (pc.type === 'r' || pc.type === 'b') {
          ctx.strokeRect(x - c * 0.22, y - c * 0.08, c * 0.44, c * 0.16);
          if (pc.type === 'b') { ctx.beginPath(); ctx.moveTo(x + c * 0.12, y - c * 0.08); ctx.lineTo(x + c * 0.12, y + c * 0.08); ctx.stroke(); }
          ctx.fillRect(x - c * 0.3, y - c * 0.04, c * 0.08, c * 0.08); ctx.fillRect(x + c * 0.22, y - c * 0.04, c * 0.08, c * 0.08);
        } else if (pc.type === 'n') {
          ctx.beginPath(); ctx.arc(x, y, c * 0.16, Math.PI, 0); ctx.closePath(); ctx.stroke();
        } else {
          ctx.fillRect(x - c * 0.1, y - c * 0.04, c * 0.07, c * 0.08); ctx.fillRect(x + c * 0.03, y - c * 0.04, c * 0.07, c * 0.08);
        }
        ctx.fillStyle = silk;
        ctx.fillText(pre + counts[pre], x, y + c * 0.36);
      }
      const h = game.headers;
      ctx.textAlign = 'left'; ctx.fillStyle = L.rgba(st.silk, 0.7);
      ctx.fillText(`REV A · ${(h.White || 'White').toUpperCase()} vs ${(h.Black || 'Black').toUpperCase()} · ${game.result}`.slice(0, 64), S * 0.07, S * 0.975);
      void pal;
    },
  });
})();
