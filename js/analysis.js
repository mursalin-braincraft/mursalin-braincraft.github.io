/* Per-ply position data the styles use: who controls each square, how busy
 * each square is, where the kings stand, and the identity of every piece
 * (so a style can follow "the knight that started on g1" through the game). */
window.CM = window.CM || {};
CM.art = CM.art || {};

(function () {
  const { Chess } = window.ChessLib;
  const FILES = 'abcdefgh';

  function sqName(i) { return FILES[i % 8] + (Math.floor(i / 8) + 1); }

  function analyseGame(game) {
    const plies = game.plies.map((p) => {
      const c = new Chess(p.fenAfter);
      const ctrl = new Int8Array(64); // white attackers − black attackers
      const act = new Uint8Array(64); // white attackers + black attackers
      for (let i = 0; i < 64; i++) {
        const sq = sqName(i);
        const w = c.attackers(sq, 'w').length;
        const b = c.attackers(sq, 'b').length;
        ctrl[i] = w - b;
        act[i] = w + b;
      }
      const king = {};
      c.board().forEach(row => row.forEach(s => { if (s && s.type === 'k') king[s.color] = s.square; }));
      const fileAct = new Float32Array(8);
      for (let i = 0; i < 64; i++) fileAct[i % 8] += act[i];
      return { ctrl, act, king, fileAct, captures: p.before.captures };
    });
    plies.track = trackPieces(game);
    return plies;
  }

  /** Give every piece an identity and follow it: ids[id].path lists the
   *  squares it stood on (ply −1 = starting square). */
  function trackPieces(game) {
    const start = new Chess(game.fens[0]);
    const ids = {};
    const at = {};
    start.board().forEach(row => row.forEach(s => {
      if (!s) return;
      const id = s.color + s.type.toUpperCase() + s.square;
      ids[id] = { id, color: s.color, type: s.type, start: s.square, path: [{ sq: s.square, ply: -1, type: s.type }], captured: null };
      at[s.square] = id;
    }));
    const mover = [], victim = [], rook = [];
    game.plies.forEach((p, i) => {
      const id = at[p.from] || null;
      let vid = null;
      if (p.captured) {
        const vsq = p.enPassant ? p.to[0] + p.from[1] : p.to;
        vid = at[vsq] || null;
        if (vid) { ids[vid].captured = i; delete at[vsq]; }
      }
      delete at[p.from];
      if (id) { at[p.to] = id; ids[id].path.push({ sq: p.to, ply: i, type: p.promotion || p.piece }); }
      let rid = null;
      if (p.castle) {
        const rank = p.color === 'w' ? '1' : '8';
        const rf = (p.castle === 'k' ? 'h' : 'a') + rank, rt = (p.castle === 'k' ? 'f' : 'd') + rank;
        rid = at[rf] || null;
        delete at[rf];
        if (rid) { at[rt] = rid; ids[rid].path.push({ sq: rt, ply: i, type: 'r' }); }
      }
      mover.push(id);
      victim.push(vid);
      rook.push(rid);
    });
    return { ids, mover, victim, rook };
  }

  function piecesAt(fen) {
    const c = new Chess(fen);
    const out = [];
    c.board().forEach(row => row.forEach(s => { if (s) out.push(s); }));
    return out;
  }

  CM.art.analyseGame = analyseGame;
  CM.art.piecesAt = piecesAt;
  CM.art.finalPieces = (game) => piecesAt(game.fens[game.fens.length - 1]);
})();
