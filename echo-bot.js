/* Echo Bot v0.3 — independent browser chess engine for OpenChess Academy.
 * Legal move generation is supplied by chess.js. Search and evaluation are original project code.
 * This is a learning prototype, not a Stockfish derivative or a tournament-strength claim.
 */
"use strict";
let ChessCtor = null;
let activeId = 0;
let searchState = null;
const VALUES = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
const MATE = 100000;
const MATE_BOUND = 90000;
const TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2;
const MAX_PLY = 96;
const TT_LIMIT = 100000;
const pieceSquare = {
  p: [0,0,0,0,0,0,0,0, 5,10,10,-20,-20,10,10,5, 5,-5,-10,0,0,-10,-5,5, 0,0,0,20,20,0,0,0, 5,5,10,25,25,10,5,5, 10,10,20,30,30,20,10,10, 50,50,50,50,50,50,50,50, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30, -30,0,15,20,20,15,0,-30, -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30, -40,-20,0,0,0,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,5,0,0,0,0,5,-10, -10,10,10,10,10,10,10,-10, -10,0,10,10,10,10,0,-10, -10,5,5,10,10,5,5,-10, -10,0,5,10,10,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,5,5,0,0,0, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 5,10,10,10,10,10,10,5, 0,0,0,0,0,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,5,0,0,0,0,-10, -10,5,5,5,5,5,0,-10, 0,0,5,5,5,5,0,-5, -5,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20]
};
function post(type, extra = {}) { self.postMessage(Object.assign({ type }, extra)); }
function idx(r, c) { return r * 8 + c; }
function phaseOf(board) {
  let phase = 0;
  for (const row of board) for (const p of row) if (p) {
    if (p.type === "q") phase += 4;
    else if (p.type === "r") phase += 2;
    else if (p.type === "b" || p.type === "n") phase += 1;
  }
  return Math.min(24, phase);
}
function isPassedPawn(board, r, c, color) {
  const enemy = color === "w" ? "b" : "w";
  for (let rr = 0; rr < 8; rr++) for (let cc = Math.max(0, c - 1); cc <= Math.min(7, c + 1); cc++) {
    const p = board[rr][cc];
    if (!p || p.color !== enemy || p.type !== "p") continue;
    if ((color === "w" && rr < r) || (color === "b" && rr > r)) return false;
  }
  return true;
}
function evaluateWhite(game) {
  const board = game.board();
  const phase = phaseOf(board);
  let score = 0;
  const bishops = { w: 0, b: 0 };
  const pawnFiles = { w: Array(8).fill(0), b: Array(8).fill(0) };
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const sign = p.color === "w" ? 1 : -1;
    let value = VALUES[p.type] || 0;
    const squareIndex = p.color === "w" ? idx(r, c) : idx(7 - r, c);
    const center = 7 - (Math.abs(3.5 - r) + Math.abs(3.5 - c));
    if (pieceSquare[p.type]) value += pieceSquare[p.type][squareIndex];
    if (p.type === "p") {
      pawnFiles[p.color][c]++;
      const advance = p.color === "w" ? 6 - r : r - 1;
      value += advance * 5;
      if (isPassedPawn(board, r, c, p.color)) value += Math.max(0, advance) * (phase < 8 ? 13 : 5);
    } else if (p.type === "n") value += center * 3;
    else if (p.type === "b") { value += center * 2; bishops[p.color]++; }
    else if (p.type === "k") {
      // Centralize the king in the endgame; avoid needless exposure while many pieces remain.
      value += phase < 10 ? center * 8 : -center * 4;
    }
    score += sign * value;
  }
  for (const color of ["w", "b"]) {
    const sign = color === "w" ? 1 : -1;
    if (bishops[color] >= 2) score += sign * 28;
    for (let f = 0; f < 8; f++) {
      const count = pawnFiles[color][f];
      if (count > 1) score -= sign * 13 * (count - 1); // doubled pawns
      if (count > 0 && (f === 0 || pawnFiles[color][f - 1] === 0) && (f === 7 || pawnFiles[color][f + 1] === 0)) score -= sign * 10 * count; // isolated pawns
    }
  }
  return score;
}
function evaluate(game) {
  if (game.in_checkmate()) return -MATE;
  if (game.in_stalemate() || game.insufficient_material() || game.in_draw()) return 0;
  const whiteScore = evaluateWhite(game);
  return game.turn() === "w" ? whiteScore : -whiteScore;
}
function positionKey(game) {
  const f = game.fen().split(" ");
  // Include castling, en-passant and halfmove clock; omit fullmove number for transpositions.
  return f.slice(0, 5).join(" ");
}
function sameMove(a, b) { return !!a && !!b && a.from === b.from && a.to === b.to && (a.promotion || "") === (b.promotion || ""); }
function moveOrder(game, moves, ttMove, ply) {
  const state = searchState;
  return moves.map(m => {
    let s = 0;
    if (sameMove(m, ttMove)) s += 1000000;
    if (m.captured) s += 10000 + 10 * (VALUES[m.captured] || 0) - (VALUES[m.piece] || 0);
    if (m.promotion) s += 8000 + (VALUES[m.promotion] || 0);
    if (m.san && m.san.includes("#")) s += 7000;
    else if (m.san && m.san.includes("+")) s += 300;
    if (state && ply < MAX_PLY) {
      if (sameMove(m, state.killers[ply][0])) s += 5000;
      else if (sameMove(m, state.killers[ply][1])) s += 4000;
      s += state.history[m.from + m.to] || 0;
    }
    return { m, s };
  }).sort((a, b) => b.s - a.s).map(x => x.m);
}
function checkAbort() {
  const s = searchState;
  s.nodes++;
  if ((s.nodes & 255) === 0 && (performance.now() >= s.deadline || s.nodes >= s.nodeLimit || s.id !== activeId)) throw new Error("ECHO_SEARCH_ABORT");
}
function scoreToTT(score, ply) {
  if (score > MATE_BOUND) return score + ply;
  if (score < -MATE_BOUND) return score - ply;
  return score;
}
function scoreFromTT(score, ply) {
  if (score > MATE_BOUND) return score - ply;
  if (score < -MATE_BOUND) return score + ply;
  return score;
}
function storeTT(key, entry) {
  const s = searchState;
  if (s.tt.size >= TT_LIMIT && !s.tt.has(key)) {
    // Evict the oldest insertion batch instead of flushing the entire cache.
    let removed = 0;
    const target = Math.ceil(TT_LIMIT * 0.10);
    for (const oldKey of s.tt.keys()) {
      s.tt.delete(oldKey);
      if (++removed >= target) break;
    }
  }
  s.tt.set(key, entry);
}
function quiescence(game, alpha, beta, ply, qDepth = 0) {
  checkAbort();
  if (game.in_checkmate()) return -MATE + ply;
  if (game.in_draw() || game.in_stalemate() || game.insufficient_material()) return 0;
  const inCheck = game.in_check();
  const standPat = evaluate(game);
  if (!inCheck) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
    if (qDepth >= 12) return standPat;
  } else if (qDepth >= 12) {
    // Never use a stand-pat score while in check. At the safety limit, search
    // every legal evasion one ply and evaluate the resulting positions.
    const evasions = game.moves({ verbose: true });
    if (!evasions.length) return -MATE + ply;
    let best = -Infinity;
    for (const m of evasions) {
      game.move(m);
      const score = -evaluate(game);
      game.undo();
      if (score > best) best = score;
    }
    return best;
  }
  let moves = game.moves({ verbose: true });
  if (!inCheck) moves = moves.filter(m => m.captured || m.promotion);
  if (!moves.length) return inCheck ? -MATE + ply : alpha;
  moves = moveOrder(game, moves, null, ply);
  for (const m of moves) {
    game.move(m);
    const score = -quiescence(game, -beta, -alpha, ply + 1, qDepth + 1);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}
