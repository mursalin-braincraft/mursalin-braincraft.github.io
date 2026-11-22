/* UI: game loading, the numbered style gallery (filter by group, code or name,
 * favourites), the viewer (animate, scrub, remix) and PNG export. */
(function () {
  const $ = (id) => document.getElementById(id);
  const { PALETTES, STYLES, STYLE_LIST, GROUPS, painter } = CM.art;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const settings = Object.assign({ style: 'bauhaus', palette: 'lagoon', poster: false, speed: 8, group: 'all', query: '' }, store.get('64strokes:settings', {}));
  if (!STYLES[settings.style] || settings.v !== 2) settings.style = 'bauhaus'; // v2: Bauhaus Tiles became the default
  settings.v = 2;
  if (!PALETTES[settings.palette]) settings.palette = 'lagoon';
  const favs = new Set(store.get('64strokes:favs', []).filter(id => STYLES[id]));
  const save = () => store.set('64strokes:settings', settings);
  const saveFavs = () => store.set('64strokes:favs', [...favs]);

  let games = [], game = null, data = null;
  let variation = 0, upTo = 0, anim = null, booting = true;
  let gen = 0; // bumps whenever thumbnails go stale (game, palette or variation changed)
  const canvas = $('art');
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const styleNow = () => STYLES[settings.style];
  const groupOf = (s) => GROUPS[s.group - 1];

  $('styleCount').textContent = STYLE_LIST.length;

  // ---- palettes ----------------------------------------------------------------
  CM.SAMPLES.forEach((s) => $('sample').add(new Option(s.name, s.id)));
  const palBtns = {};
  for (const [id, p] of Object.entries(PALETTES)) {
    const b = document.createElement('button');
    b.className = 'pal-btn';
    b.type = 'button';
    b.title = p.name;
    b.innerHTML = `<span class="dots">${[p.bg, p.w[0], p.w[3], p.b[0], p.b[3]].map(c => `<i style="background:${c}"></i>`).join('')}</span>${esc(p.name)}`;
    b.addEventListener('click', () => { settings.palette = id; save(); syncPalettes(); invalidateThumbs(); renderStatic(); });
    $('palettes').appendChild(b);
    palBtns[id] = b;
  }
  function syncPalettes() { for (const [id, b] of Object.entries(palBtns)) b.setAttribute('aria-pressed', id === settings.palette); }

  // ---- gallery -------------------------------------------------------------------
  const cards = {}; // id → { el, canvas, thumb, gen, visible }
  const sections = {};
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { const c = cards[e.target.dataset.id]; if (c) c.visible = e.isIntersecting; }
    scheduleThumbs();
  }, { rootMargin: '300px 0px' });

  for (const g of GROUPS) {
    const sec = document.createElement('section');
    sec.className = 'group-sec';
    sec.dataset.group = g.n;
    const members = STYLE_LIST.filter(s => s.group === g.n);
    sec.innerHTML = `<h3><span class="gnum">${g.n}</span>${esc(g.name)} <span class="gcount">${members.length} styles</span></h3><p class="gblurb">${esc(g.blurb)}</p><div class="cards"></div>`;
    const grid = sec.querySelector('.cards');
    for (const s of members) {
      const el = document.createElement('article');
      el.className = 'sc';
      el.dataset.id = s.id;
      el.innerHTML = `<button class="sc-thumb pending" type="button" aria-label="${esc(s.code + ' ' + s.name)}"><canvas width="220" height="220"></canvas></button>
        <div class="sc-meta"><span class="sc-code">${s.code}</span><span class="sc-name" title="${esc(s.name)}">${esc(s.name)}</span><button class="sc-fav" type="button" aria-label="Favourite ${esc(s.name)}" aria-pressed="false">☆</button></div>`;
      el.querySelector('.sc-thumb').addEventListener('click', () => select(s.id, true));
      el.querySelector('.sc-fav').addEventListener('click', () => toggleFav(s.id));
      grid.appendChild(el);
      cards[s.id] = { el, canvas: el.querySelector('canvas'), thumb: el.querySelector('.sc-thumb'), gen: -1, visible: false };
      io.observe(el);
    }
    sections[g.n] = sec;
    $('gallery').appendChild(sec);
  }

  function buildChips() {
    const box = $('groupChips');
    box.innerHTML = '';
    const mk = (key, html) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.innerHTML = html;
      b.setAttribute('aria-pressed', String(settings.group) === String(key));
      b.addEventListener('click', () => { settings.group = String(settings.group) === String(key) && key !== 'all' ? 'all' : key; save(); buildChips(); applyFilter(); });
      box.appendChild(b);
    };
    mk('all', `All <span class="c">${STYLE_LIST.length}</span>`);
    mk('fav', `★ Favourites <span class="c">${favs.size}</span>`);
    for (const g of GROUPS) mk(g.n, `<span class="n">${g.n}</span>${esc(g.name)} <span class="c">${STYLE_LIST.filter(s => s.group === g.n).length}</span>`);
  }

  /** Does a style pass the group chip and the search box?
   *  Search terms (comma or space separated, any may match): "3" a group,
   *  "2.4" a code, "2." a code prefix, otherwise part of a name or group name. */
  function matches(s) {
    if (settings.group === 'fav' && !favs.has(s.id)) return false;
    if (settings.group !== 'all' && settings.group !== 'fav' && s.group !== Number(settings.group)) return false;
    const terms = settings.query.toLowerCase().split(/[\s,;]+/).filter(Boolean);
    if (!terms.length) return true;
    const hay = `${s.name} ${s.id} ${groupOf(s).name}`.toLowerCase();
    return terms.some(t => {
      if (/^\d+$/.test(t)) return s.group === Number(t);
      if (/^\d+\.\d*$/.test(t)) return t.endsWith('.') ? s.code.startsWith(t) : s.code === t;
      return hay.includes(t);
    });
  }
  const visibleList = () => STYLE_LIST.filter(matches);

  function applyFilter() {
    let shown = 0;
    for (const s of STYLE_LIST) { const ok = matches(s); cards[s.id].el.hidden = !ok; if (ok) shown++; }
    for (const g of GROUPS) sections[g.n].hidden = !STYLE_LIST.some(s => s.group === g.n && matches(s));
    $('emptyMsg').hidden = shown > 0;
    const filtered = shown !== STYLE_LIST.length;
    $('filterNote').textContent = filtered ? `Showing ${shown} of ${STYLE_LIST.length} styles. [ and ] step through these.` : '';
    scheduleThumbs();
  }

  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    saveFavs();
    syncFavs();
    buildChips();
    if (settings.group === 'fav') applyFilter();
  }
  function syncFavs() {
    for (const s of STYLE_LIST) {
      const b = cards[s.id].el.querySelector('.sc-fav'), on = favs.has(s.id);
      b.setAttribute('aria-pressed', on); b.textContent = on ? '★' : '☆';
    }
    const on = favs.has(settings.style);
    $('curFav').setAttribute('aria-pressed', on);
    $('curFav').textContent = on ? '★' : '☆';
  }

  // ---- thumbnails: rendered lazily, visible ones first ----------------------------
  let thumbTimer = null;
  function invalidateThumbs() {
    gen++;
    for (const c of Object.values(cards)) c.thumb.classList.add('pending');
    scheduleThumbs();
  }
  function scheduleThumbs() {
    if (thumbTimer || !game) return;
    thumbTimer = setTimeout(workThumbs, anim ? 120 : 16);
  }
  function workThumbs() {
    thumbTimer = null;
    if (!game) return;
    const t0 = performance.now();
    const todo = STYLE_LIST.filter(s => cards[s.id].gen !== gen && !cards[s.id].el.hidden)
      .sort((a, b) => cards[b.id].visible - cards[a.id].visible);
    for (const s of todo) {
      const c = cards[s.id];
      painter.paintStatic(c.canvas, { game, data, styleId: s.id, paletteId: settings.palette, variation, poster: false, width: 220, upTo: game.plies.length - 1 });
      c.gen = gen;
      c.thumb.classList.remove('pending');
      if (performance.now() - t0 > 45) break;
    }
    if (STYLE_LIST.some(s => cards[s.id].gen !== gen && !cards[s.id].el.hidden)) scheduleThumbs();
  }

  // ---- selection ------------------------------------------------------------------
  function select(id, scrollViewer) {
    if (!STYLES[id]) return;
    settings.style = id;
    save();
    syncStyleInfo();
    try { history.replaceState(null, '', '#' + STYLES[id].code); } catch (e) { /* file:// may refuse */ }
    renderStatic();
    if (scrollViewer) $('stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function syncStyleInfo() {
    const s = styleNow(), g = groupOf(s);
    $('curCode').textContent = s.code;
    $('curName').textContent = s.name;
    $('curGroup').textContent = `${g.n} · ${g.name}`;
    $('blurb').textContent = s.blurb;
    for (const c of Object.values(cards)) c.el.classList.toggle('sel', c.el.dataset.id === s.id);
    $('varLabel').textContent = variation ? '#' + (variation + 1) : '';
    document.title = `${s.code} ${s.name} · Sixty-Four Strokes`;
    syncFavs();
  }
  function step(dir) {
    const list = visibleList();
    if (!list.length) return;
    const i = list.findIndex(s => s.id === settings.style);
    const next = list[(i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length)];
    select(next.id);
  }

  // ---- loading ---------------------------------------------------------------------
  function showError(msg) { $('error').textContent = msg || ''; }

  function loadText(text, animate) {
    showError('');
    const t = (text || '').trim();
    if (!t) { showError('Paste a PGN or choose a famous game first.'); return; }
    games = CM.pgn.splitGames(t);
    const pick = $('gamePick');
    pick.innerHTML = '';
    pick.hidden = games.length < 2;
    if (games.length > 1) {
      games.forEach((g, i) => {
        const h = CM.pgn.quickHeaders(g);
        pick.add(new Option(`${i + 1}. ${h.White || '?'} – ${h.Black || '?'} ${h.Result ? '(' + h.Result + ')' : ''}${h.Event && h.Event !== '?' ? ' · ' + h.Event : ''}`, i));
      });
    }
    loadGame(0, animate);
  }

  function loadGame(i, animate) {
    let parsed;
    try {
      parsed = CM.pgn.parseGame(games[i]);
    } catch (e) {
      showError(e.message);
      if (booting) { games = [CM.SAMPLES[0].pgn]; $('pgn').value = games[0]; return loadGame(0, false); }
      return;
    }
    stopAnim();
    game = parsed;
    data = CM.art.analyseGame(game);
    variation = 0;
    store.set('64keys:pgn', $('pgn').value);
    const h = game.headers;
    const white = h.White && h.White !== '?' ? h.White : 'White';
    const black = h.Black && h.Black !== '?' ? h.Black : 'Black';
    $('players').innerHTML = `<span class="pw">${esc(white)}</span> <span class="vs">vs</span> <span class="pb">${esc(black)}</span> <span class="res">${esc(game.result)}</span>`;
    const ev = [h.Event, h.Site, h.Date && h.Date.replace(/\.\?\?/g, '')].filter(x => x && !/^\?+$/.test(x)).join(' · ');
    $('eventLine').textContent = ev + (ev ? ' · ' : '') + game.plies.length + ' plies';
    $('upTo').max = game.plies.length - 1;
    upTo = game.plies.length - 1;
    $('stage').hidden = false;
    setEditor(false);
    syncStyleInfo();
    invalidateThumbs();
    if (animate) paintAnimated(); else renderStatic();
    if (!booting) $('stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setEditor(open) {
    $('gbSummary').hidden = !game;
    $('gbEditor').hidden = !!game && !open;
    $('editGame').setAttribute('aria-expanded', String(!!open));
    $('editGame').textContent = open ? 'Close' : 'Change game';
  }

  // ---- rendering ----------------------------------------------------------------------
  function displayWidth(scale = 1) {
    const css = canvas.parentElement.clientWidth || 700;
    return Math.max(240, Math.round(Math.min(1800, css * Math.min(2, window.devicePixelRatio || 1)) * scale));
  }
  function opts(extra) {
    $('stage').classList.toggle('poster', settings.poster);
    return Object.assign({ game, data, styleId: settings.style, paletteId: settings.palette, variation, poster: settings.poster, width: displayWidth(), upTo }, extra || {});
  }
  let renderToken = 0;
  function renderStatic(extra) {
    if (!game) return;
    stopAnim();
    const token = ++renderToken;
    const run = () => {
      if (token !== renderToken) return; // a newer render was requested
      painter.paintStatic(canvas, opts(extra));
      $('frame').classList.remove('busy');
      updateTimeline(false);
    };
    // Slow styles: show a "Painting…" badge first, then render on the next frame.
    if (styleNow().heavy) { $('frame').classList.add('busy'); setTimeout(run, 30); } else run();
  }
  function updateTimeline(showTag) {
    $('upTo').value = upTo;
    const p = game.plies[upTo];
    const label = p ? `${p.moveNumber}${p.color === 'w' ? '.' : '…'} ${p.san}` : '';
    $('upToLabel').textContent = label;
    $('moveTag').textContent = label;
    $('moveTag').classList.toggle('show', !!showTag);
  }

  function paintAnimated() {
    if (!game) return;
    stopAnim();
    const last = game.plies.length - 1;
    const job = painter.begin(canvas, opts({ upTo: 0 }));
    let i = 0, acc = 1, prev = performance.now();
    $('paintBtn').textContent = '❚❚';
    $('paintBtn').classList.add('on');
    const tick = (now) => {
      acc += ((now - prev) / 1000) * settings.speed;
      prev = now;
      let drew = false;
      while (acc >= 1 && i <= last) { job.step(i++); acc -= 1; drew = true; }
      if (drew) { upTo = i - 1; job.present(false); job.updateCaption(upTo); updateTimeline(true); }
      if (i > last) { job.end(true); finishAnim(); return; }
      anim.raf = requestAnimationFrame(tick);
    };
    anim = { raf: requestAnimationFrame(tick), job };
  }
  function finishAnim() {
    anim = null;
    $('paintBtn').textContent = '▶';
    $('paintBtn').classList.remove('on');
    setTimeout(() => { if (!anim) $('moveTag').classList.remove('show'); }, 900);
    scheduleThumbs();
  }
  function stopAnim() {
    if (!anim) return;
    cancelAnimationFrame(anim.raf);
    anim.job.end(false);
    finishAnim();
  }

  // ---- events ------------------------------------------------------------------------
  $('loadBtn').addEventListener('click', () => loadText($('pgn').value, true));
  $('gamePick').addEventListener('change', (e) => loadGame(+e.target.value, true));
  $('editGame').addEventListener('click', () => setEditor($('gbEditor').hidden));
  $('sample').addEventListener('change', (e) => {
    const s = CM.SAMPLES.find(x => x.id === e.target.value);
    if (!s) return;
    $('pgn').value = s.pgn;
    loadText(s.pgn, true);
    e.target.value = '';
  });
  async function readFile(file) {
    if (!file) return;
    $('pgn').value = await file.text();
    loadText($('pgn').value, true);
  }
  $('file').addEventListener('change', (e) => { readFile(e.target.files[0]); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) readFile(f); });

  $('paintBtn').addEventListener('click', () => { if (anim) stopAnim(); else paintAnimated(); });
  $('prevStyle').addEventListener('click', () => step(-1));
  $('nextStyle').addEventListener('click', () => step(1));
  $('curFav').addEventListener('click', () => toggleFav(settings.style));
  $('browseBtn').addEventListener('click', () => $('gallerySec').scrollIntoView({ behavior: 'smooth', block: 'start' }));

  // Scrubbing: heavy styles preview at half resolution while dragging.
  let scrubTimer = null;
  $('upTo').addEventListener('input', (e) => {
    stopAnim();
    upTo = +e.target.value;
    updateTimeline(true);
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(() => { painter.paintStatic(canvas, opts(styleNow().heavy ? { width: displayWidth(0.5) } : null)); updateTimeline(true); }, 16);
  });
  $('upTo').addEventListener('change', () => {
    if (styleNow().heavy) renderStatic();
    setTimeout(() => $('moveTag').classList.remove('show'), 900);
  });

  $('speed').addEventListener('input', (e) => { settings.speed = +e.target.value; $('speedVal').textContent = settings.speed; save(); });
  $('poster').addEventListener('change', (e) => { settings.poster = e.target.checked; save(); renderStatic(); });
  $('remixBtn').addEventListener('click', remix);
  function remix() { variation++; syncStyleInfo(); invalidateThumbs(); renderStatic(); }

  let searchTimer = null;
  $('search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { settings.query = e.target.value; save(); applyFilter(); }, 80);
  });

  // ---- video export: replay the painting on an offscreen canvas and record it ----
  const VIDEO_TYPES = ['video/mp4;codecs=avc1.42E01F', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let recording = null;
  function fileBase() {
    const h = game.headers;
    const names = [h.White, h.Black].filter(x => x && x !== '?').map(s => s.split(/[ ,]/).filter(Boolean).pop());
    return `${(names.length ? names.join('-vs-') : 'chess-game').replace(/[^\w-]+/g, '')}_${painter.styleTag(styleNow())}_${settings.palette}${variation ? '_v' + (variation + 1) : ''}`;
  }
  function stopRecording(cancelled) {
    if (!recording) return;
    recording.cancelled = cancelled;
    clearTimeout(recording.timer);
    if (recording.rec.state !== 'inactive') recording.rec.stop();
  }
  $('videoBtn').addEventListener('click', () => {
    if (!game) return;
    if (recording) { stopRecording(true); return; }
    const type = window.MediaRecorder && VIDEO_TYPES.find(t => MediaRecorder.isTypeSupported(t));
    if (!type || !HTMLCanvasElement.prototype.captureStream) { showError('This browser cannot record video. Try Chrome, Edge, Firefox or Safari.'); return; }
    stopAnim();
    const btn = $('videoBtn');
    // Paint on one canvas, copy every tick to the recorded canvas so the
    // stream always has fresh frames (also while holding on the last picture).
    const work = document.createElement('canvas'), out = document.createElement('canvas');
    const W = 1080;
    const job = painter.begin(work, opts({ width: W, upTo: 0 }));
    out.width = work.width; out.height = work.height;
    const octx = out.getContext('2d');
    const stream = out.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 12e6 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const last = game.plies.length - 1, fps = 30, perFrame = settings.speed / fps;
    const holdFrames = fps * 2.5, leadFrames = fps * 0.5;
    let frame = 0, i = 0, acc = 0, done = false, endFrame = Infinity;
    recording = { rec, timer: null, cancelled: false };
    rec.onstop = () => {
      const cancelled = recording && recording.cancelled;
      recording = null;
      btn.textContent = 'Download video'; btn.classList.remove('rec');
      if (cancelled || !chunks.length) return;
      const blob = new Blob(chunks, { type: type.split(';')[0] });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${fileBase()}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    };
    btn.classList.add('rec');
    rec.start(500);
    const tick = () => {
      if (!recording) return;
      if (frame >= leadFrames && !done) {
        acc += perFrame;
        let drew = false;
        while (acc >= 1 && i <= last) { job.step(i++); acc -= 1; drew = true; }
        if (drew) { job.present(false); job.updateCaption(i - 1); }
        if (i > last) { job.end(true); done = true; endFrame = frame + holdFrames; }
      }
      octx.drawImage(work, 0, 0);
      const pct = done ? 100 : Math.round((i / (last + 1)) * 100);
      btn.textContent = `Recording ${pct}% · click to cancel`;
      frame++;
      if (frame >= endFrame) { stopRecording(false); return; }
      recording.timer = setTimeout(tick, 1000 / fps);
    };
    tick();
  });

  // ---- PDF export: the style draws straight into a vector PDF ------------------------
  $('pngBtn').addEventListener('click', () => {
    if (!game) return;
    const btn = $('pngBtn'), old = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Building PDF…';
    setTimeout(async () => {
      try {
        const W = 2400, PAGE = 720; // drawing units → a 10-inch-wide page; it scales to any print size
        let pc = CM.pdf.pdfCanvas(PAGE);
        try {
          painter.paintStatic(pc, opts({ width: W, grain: false }));
        } catch (e) {
          // a few styles work on raw pixels (e.g. Glitch): embed a full-resolution image instead
          const off = document.createElement('canvas');
          painter.paintStatic(off, opts({ width: W }));
          pc = CM.pdf.pdfCanvas(PAGE);
          pc.width = off.width; pc.height = off.height;
          pc.getContext('2d').drawImage(off, 0, 0);
        }
        const h = game.headers;
        pc.ctx.title = `${h.White || 'White'} vs ${h.Black || 'Black'} - ${styleNow().code} ${styleNow().name}`;
        const blob = await pc.ctx.toBlob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileBase()}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      } catch (e) {
        showError('PDF export failed: ' + e.message);
      }
      btn.disabled = false; btn.innerHTML = old;
    }, 30);
  });

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'textarea' || tag === 'select' || (tag === 'input' && !['range', 'checkbox'].includes(e.target.type));
    if (e.key === 'Escape' && e.target.id === 'search') { e.target.blur(); return; }
    if (typing || !game || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); $('paintBtn').click(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (tag === 'input') return;
      e.preventDefault();
      stopAnim();
      upTo = Math.max(0, Math.min(game.plies.length - 1, upTo + (e.key === 'ArrowRight' ? 1 : -1)));
      painter.paintStatic(canvas, opts());
      updateTimeline(true);
    } else if (e.key === ']') step(1);
    else if (e.key === '[') step(-1);
    else if (e.key === 'r' || e.key === 'R') remix();
    else if (e.key === 'f' || e.key === 'F') toggleFav(settings.style);
    else if (e.key === '/') { e.preventDefault(); $('search').focus(); }
  });

  function fromHash() {
    const m = /^#(\d+\.\d+)$/.exec(location.hash);
    if (!m) return false;
    const s = STYLE_LIST.find(x => x.code === m[1]);
    if (s && s.id !== settings.style) { settings.style = s.id; return true; }
    return !!s;
  }
  window.addEventListener('hashchange', () => { if (fromHash()) select(settings.style); });

  let resizeTimer = null, lastW = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { const w = displayWidth(); if (w !== lastW && !anim) { lastW = w; renderStatic(); } }, 200);
  });

  // ---- boot --------------------------------------------------------------------------
  fromHash();
  $('poster').checked = settings.poster;
  $('speed').value = settings.speed;
  $('speedVal').textContent = settings.speed;
  $('search').value = settings.query;
  syncPalettes();
  buildChips();
  applyFilter();
  $('pgn').value = store.get('64keys:pgn', '') || CM.SAMPLES[0].pgn;
  loadText($('pgn').value, false);
  booting = false;
})();
