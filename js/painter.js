/* Painter: sets up the canvas (optionally as a framed poster), seeds the
 * randomness from the game itself, and drives a style ply by ply. */
window.CM = window.CM || {};
CM.art = CM.art || {};

(function () {
  const { PALETTES, STYLES, PIECE_INDEX } = CM.art;

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(rng) {
    const perm = new Uint8Array(512), vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rng() * 2 - 1; }
    for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const fade = (t) => t * t * (3 - 2 * t);
    const v = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const tx = fade(x - xi), ty = fade(y - yi);
      const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
      return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    };
  }

  /** Layout for a canvas of width W. */
  function layout(W, poster) {
    if (!poster) return { W, H: W, S: W, x: 0, y: 0 };
    const S = Math.round(W * 0.84);
    return { W, H: Math.round(W * 1.17), S, x: Math.round((W - S) / 2), y: Math.round(W * 0.08) };
  }

  function seedFor(game, styleId, variation) {
    return hash(game.plies.map(p => p.san).join(' ') + '|' + styleId + '|' + variation);
  }

  function makeEnv(ctx, L, game, data, style, pal, variation) {
    const rng = mulberry32(seedFor(game, style.id, variation));
    let spare = null;
    const gauss = () => {
      if (spare != null) { const s = spare; spare = null; return s; }
      let u = 0, v = 0;
      while (u === 0) u = rng();
      v = rng();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
    const S = L.S;
    const m = S * 0.07;
    const cell = (S - 2 * m) / 8;
    return {
      ctx, S, m, cell, rng, gauss, pal, game, data,
      ox: L.x, oy: L.y, cur: -1, variation,
      noise: makeNoise(mulberry32(seedFor(game, 'noise', variation))),
      state: {},
      /** Fill the whole artwork (retained styles start every redraw with this). */
      clear(color) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = color || pal.bg;
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
      },
      center(sq) {
        const f = sq.charCodeAt(0) - 97, r = parseInt(sq[1], 10) - 1;
        return { x: m + (f + 0.5) * cell, y: m + (7 - r + 0.5) * cell };
      },
      color(side, piece) { return pal[side][PIECE_INDEX[piece]]; },
    };
  }

  function grain(ctx, L, pal) {
    // Fine deterministic paper grain over the art area.
    const rng = mulberry32(42);
    const n = Math.round((L.S * L.S) / 90);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      const x = L.x + rng() * L.S, y = L.y + rng() * L.S;
      ctx.fillStyle = rng() < 0.5 ? (pal.dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)') : (pal.dark ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)');
      ctx.fillRect(x, y, 1.2, 1.2);
    }
    ctx.restore();
  }

  function drawPosterText(ctx, L, game, pal, style, upTo) {
    const { W, H, S, x, y } = L;
    const h = game.headers;
    const white = h.White && h.White !== '?' ? h.White : 'White';
    const black = h.Black && h.Black !== '?' ? h.Black : 'Black';
    const top = y + S + W * 0.055;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = pal.fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let size = W * 0.04;
    const title = `${white} — ${black}`;
    ctx.font = `600 ${size}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
    while (ctx.measureText(title).width > S * 0.78 && size > W * 0.02) {
      size *= 0.94;
      ctx.font = `600 ${size}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
    }
    ctx.fillText(title, x, top);
    const res = game.result && game.result !== '*' ? game.result : '';
    ctx.textAlign = 'right';
    ctx.font = `600 ${W * 0.034}px "Iowan Old Style", Palatino, Georgia, serif`;
    ctx.fillText(res, x + S, top);
    ctx.textAlign = 'left';
    const sub = [h.Event, h.Site, h.Date && h.Date.replace(/\.\?\?/g, '')].filter(v => v && !/^\?+$/.test(v)).join('  ·  ');
    ctx.globalAlpha = 0.7;
    ctx.font = `${W * 0.019}px ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(sub || ' ', x, top + W * 0.035);
    ctx.globalAlpha = 0.45;
    ctx.font = `${W * 0.0145}px ui-monospace, Menlo, monospace`;
    const n = upTo + 1;
    const caption = `${style.code}  ${style.name.toUpperCase()}  ·  ${n} OF ${game.plies.length} PLIES  ·  ${pal.name.toUpperCase()}`;
    ctx.fillText(caption, x, H - W * 0.045);
    ctx.textAlign = 'right';
    ctx.fillText('SIXTY-FOUR STROKES', x + S, H - W * 0.045);
    ctx.restore();
  }

  /** Paint synchronously up to (and including) ply `upTo`. */
  function paintStatic(canvas, opts) {
    const job = begin(canvas, opts);
    for (let i = 0; i <= opts.upTo; i++) job.step(i);
    job.end(opts.upTo >= opts.game.plies.length - 1);
    return job;
  }

  /** File-name friendly label, e.g. "2.4-sumi". */
  function styleTag(style) { return `${style.code}-${style.id}`; }

  /** Prepare a canvas and return a job that paints ply by ply. */
  function begin(canvas, { game, data, styleId, paletteId, variation = 0, poster = false, width, upTo, grain: withGrain = true }) {
    const style = STYLES[styleId] || STYLES.flow;
    const pal = PALETTES[paletteId] || PALETTES.lagoon;
    const L = layout(width, poster);
    canvas.width = L.W;
    canvas.height = L.H;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, L.W, L.H);
    if (poster) {
      // a slightly different mount colour around the art
      ctx.fillStyle = CM.art.rgba(pal.fg, pal.dark ? 0.03 : 0.035);
      ctx.fillRect(0, 0, L.W, L.H);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(L.x, L.y, L.S, L.S);
      drawPosterText(ctx, L, game, pal, style, upTo == null ? game.plies.length - 1 : upTo);
    }
    const env = makeEnv(ctx, L, game, data, style, pal, variation);

    const inArt = (fn) => {
      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.beginPath();
      ctx.rect(0, 0, L.S, L.S);
      ctx.clip();
      fn();
      ctx.restore();
    };
    inArt(() => { if (style.setup) style.setup(env); });

    return {
      env, layout: L, style, pal,
      step(i) {
        env.cur = i;
        inArt(() => {
          ctx.globalCompositeOperation = pal.blend;
          if (style.ply) style.ply(env, i);
        });
      },
      /** Retained styles redraw everything from their state here; others draw as they go. */
      present(final) {
        if (style.present && env.cur >= 0) inArt(() => style.present(env, final));
      },
      end(complete) {
        inArt(() => {
          ctx.globalCompositeOperation = pal.blend;
          if (complete && style.finish) style.finish(env);
        });
        this.present(true);
        if (style.grain !== false && withGrain) grain(ctx, L, pal);
      },
      updateCaption(upTo) {
        if (!poster) return;
        // repaint the caption strip only
        const { W, H } = L;
        ctx.save();
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, H - W * 0.075, W, W * 0.075);
        ctx.fillStyle = CM.art.rgba(pal.fg, pal.dark ? 0.03 : 0.035);
        ctx.fillRect(0, H - W * 0.075, W, W * 0.075);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = pal.fg;
        ctx.font = `${W * 0.0145}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`${style.code}  ${style.name.toUpperCase()}  ·  ${upTo + 1} OF ${game.plies.length} PLIES  ·  ${pal.name.toUpperCase()}`, L.x, H - W * 0.045);
        ctx.textAlign = 'right';
        ctx.fillText('SIXTY-FOUR STROKES', L.x + L.S, H - W * 0.045);
        ctx.restore();
      },
    };
  }

  CM.art.painter = { begin, paintStatic, layout, styleTag };
})();
