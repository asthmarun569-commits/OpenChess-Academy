/* OpenChess Academy — optional Lichess advisor layer.
 * Public, unauthenticated reference requests only. Echo Bot remains the local engine.
 * API endpoints documented at https://lichess.org/api
 */
(function (root) {
  "use strict";
  const DEFAULT_TIMEOUT_MS = 1500;
  async function fetchJSON(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Lichess HTTP " + response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function legalUciSet(chess) {
    return new Set(chess.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || "")));
  }
  async function opening(fen, chess, timeoutMs) {
    const url = "https://explorer.lichess.ovh/lichess?variant=standard&speeds[]=blitz&speeds[]=rapid&ratings[]=1600&ratings[]=1800&ratings[]=2000&ratings[]=2200&fen=" + encodeURIComponent(fen);
    const data = await fetchJSON(url, timeoutMs);
    const legal = legalUciSet(chess);
    const moves = (Array.isArray(data.moves) ? data.moves : []).filter(m => legal.has(m.uci));
    moves.sort((a, b) => sampleScore(b) - sampleScore(a));
    return { kind: "opening", data, candidates: moves, recommendation: moves[0] || null };
  }
  function sampleScore(m) {
    const w = Number(m.white) || 0, d = Number(m.draws) || 0, b = Number(m.black) || 0, total = w + d + b;
    return total ? ((w + d * 0.5) / total) * 0.78 + Math.min(1, Math.log(total + 1) / 10) * 0.22 : -1;
  }
  async function cloudEval(fen, chess, timeoutMs) {
    const url = "https://lichess.org/api/cloud-eval?fen=" + encodeURIComponent(fen) + "&multiPv=3";
    const data = await fetchJSON(url, timeoutMs);
    const legal = legalUciSet(chess);
    const pvs = (Array.isArray(data.pvs) ? data.pvs : []).filter(p => typeof p.moves === "string" && legal.has(p.moves.trim().split(/\s+/)[0]));
    return { kind: "cloud-eval", data, candidates: pvs, recommendation: pvs[0] || null };
  }
  async function tablebase(fen, chess, timeoutMs) {
    if (chess.board().reduce((n, row) => n + row.filter(Boolean).length, 0) > 7) return null;
    const url = "https://tablebase.lichess.ovh/standard?fen=" + encodeURIComponent(fen);
    const data = await fetchJSON(url, timeoutMs);
    const legal = legalUciSet(chess);
    const rank = { win: 5, "cursed-win": 4, draw: 3, "blessed-loss": 2, loss: 1 };
    const moves = (Array.isArray(data.moves) ? data.moves : []).filter(m => legal.has(m.uci));
    moves.sort((a, b) => (rank[b.category] || 0) - (rank[a.category] || 0) || Math.abs(Number(a.dtz) || 0) - Math.abs(Number(b.dtz) || 0));
    return { kind: "tablebase", data, candidates: moves, recommendation: moves[0] || null };
  }
  root.EchoLichessAdvisor = Object.freeze({ opening, cloudEval, tablebase });
})(typeof self !== "undefined" ? self : window);
