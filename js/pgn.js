/* PGN handling: split multi-game files, parse one game into a list of
 * annotated plies (with position analysis the composer uses). */
window.CM = window.CM || {};

(function () {
  const { Chess } = window.ChessLib;
  const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  /** Split a PGN file that may contain many games. */
  function splitGames(text) {
    const lines = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '').split('\n');
    const games = [];
    let cur = [];
    let hasMoves = false;
    for (const line of lines) {
      const isTag = /^\s*\[\s*\w+\s+".*"\s*\]\s*$/.test(line);
      if (isTag && hasMoves) {
        games.push(cur.join('\n'));
        cur = [];
        hasMoves = false;
      }
      if (!isTag && line.trim() !== '') hasMoves = true;
      cur.push(line);
    }
    if (cur.join('').trim() !== '') games.push(cur.join('\n'));
    return games.map(g => g.trim()).filter(Boolean);
  }

  /** Read tag pairs without needing a full parse (for the game picker). */
  function quickHeaders(pgn) {
    const h = {};
    const re = /^\s*\[\s*(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]/gm;
    let m;
    while ((m = re.exec(pgn))) h[m[1]] = m[2];
    return h;
  }

  function parseClock(comment) {
    if (!comment) return null;
    const m = /\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/.exec(comment);
    if (!m) return null;
    return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  }

  /** Material and tactical "tension" for a position. */
  function analyse(fen) {
    const c = new Chess(fen);
    const board = c.board();
    const material = { w: 0, b: 0 };
    let pieces = 0;
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        material[sq.color] += VALUES[sq.type];
        pieces++;
      }
    }
    const moves = c.moves({ verbose: true });
    let captures = 0;
    for (const mv of moves) if (mv.captured) captures++;
    return {
      material,
      balance: material.w - material.b, // + means white is ahead
      pieces,
      captures,
      inCheck: c.inCheck(),
      mobility: moves.length,
    };
  }

  /** Parse a single game. Throws with a readable message on failure. */
  function parseGame(pgn) {
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch (e) {
      throw new Error('Could not read this PGN: ' + (e && e.message ? e.message : e));
    }
    const history = chess.history({ verbose: true });
    if (!history.length) throw new Error('No moves found in this PGN.');

    const headers = chess.getHeaders ? chess.getHeaders() : quickHeaders(pgn);
    const commentByFen = new Map();
    for (const c of chess.getComments()) commentByFen.set(c.fen, c.comment);

    const startFen = history[0].before;
    const fens = [startFen];
    const plies = history.map((m, i) => {
      fens.push(m.after);
      const comment = commentByFen.get(m.after) || '';
      return {
        index: i,
        color: m.color,
        piece: m.piece,
        from: m.from,
        to: m.to,
        san: m.san,
        captured: m.captured || null,
        promotion: m.promotion || null,
        flags: m.flags,
        check: /[+#]$/.test(m.san),
        mate: /#$/.test(m.san),
        castle: m.flags.includes('k') ? 'k' : m.flags.includes('q') ? 'q' : null,
        enPassant: m.flags.includes('e'),
        fenBefore: m.before,
        fenAfter: m.after,
        moveNumber: parseInt(m.before.split(' ')[5], 10),
        comment,
        clock: parseClock(comment),
        before: analyse(m.before),
      };
    });

    // Think time per ply from %clk, when present.
    const lastClock = { w: null, b: null };
    let clockCount = 0;
    for (const p of plies) {
      if (p.clock != null) {
        clockCount++;
        const prev = lastClock[p.color];
        p.thinkTime = prev != null ? Math.max(0, prev - p.clock) : null;
        lastClock[p.color] = p.clock;
      } else {
        p.thinkTime = null;
      }
    }

    let result = headers.Result || '*';
    if (chess.isCheckmate()) result = chess.turn() === 'w' ? '0-1' : '1-0';
    else if (chess.isDraw() && result === '*') result = '1/2-1/2';

    return {
      headers,
      plies,
      fens,
      result,
      hasClocks: clockCount >= Math.min(4, plies.length),
      final: analyse(chess.fen()),
      isCheckmate: chess.isCheckmate(),
    };
  }

  CM.pgn = { splitGames, quickHeaders, parseGame, VALUES };
})();
