/* Echo Bot Competitive Arena v1.0 — independent browser chess engine for OpenChess Academy.
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
  p: [0,0,0,0,0,0,0,0, 50,50,50,55,55,50,50,50, 20,25,30,35,35,30,25,20, 12,15,20,28,28,20,15,12, 8,10,14,22,22,14,10,8, 4,5,8,12,12,8,5,4, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0],
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
function pseudoMobility(board, r, c, piece) {
  const dirs = {
    n: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    b: [[-1,-1],[-1,1],[1,-1],[1,1]],
    r: [[-1,0],[1,0],[0,-1],[0,1]],
    q: [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]],
    k: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  };
  let count = 0;
  if (piece.type === "p") {
    const forward = piece.color === "w" ? -1 : 1;
    const nr = r + forward;
    if (nr >= 0 && nr < 8 && !board[nr][c]) count++;
    for (const dc of [-1,1]) {
      const nc=c+dc;
      if (nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]&&board[nr][nc].color!==piece.color) count++;
    }
    return count;
  }
  const steps=dirs[piece.type]||[];
  for (const [dr,dc] of steps) {
    let nr=r+dr,nc=c+dc;
    while(nr>=0&&nr<8&&nc>=0&&nc<8) {
      if (board[nr][nc] && board[nr][nc].color===piece.color) break;
      count++;
      if (board[nr][nc] || piece.type==="n" || piece.type==="k") break;
      nr+=dr; nc+=dc;
    }
  }
  return count;
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
      // Center-control heuristic inspired by general opening/strategy principles.
      // This is a lightweight evaluation feature, not learned opening theory.
      if (c === 3 || c === 4) value += phase > 8 ? 5 : 9;
      if ((r === 3 || r === 4) && (c === 3 || c === 4)) value += 9;
      const advance = p.color === "w" ? 6 - r : r - 1;
      value += advance * 5;
      if (isPassedPawn(board, r, c, p.color)) {
        value += Math.max(0, advance) * (phase < 8 ? 13 : 5);
        const supportRow = p.color === "w" ? r + 1 : r - 1;
        if (supportRow >= 0 && supportRow < 8) {
          for (const sc of [c - 1, c + 1]) {
            if (sc >= 0 && sc < 8 && board[supportRow][sc] && board[supportRow][sc].type === "p" && board[supportRow][sc].color === p.color) value += 8;
          }
        }
      }
    } else if (p.type === "n") {
      value += center * 3;
      // Opening principle: develop knights away from their original squares.
      if (phase > 12 && ((p.color === "w" && r === 7 && (c === 1 || c === 6)) || (p.color === "b" && r === 0 && (c === 1 || c === 6)))) value -= 14;
    } else if (p.type === "b") {
      value += center * 2; bishops[p.color]++;
      // Opening principle: reward getting bishops off their home squares.
      if (phase > 12 && ((p.color === "w" && r === 7 && (c === 2 || c === 5)) || (p.color === "b" && r === 0 && (c === 2 || c === 5)))) value -= 12;
    } else if (p.type === "r") {
      let friendlyPawn = false, enemyPawn = false;
      for (let rr = 0; rr < 8; rr++) {
        const q = board[rr][c];
        if (q && q.type === "p") { if (q.color === p.color) friendlyPawn = true; else enemyPawn = true; }
      }
      if (!friendlyPawn && !enemyPawn) value += 14; // open file
      else if (!friendlyPawn && enemyPawn) value += 7; // semi-open file
    } else if (p.type === "k") {
      // Centralize the king in the endgame; seek shelter while major pieces remain.
      value += phase < 10 ? center * 8 : -center * 4;
      if (phase > 10) {
        const homeRank = p.color === "w" ? 7 : 0;
        const castledSquare = r === homeRank && (c === 2 || c === 6);
        if (castledSquare) value += 32;
        else if (r !== homeRank || c !== 4) value -= 14;
        // A modest pawn-shield bonus for pawns in front of a castled king.
        const shieldRank = p.color === "w" ? r - 1 : r + 1;
        if (shieldRank >= 0 && shieldRank < 8) {
          for (let cc = Math.max(0, c - 1); cc <= Math.min(7, c + 1); cc++) {
            const shield = board[shieldRank][cc];
            if (shield && shield.type === "p" && shield.color === p.color) value += 7;
          }
        }
      }
    }
    score += sign * value;
    if (p.type === "n" || p.type === "b" || p.type === "r" || p.type === "q") {
      // Pseudo-legal mobility is deliberately lightweight; king legality is handled by search.
      score += sign * Math.min(12, pseudoMobility(board, r, c, p)) * (p.type === "q" ? 1 : 2);
    }
    if (p.type === "r" && ((p.color === "w" && r === 1) || (p.color === "b" && r === 6))) score += sign * 18; // rook on seventh rank
  }
  // Connected rooks coordinate more effectively when they share a rank with
  // no piece between them. This is a positional heuristic, not a tactical proof.
  for (const color of ["w", "b"]) {
    const rooks = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === "r") rooks.push({ r, c });
    }
    for (let i = 0; i < rooks.length; i++) for (let j = i + 1; j < rooks.length; j++) {
      const a = rooks[i], b = rooks[j];
      if (a.r !== b.r) continue;
      let clear = true;
      for (let c = Math.min(a.c, b.c) + 1; c < Math.max(a.c, b.c); c++) {
        if (board[a.r][c]) { clear = false; break; }
      }
      if (clear) score += (color === "w" ? 1 : -1) * 12;
    }
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
      let score;
      try { score = -evaluate(game); } finally { game.undo(); }
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
    let score;
    try { score = -quiescence(game, -beta, -alpha, ply + 1, qDepth + 1); }
    finally { game.undo(); }
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
  let first = true;
  for (const m of moves) {
    game.move(m);
    let score;
    try {
      if (first) {
        score = -negamax(game, depth - 1, -beta, -alpha, ply + 1);
        first = false;
      } else {
        // Principal Variation Search: cheaply test later moves, then re-search only if promising.
        score = -negamax(game, depth - 1, -alpha - 1, -alpha, ply + 1);
        if (score > alpha && score < beta) score = -negamax(game, depth - 1, -beta, -alpha, ply + 1);
      }
    } finally { game.undo(); }
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
function chooseSkillMove(candidates, skillLevel) {
  if (!candidates || !candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  if (skillLevel >= 5 || candidates.length === 1) return candidates[0].move;
  // Lower levels choose among plausible moves with a controlled centipawn-loss window.
  // This deliberately changes playing strength without ever producing an illegal move.
  const settings = {
    1: { maxLoss: 260, temperature: 115 },
    2: { maxLoss: 155, temperature: 72 },
    3: { maxLoss: 75, temperature: 34 },
    4: { maxLoss: 24, temperature: 10 }
  };
  const cfg = settings[skillLevel] || settings[3];
  const best = candidates[0].score;
  const pool = candidates.filter(x => best - x.score <= cfg.maxLoss);
  const weights = pool.map(x => Math.exp((x.score - best) / cfg.temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    pick -= weights[i];
    if (pick <= 0) return pool[i].move;
  }
  return pool[0].move;
}

function extractPV(rootGame, firstMove, maxDepth) {
  const clone = new ChessCtor(rootGame.fen());
  const line = [];
  if (!firstMove) return line;
  try {
    const legalFirst = clone.moves({ verbose: true }).find(m => sameMove(m, firstMove));
    if (!legalFirst) return line;
    line.push(uci(legalFirst)); clone.move(legalFirst);
    for (let ply = 1; ply < maxDepth; ply++) {
      if (clone.game_over()) break;
      const entry = searchState.tt.get(positionKey(clone));
      if (!entry || !entry.move) break;
      const next = clone.moves({ verbose: true }).find(m => sameMove(m, entry.move));
      if (!next) break;
      line.push(uci(next)); clone.move(next);
    }
  } catch (_) { /* A partial PV is still useful if a cache line ends early. */ }
  return line;
}
function searchPosition(fen, options, id) {
  const game = new ChessCtor(fen);
  const legal = game.moves({ verbose: true });
  if (!legal.length) { post("bestmove", { move: "(none)", id }); return; }
  const skillLevel = Math.max(1, Math.min(5, Number(options.skillLevel) || 3));
  const maxDepth = Math.max(1, Math.min(10, Number(options.maxDepth) || 3));
  const timeMs = Math.max(100, Math.min(8000, Number(options.timeMs) || 700));
  const nodeLimit = Math.max(5000, Math.min(1500000, Number(options.nodeLimit) || 150000));
  const started = performance.now();
  searchState = { id, nodes: 0, deadline: started + timeMs, nodeLimit, tt: new Map(), killers: Array.from({ length: MAX_PLY }, () => [null, null]), history: Object.create(null) };
  let bestMove = moveOrder(game, legal, null, 0)[0];
  let bestScore = 0, completedDepth = 0;
  let completedRootCandidates = legal.map(move => ({ move, score: -Infinity }));
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (performance.now() >= searchState.deadline || searchState.nodes >= nodeLimit || id !== activeId) break;
    let iterationBest = null, iterationScore = -Infinity;
    const iterationCandidates = [];
    try {
      // Score every root candidate with a full window. Deeper nodes still use alpha-beta pruning.
      // This gives the difficulty selector meaningful score differences between legal moves.
      const rootMoves = moveOrder(game, game.moves({ verbose: true }), bestMove, 0);
      for (const m of rootMoves) {
        checkAbort();
        game.move(m);
        let score;
        try { score = -negamax(game, depth - 1, -Infinity, Infinity, 1); }
        finally { game.undo(); }
        iterationCandidates.push({ move: m, score });
        if (score > iterationScore) { iterationScore = score; iterationBest = m; }
      }
      if (iterationBest) {
        bestMove = iterationBest; bestScore = iterationScore; completedDepth = depth;
        completedRootCandidates = iterationCandidates.slice();
      }
      post("info", { depth, score: bestScore, nodes: searchState.nodes, timeMs: Math.round(performance.now() - started), pvMove: uci(bestMove), pv: extractPV(game, bestMove, completedDepth), skillLevel });
    } catch (e) {
      if (!e || e.message !== "ECHO_SEARCH_ABORT") throw e;
      break; // Return the best move from the last fully completed iteration.
    }
  }
  const selectedMove = chooseSkillMove(completedRootCandidates, skillLevel) || bestMove;
  post("info", { depth: completedDepth, score: bestScore, nodes: searchState.nodes, timeMs: Math.round(performance.now() - started), done: true, skillLevel, selectedMove: uci(selectedMove), pv: extractPV(game, selectedMove, completedDepth), rootScores: completedRootCandidates.map(x => ({ move: uci(x.move), score: x.score })) });
  post("bestmove", { move: uci(selectedMove), id, skillLevel, depth: completedDepth, rootScores: completedRootCandidates.map(x => ({ move: uci(x.move), score: x.score })) });
  searchState = null;
}
self.onmessage = event => {
  const d = event.data || {};
  if (d.type === "init") {
    try {
      importScripts("https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js");
      ChessCtor = self.Chess;
      if (typeof ChessCtor !== "function") throw new Error("chess.js did not load");
      post("ready", { version: "Echo Bot Competitive Arena 1.0" });
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