function negamax(game, depth, alpha, beta, ply) {
  checkAbort();
  if (game.in_checkmate()) return -MATE + ply;
  if (game.in_draw() || game.in_stalemate() || game.insufficient_material()) return 0;
  if (ply >= MAX_PLY - 1) return evaluate(game);
  if (depth <= 0) return quiescence(game, alpha, beta, ply);

  const key = positionKey(game);
  const alphaOriginal = alpha;
  const entry = searchState.tt.get(key);
  let ttMove = null;
  if (entry) {
    ttMove = entry.move;
    if (entry.depth >= depth) {
      const ttScore = scoreFromTT(entry.score, ply);
      if (entry.flag === TT_EXACT) return ttScore;
      if (entry.flag === TT_LOWER && ttScore >= beta) return ttScore;
      if (entry.flag === TT_UPPER && ttScore <= alpha) return ttScore;
    }
  }
  const inCheck = game.in_check();
  if (inCheck) depth++; // modest check extension
  const moves = moveOrder(game, game.moves({ verbose: true }), ttMove, ply);
  if (!moves.length) return inCheck ? -MATE + ply : 0;
  let bestScore = -Infinity, bestMove = null;
  for (const m of moves) {
    game.move(m);
    const score = -negamax(game, depth - 1, -beta, -alpha, ply + 1);
    game.undo();
    if (score > bestScore) { bestScore = score; bestMove = m; }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      if (!m.captured && !m.promotion && searchState && ply < MAX_PLY) {
        const killers = searchState.killers[ply];
        if (!sameMove(m, killers[0])) { killers[1] = killers[0]; killers[0] = m; }
        const hk = m.from + m.to;
        searchState.history[hk] = Math.min(20000, (searchState.history[hk] || 0) + depth * depth);
      }
      break;
    }
  }
  let flag = TT_EXACT;
  if (bestScore <= alphaOriginal) flag = TT_UPPER;
  else if (bestScore >= beta) flag = TT_LOWER;
  storeTT(key, { depth, score: scoreToTT(bestScore, ply), flag, move: bestMove });
  return bestScore;
}
function uci(m) { return m.from + m.to + (m.promotion || ""); }
function searchPosition(fen, options, id) {
  const game = new ChessCtor(fen);
  const legal = game.moves({ verbose: true });
  if (!legal.length) { post("bestmove", { move: "(none)", id }); return; }
  const maxDepth = Math.max(1, Math.min(8, Number(options.maxDepth) || 3));
  const timeMs = Math.max(100, Math.min(5000, Number(options.timeMs) || 700));
  const nodeLimit = Math.max(5000, Math.min(1500000, Number(options.nodeLimit) || 150000));
  const started = performance.now();
  searchState = { id, nodes: 0, deadline: started + timeMs, nodeLimit, tt: new Map(), killers: Array.from({ length: MAX_PLY }, () => [null, null]), history: Object.create(null) };
  let bestMove = moveOrder(game, legal, null, 0)[0];
  let bestScore = 0, completedDepth = 0;
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (performance.now() >= searchState.deadline || searchState.nodes >= nodeLimit || id !== activeId) break;
    let iterationBest = null, iterationScore = -Infinity, alpha = -Infinity, beta = Infinity;
    try {
      // Carry the previous iteration's best move forward for root move ordering.
      const rootMoves = moveOrder(game, game.moves({ verbose: true }), bestMove, 0);
      for (const m of rootMoves) {
        checkAbort();
        game.move(m);
        const score = -negamax(game, depth - 1, -beta, -alpha, 1);
        game.undo();
        if (score > iterationScore) { iterationScore = score; iterationBest = m; }
        if (score > alpha) alpha = score;
      }
      if (iterationBest) { bestMove = iterationBest; bestScore = iterationScore; completedDepth = depth; }
      post("info", { depth, score: bestScore, nodes: searchState.nodes, timeMs: Math.round(performance.now() - started), pvMove: uci(bestMove) });
    } catch (e) {
      if (!e || e.message !== "ECHO_SEARCH_ABORT") throw e;
      break; // Return the best move from the last fully completed iteration.
    }
  }
  post("info", { depth: completedDepth, score: bestScore, nodes: searchState.nodes, timeMs: Math.round(performance.now() - started), done: true });
  post("bestmove", { move: uci(bestMove), id });
  searchState = null;
}
self.onmessage = event => {
  const d = event.data || {};
  if (d.type === "init") {
    try {
      importScripts("https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js");
      ChessCtor = self.Chess;
      if (typeof ChessCtor !== "function") throw new Error("chess.js did not load");
      post("ready", { version: "Echo Bot 0.3" });
    } catch (e) {
      post("error", { message: "Could not load chess.js in the worker. Check internet access. " + e.message });
    }
  } else if (d.type === "search") {
    if (!ChessCtor) { post("error", { message: "Engine has not initialized." }); return; }
    activeId = d.id;
    try { searchPosition(d.fen, d, d.id); }
    catch (e) { searchState = null; post("error", { message: e.message || "Search failed." }); }
  } else if (d.type === "stop") {
    activeId++;
  }
};
