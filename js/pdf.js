/* A Canvas-2D-compatible context that records drawing as a vector PDF.
 *
 * The art styles only ever talk to a CanvasRenderingContext2D, so exporting a
 * vector file means handing them this object instead of a real canvas. Paths,
 * fills, strokes, alpha, blend modes, clipping, dashes and transforms become
 * real PDF vector operators; text in Latin-1 uses the standard PDF fonts.
 * Things PDF cannot express directly (gradients with alpha, pixel buffers,
 * other glyphs) are rendered with a real canvas at full resolution and placed
 * as images, clipped exactly like the rest. */
window.CM = window.CM || {};

(function () {
  const fmt = (n) => { const r = Math.round(n * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
  const KAPPA = 0.5522847498;

  // ---- 2D affine matrices [a, b, c, d, e, f] ---------------------------------
  const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

  // ---- colours ------------------------------------------------------------------
  const probe = document.createElement('canvas').getContext('2d');
  const colorCache = new Map();
  function parseColor(c) {
    if (typeof c !== 'string') return null;
    let v = colorCache.get(c);
    if (v) return v;
    let m;
    if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { const n = parseInt(m[1], 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
    else if ((m = /^#([0-9a-f]{3})$/i.exec(c))) { v = [...m[1]].map(h => parseInt(h + h, 16)).concat(1); }
    else if ((m = /^rgba?\(([^)]+)\)$/i.exec(c))) { const p = m[1].split(',').map(s => parseFloat(s)); v = [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    else { probe.fillStyle = '#000'; probe.fillStyle = c; return probe.fillStyle === c ? null : parseColor(probe.fillStyle); }
    colorCache.set(c, v);
    return v;
  }

  const WINANSI = { '\u2014': '\x97', '\u2013': '\x96', '\u2018': '\x91', '\u2019': '\x92', '\u201c': '\x93', '\u201d': '\x94', '\u2026': '\x85', '\u2022': '\x95', '\u2212': '-' };
  const BLEND = { 'source-over': 'Normal', multiply: 'Multiply', screen: 'Screen', 'soft-light': 'SoftLight', overlay: 'Overlay', lighter: 'Screen', darken: 'Darken', lighten: 'Lighten' };
  const CAP = { butt: 0, round: 1, square: 2 };
  const JOIN = { miter: 0, round: 1, bevel: 2 };

  /** Gradient stand-in: remembers its parameters so it can be rebuilt on a real canvas. */
  class Grad {
    constructor(kind, args) { this.kind = kind; this.args = args; this.stops = []; }
    addColorStop(o, c) { this.stops.push([o, c]); }
    build(ctx) {
      const g = this.kind === 'linear' ? ctx.createLinearGradient(...this.args) : ctx.createRadialGradient(...this.args);
      for (const [o, c] of this.stops) g.addColorStop(o, c);
      return g;
    }
  }

  class PDFContext {
    constructor(width, height, pageWidthPt) {
      this.width = width; this.height = height;
      this.k = pageWidthPt / width;                       // device units → points
      this.pageW = pageWidthPt; this.pageH = height * this.k;
      this.out = [];
      this.images = [];                                    // { w, h, rgb, alpha }
      this.imageIds = new Map();                           // source canvas → index (reuse repeated sprites)
      this.gstates = new Map();
      this.fonts = new Map();
      this.st = {
        m: [1, 0, 0, 1, 0, 0], fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
        globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', dash: [],
        imageSmoothingEnabled: true, imageSmoothingQuality: 'low', lineDashOffset: 0, miterLimit: 10,
      };
      this.stack = [];
      this.path = [];                                      // user-space commands (for raster fallbacks)
      this.dev = [];                                       // device-space commands
      this.canvas = { width, height };
      // flip to PDF's y-up page and scale to points
      this.out.push(`${fmt(this.k)} 0 0 ${fmt(-this.k)} 0 ${fmt(this.pageH)} cm`);
    }

    // ---- state ---------------------------------------------------------------
    save() { this.stack.push({ ...this.st, m: this.st.m.slice(), dash: this.st.dash.slice() }); this.out.push('q'); }
    restore() { if (!this.stack.length) return; this.st = this.stack.pop(); this.out.push('Q'); }
    get fillStyle() { return this.st.fillStyle; } set fillStyle(v) { this.st.fillStyle = v; }
    get strokeStyle() { return this.st.strokeStyle; } set strokeStyle(v) { this.st.strokeStyle = v; }
    get lineWidth() { return this.st.lineWidth; } set lineWidth(v) { if (v > 0 && isFinite(v)) this.st.lineWidth = v; }
    get lineCap() { return this.st.lineCap; } set lineCap(v) { this.st.lineCap = v; }
    get lineJoin() { return this.st.lineJoin; } set lineJoin(v) { this.st.lineJoin = v; }
    get miterLimit() { return this.st.miterLimit; } set miterLimit(v) { this.st.miterLimit = v; }
    get globalAlpha() { return this.st.globalAlpha; } set globalAlpha(v) { if (v >= 0 && v <= 1) this.st.globalAlpha = v; }
    get globalCompositeOperation() { return this.st.globalCompositeOperation; } set globalCompositeOperation(v) { this.st.globalCompositeOperation = v; }
    get font() { return this.st.font; } set font(v) { this.st.font = v; }
    get textAlign() { return this.st.textAlign; } set textAlign(v) { this.st.textAlign = v; }
    get textBaseline() { return this.st.textBaseline; } set textBaseline(v) { this.st.textBaseline = v; }
    get imageSmoothingEnabled() { return this.st.imageSmoothingEnabled; } set imageSmoothingEnabled(v) { this.st.imageSmoothingEnabled = v; }
    get imageSmoothingQuality() { return this.st.imageSmoothingQuality; } set imageSmoothingQuality(v) { this.st.imageSmoothingQuality = v; }
    get lineDashOffset() { return this.st.lineDashOffset; } set lineDashOffset(v) { this.st.lineDashOffset = v; }
    setLineDash(a) { this.st.dash = (a || []).slice(); }
    getLineDash() { return this.st.dash.slice(); }

    // ---- transforms --------------------------------------------------------------
    setTransform(a, b, c, d, e, f) { this.st.m = typeof a === 'object' ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f]; }
    resetTransform() { this.st.m = [1, 0, 0, 1, 0, 0]; }
    transform(a, b, c, d, e, f) { this.st.m = mul(this.st.m, [a, b, c, d, e, f]); }
    translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
    scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.transform(c, s, -s, c, 0, 0); }
    getTransform() { const m = this.st.m; return { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }; }

    // ---- paths ---------------------------------------------------------------------
    beginPath() { this.path = []; this.dev = []; this.cur = null; this.start = null; }
    _pt(x, y) { return apply(this.st.m, x, y); }
    moveTo(x, y) { this.path.push(['moveTo', x, y]); const p = this._pt(x, y); this.dev.push(`${fmt(p[0])} ${fmt(p[1])} m`); this.cur = [x, y]; this.start = [x, y]; }
    lineTo(x, y) {
      if (!this.cur) return this.moveTo(x, y);
      this.path.push(['lineTo', x, y]); const p = this._pt(x, y); this.dev.push(`${fmt(p[0])} ${fmt(p[1])} l`); this.cur = [x, y];
    }
    bezierCurveTo(x1, y1, x2, y2, x, y) {
      if (!this.cur) this.moveTo(x1, y1);
      this.path.push(['bezierCurveTo', x1, y1, x2, y2, x, y]);
      const a = this._pt(x1, y1), b = this._pt(x2, y2), c = this._pt(x, y);
      this.dev.push(`${fmt(a[0])} ${fmt(a[1])} ${fmt(b[0])} ${fmt(b[1])} ${fmt(c[0])} ${fmt(c[1])} c`);
      this.cur = [x, y];
    }
    quadraticCurveTo(cx, cy, x, y) {
      if (!this.cur) this.moveTo(cx, cy);
      const [x0, y0] = this.cur;
      this.bezierCurveTo(x0 + (2 / 3) * (cx - x0), y0 + (2 / 3) * (cy - y0), x + (2 / 3) * (cx - x), y + (2 / 3) * (cy - y), x, y);
    }
    closePath() { if (!this.cur) return; this.path.push(['closePath']); this.dev.push('h'); if (this.start) this.cur = this.start.slice(); }
    rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
    roundRect(x, y, w, h) { this.rect(x, y, w, h); }
    ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
      if (rx < 0 || ry < 0) return;
      let sweep = a1 - a0;
      if (!ccw && sweep < 0) sweep = (sweep % (Math.PI * 2)) + Math.PI * 2;
      if (ccw && sweep > 0) sweep = (sweep % (Math.PI * 2)) - Math.PI * 2;
      if (Math.abs(a1 - a0) >= Math.PI * 2) sweep = ccw ? -Math.PI * 2 : Math.PI * 2;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const P = (t) => { const ex = Math.cos(t) * rx, ey = Math.sin(t) * ry; return [x + ex * cr - ey * sr, y + ex * sr + ey * cr]; };
      const D = (t) => { const ex = -Math.sin(t) * rx, ey = Math.cos(t) * ry; return [ex * cr - ey * sr, ex * sr + ey * cr]; };
      const n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
      const step = sweep / n, h = (4 / 3) * Math.tan(step / 4);
      const p0 = P(a0);
      if (this.cur) this.lineTo(p0[0], p0[1]); else this.moveTo(p0[0], p0[1]);
      for (let i = 0; i < n; i++) {
        const t0 = a0 + i * step, t1 = t0 + step, q0 = P(t0), q1 = P(t1), d0 = D(t0), d1 = D(t1);
        this.bezierCurveTo(q0[0] + d0[0] * h, q0[1] + d0[1] * h, q1[0] - d1[0] * h, q1[1] - d1[1] * h, q1[0], q1[1]);
      }
    }
    arc(x, y, r, a0, a1, ccw) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
    arcTo(x1, y1, x2, y2) { this.lineTo(x1, y1); this.lineTo(x2, y2); }

    // ---- graphics state for one paint operation ---------------------------------------
    _gs(fillA, strokeA) {
      const bm = BLEND[this.st.globalCompositeOperation] || 'Normal';
      const key = `${fmt(fillA)}|${fmt(strokeA)}|${bm}`;
      let name = this.gstates.get(key);
      if (!name) { name = 'G' + this.gstates.size; this.gstates.set(key, name); }
      return `/${name} gs`;
    }
    _strokeParams() {
      const s = scaleOf(this.st.m), ops = [`${fmt(this.st.lineWidth * s)} w`, `${CAP[this.st.lineCap] || 0} J`, `${JOIN[this.st.lineJoin] || 0} j`];
      ops.push(this.st.dash.length ? `[${this.st.dash.map(d => fmt(d * s)).join(' ')}] ${fmt(this.st.lineDashOffset * s)} d` : '[] 0 d');
      return ops.join(' ');
    }
    _skip() { return this.st.globalCompositeOperation === 'destination-out' || this.st.globalAlpha <= 0; }

    fill(rule) {
      if (!this.dev.length || this._skip()) return;
      const style = this.st.fillStyle;
      if (style instanceof Grad || typeof style !== 'string') return this._rasterPaint('fill', rule);
      const c = parseColor(style);
      if (!c || c[3] * this.st.globalAlpha <= 0) return;
      this.out.push(`q ${this._gs(c[3] * this.st.globalAlpha, 1)} ${fmt(c[0] / 255)} ${fmt(c[1] / 255)} ${fmt(c[2] / 255)} rg ${this.dev.join(' ')} ${rule === 'evenodd' ? 'f*' : 'f'} Q`);
    }
    stroke() {
      if (!this.dev.length || this._skip()) return;
      const style = this.st.strokeStyle;
      if (style instanceof Grad || typeof style !== 'string') return this._rasterPaint('stroke');
      const c = parseColor(style);
      if (!c || c[3] * this.st.globalAlpha <= 0) return;
      this.out.push(`q ${this._gs(1, c[3] * this.st.globalAlpha)} ${fmt(c[0] / 255)} ${fmt(c[1] / 255)} ${fmt(c[2] / 255)} RG ${this._strokeParams()} ${this.dev.join(' ')} S Q`);
    }
    clip(rule) { if (this.dev.length) this.out.push(`${this.dev.join(' ')} ${rule === 'evenodd' ? 'W*' : 'W'} n`); }
    fillRect(x, y, w, h) { const p = this.path, d = this.dev; this.beginPath(); this.rect(x, y, w, h); this.fill(); this.path = p; this.dev = d; }
    strokeRect(x, y, w, h) { const p = this.path, d = this.dev; this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.path = p; this.dev = d; }
    clearRect() {}

    /** Paint the current path on a real canvas (for gradients) and place it as an image. */
    _rasterPaint(mode, rule) {
      const pad = mode === 'stroke' ? this.st.lineWidth * scaleOf(this.st.m) + 2 : 2;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const op of this.path) {
        for (let i = 1; i + 1 < op.length; i += 2) {
          const [x, y] = this._pt(op[i], op[i + 1]);
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
      x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
      x1 = Math.min(this.width, Math.ceil(x1 + pad)); y1 = Math.min(this.height, Math.ceil(y1 + pad));
      const w = x1 - x0, h = y1 - y0;
      if (w < 1 || h < 1) return;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const m = this.st.m;
      g.setTransform(m[0], m[1], m[2], m[3], m[4] - x0, m[5] - y0);
      g.globalAlpha = this.st.globalAlpha;
      g.lineWidth = this.st.lineWidth; g.lineCap = this.st.lineCap; g.lineJoin = this.st.lineJoin; g.setLineDash(this.st.dash);
      const style = mode === 'fill' ? this.st.fillStyle : this.st.strokeStyle;
      const paint = style instanceof Grad ? style.build(g) : style;
      g.beginPath();
      for (const [op, ...a] of this.path) g[op](...a);
      if (mode === 'fill') { g.fillStyle = paint; g.fill(rule); } else { g.strokeStyle = paint; g.stroke(); }
      this._placeImage(c, [1, 0, 0, 1, 0, 0], x0, y0, w, h, true);
    }

    createLinearGradient(...a) { return new Grad('linear', a); }
    createRadialGradient(...a) { return new Grad('radial', a); }
    createPattern() { return '#808080'; }

    // ---- images ----------------------------------------------------------------------
    drawImage(img, ...a) {
      if (this._skip()) return;
      let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
      if (a.length === 2) [dx, dy] = a, dw = sw, dh = sh;
      else if (a.length === 4) [dx, dy, dw, dh] = a;
      else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
      let src = img;
      if (sx || sy || sw !== img.width || sh !== img.height) {
        src = document.createElement('canvas'); src.width = Math.max(1, Math.round(sw)); src.height = Math.max(1, Math.round(sh));
        src.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, src.width, src.height);
      }
      this._placeImage(src, this.st.m, dx, dy, dw, dh, false);
    }
    _placeImage(src, m, dx, dy, dw, dh, fresh) {
      let id = fresh ? undefined : this.imageIds.get(src);
      if (id === undefined) {
        const w = src.width, h = src.height;
        const data = src.getContext ? src.getContext('2d').getImageData(0, 0, w, h).data : null;
        if (!data) return;
        const rgb = new Uint8Array(w * h * 3), alpha = new Uint8Array(w * h);
        let opaque = true;
        for (let i = 0, j = 0, k = 0; i < data.length; i += 4) {
          const a8 = data[i + 3];
          // canvas pixels are un-premultiplied already; keep colour, store alpha separately
          rgb[j++] = data[i]; rgb[j++] = data[i + 1]; rgb[j++] = data[i + 2]; alpha[k++] = a8;
          if (a8 !== 255) opaque = false;
        }
        id = this.images.length;
        this.images.push({ w, h, rgb, alpha: opaque ? null : alpha });
        if (!fresh) this.imageIds.set(src, id);
      }
      const M = mul(m, [dw, 0, 0, -dh, dx, dy + dh]);
      this.out.push(`q ${this._gs(this.st.globalAlpha, 1)} ${M.map(fmt).join(' ')} cm /I${id} Do Q`);
    }

    // ---- text -------------------------------------------------------------------------
    measureText(t) { probe.font = this.st.font; return probe.measureText(t); }
    _fontInfo() {
      const f = this.st.font;
      const size = parseFloat((/(\d+(?:\.\d+)?)px/.exec(f) || [0, 10])[1]);
      const bold = /\b(bold|[6-9]00)\b/.test(f), italic = /\bitalic\b/.test(f);
      const fam = /mono|Menlo|Consolas|Courier/i.test(f) ? 'mono' : /serif/i.test(f.replace(/sans-serif/gi, '')) ? 'serif' : 'sans';
      const base = { sans: ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'], serif: ['Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'], mono: ['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique'] }[fam];
      return { size, name: base[(bold ? 1 : 0) + (italic ? 2 : 0)] };
    }
    fillText(text, x, y) {
      text = String(text).replace(/\uFE0E/g, '');
      if (!text || this._skip()) return;
      const style = this.st.fillStyle, c = parseColor(typeof style === 'string' ? style : '#000');
      // WinAnsi covers Latin-1 plus common typography; anything else is placed as an image
      const ansi = text.replace(/[\u2014\u2013\u2018\u2019\u201c\u201d\u2026\u2022\u2212]/g, (ch) => WINANSI[ch]);
      if (!c || /[^\x20-\x7e\x85-\x97\xa0-\xff]/.test(ansi)) return this._rasterText(text, x, y);
      const { size, name } = this._fontInfo();
      const width = this.measureText(text).width;
      const al = this.st.textAlign, bl = this.st.textBaseline;
      const ox = al === 'center' ? -width / 2 : al === 'right' || al === 'end' ? -width : 0;
      const oy = bl === 'middle' ? size * 0.35 : bl === 'top' || bl === 'hanging' ? size * 0.8 : bl === 'bottom' ? -size * 0.2 : 0;
      let fid = this.fonts.get(name);
      if (!fid) { fid = 'F' + this.fonts.size; this.fonts.set(name, fid); }
      const M = mul(this.st.m, [1, 0, 0, -1, x + ox, y + oy]);
      const esc = ansi.replace(/[\\()]/g, '\\$&');
      this.out.push(`q ${this._gs(c[3] * this.st.globalAlpha, 1)} ${fmt(c[0] / 255)} ${fmt(c[1] / 255)} ${fmt(c[2] / 255)} rg BT /${fid} ${fmt(size)} Tf ${M.map(fmt).join(' ')} Tm (${esc}) Tj ET Q`);
    }
    strokeText() {}
    _rasterText(text, x, y) {
      const { size } = this._fontInfo();
      const pad = Math.ceil(size * 0.6), w = Math.ceil(this.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.6) + pad * 2;
      const c = document.createElement('canvas'), sc = Math.max(1, Math.min(4, scaleOf(this.st.m) * 2));
      c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
      const g = c.getContext('2d');
      g.scale(sc, sc);
      g.font = this.st.font; g.fillStyle = typeof this.st.fillStyle === 'string' ? this.st.fillStyle : '#000';
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(text, pad, pad + size * 1.15);
      const width = this.measureText(text).width, al = this.st.textAlign, bl = this.st.textBaseline;
      const ox = al === 'center' ? -width / 2 : al === 'right' || al === 'end' ? -width : 0;
      const oy = bl === 'middle' ? size * 0.35 : bl === 'top' || bl === 'hanging' ? size * 0.8 : 0;
      this._placeImage(c, this.st.m, x + ox - pad, y + oy - pad - size * 1.15, w, h, true);
    }

    getImageData() { throw new Error('pixel access is not available in vector export'); }
    putImageData() { throw new Error('pixel access is not available in vector export'); }
    createImageData(w, h) { return probe.createImageData(w, h); }

    // ---- serialise --------------------------------------------------------------------
    async toBlob() {
      const enc = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
      const deflate = async (bytes) => {
        if (typeof CompressionStream === 'undefined') return null;
        const cs = new CompressionStream('deflate');
        const buf = await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer();
        return new Uint8Array(buf);
      };
      const objs = [];                     // each: array of Uint8Array / string parts
      const add = (parts) => { objs.push(parts); return objs.length; };
      const stream = async (dict, bytes) => {
        const z = await deflate(bytes);
        const data = z || bytes;
        return [`<< ${dict}${z ? ' /Filter /FlateDecode' : ''} /Length ${data.length} >>\nstream\n`, data, '\nendstream'];
      };

      const fontRefs = [];
      for (const [name, id] of this.fonts) fontRefs.push(`/${id} ${add([`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`])} 0 R`);
      const gsRefs = [];
      for (const [key, id] of this.gstates) {
        const [ca, CA, bm] = key.split('|');
        gsRefs.push(`/${id} ${add([`<< /Type /ExtGState /ca ${ca} /CA ${CA} /BM /${bm} >>`])} 0 R`);
      }
      const imgRefs = [];
      for (let i = 0; i < this.images.length; i++) {
        const im = this.images[i];
        let smask = '';
        if (im.alpha) smask = ` /SMask ${add(await stream(`/Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8`, im.alpha))} 0 R`;
        imgRefs.push(`/I${i} ${add(await stream(`/Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8${smask}`, im.rgb))} 0 R`);
      }
      const content = add(await stream('', enc(this.out.join('\n'))));
      const pagesId = objs.length + 2;
      const page = add([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${fmt(this.pageW)} ${fmt(this.pageH)}] /Contents ${content} 0 R /Resources << /Font << ${fontRefs.join(' ')} >> /ExtGState << ${gsRefs.join(' ')} >> /XObject << ${imgRefs.join(' ')} >> >> >>`]);
      add([`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`]);
      const info = add([`<< /Producer (Sixty-Four Strokes) /Title (${(this.title || 'Chess art').replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '')}) >>`]);
      const catalog = add([`<< /Type /Catalog /Pages ${pagesId} 0 R >>`]);

      const parts = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
      let offset = 15;
      const offsets = [];
      objs.forEach((o, i) => {
        offsets.push(offset);
        const chunk = [`${i + 1} 0 obj\n`, ...o, '\nendobj\n'];
        for (const c of chunk) { parts.push(c); offset += typeof c === 'string' ? c.length : c.length; }
      });
      const xref = offset;
      let tail = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
      for (const o of offsets) tail += `${String(o).padStart(10, '0')} 00000 n \n`;
      tail += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      parts.push(tail);
      return new Blob(parts.map(p => (typeof p === 'string' ? enc(p) : p)), { type: 'application/pdf' });
    }
  }

  /** A stand-in <canvas> whose 2D context writes a PDF. */
  function pdfCanvas(pageWidthPt) {
    const c = {
      _w: 300, _h: 150, ctx: null,
      get width() { return this._w; }, set width(v) { this._w = v; this.ctx = null; },
      get height() { return this._h; }, set height(v) { this._h = v; this.ctx = null; },
      getContext() { if (!this.ctx) this.ctx = new PDFContext(this._w, this._h, pageWidthPt); return this.ctx; },
    };
    return c;
  }

  CM.pdf = { PDFContext, pdfCanvas };
})();
