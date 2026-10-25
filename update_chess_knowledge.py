#!/usr/bin/env python3
"""Refresh a compact, attributable chess knowledge snapshot from public Lichess APIs.
This records aggregate reference data; it does not train or alter Echo Bot's engine weights.
"""
import json, os, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "chess-knowledge.json"
DATA.parent.mkdir(parents=True, exist_ok=True)
POSITIONS = [
    ("Starting position", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
    ("After 1.e4", "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"),
    ("After 1.d4", "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1"),
    ("After 1.Nf3", "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1"),
    ("After 1.c4", "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1"),
]
SOURCES = [
    {"name": "Lichess Masters Opening Explorer", "url": "https://explorer.lichess.ovh/masters"},
    {"name": "Lichess Daily Puzzle API", "url": "https://lichess.org/api/puzzle/daily"},
    {"name": "Lichess API documentation", "url": "https://lichess.org/api"},
]

def get_json(url):
    req = Request(url, headers={"User-Agent": "OpenChess-Academy-KnowledgeUpdater/1.0 (public research snapshot)", "Accept": "application/json"})
    with urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))

def previous_snapshot():
    try:
        return json.loads(DATA.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def main():
    previous = previous_snapshot()
    previous_top = {p.get("fen"): ((p.get("moves") or [{}])[0].get("uci")) for p in previous.get("positions", [])}
    positions = []
    failures = []
    for label, fen in POSITIONS:
        try:
            url = "https://explorer.lichess.ovh/masters?" + urlencode({"fen": fen, "moves": 5, "topGames": 0, "recentGames": 0})
            result = get_json(url)
            moves = []
            for move in result.get("moves", [])[:5]:
                white = int(move.get("white", 0) or 0)
                draws = int(move.get("draws", 0) or 0)
                black = int(move.get("black", 0) or 0)
                total = white + draws + black
                if not total:
                    continue
                moves.append({"uci": move.get("uci", ""), "san": move.get("san", ""), "games": total,
                              "white": white / total, "draws": draws / total, "black": black / total,
                              "averageRating": move.get("averageRating")})
            moves.sort(key=lambda x: x["games"], reverse=True)
            positions.append({"label": label, "fen": fen, "opening": result.get("opening", {}).get("name") if isinstance(result.get("opening"), dict) else None,
                              "totalGames": sum(m["games"] for m in moves), "moves": moves})
        except Exception as exc:
            failures.append(f"{label}: {type(exc).__name__}: {exc}")
        time.sleep(1.1)  # Keep requests serial and conservative.
    if not positions:
        raise RuntimeError("No opening positions could be refreshed; preserving the previous snapshot. " + "; ".join(failures))
    puzzle = None
    try:
        raw = get_json("https://lichess.org/api/puzzle/daily")
        p = raw.get("puzzle", {})
        puzzle = {"id": p.get("id"), "rating": p.get("rating"), "themes": p.get("themes", []),
                  "url": "https://lichess.org/training/" + str(p.get("id", "daily"))}
    except Exception as exc:
        failures.append(f"daily puzzle: {type(exc).__name__}: {exc}")
    changes = []
    for pos in positions:
        old = previous_top.get(pos["fen"])
        new = (pos.get("moves") or [{}])[0].get("uci")
        if old and new and old != new:
            changes.append(f"{pos['label']}: leading sampled move changed from {old} to {new} in this snapshot.")
    if not changes:
        changes.append("No leading sampled move changed versus the previous stored snapshot, or this is the first snapshot.")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    history = previous.get("history", [])
    history.append({"date": now[:10], "positions": [{"label": p["label"], "topMove": (p.get("moves") or [{}])[0].get("uci"), "games": p.get("totalGames", 0)} for p in positions]})
    history = history[-45:]
    payload = {"schemaVersion": 1, "updatedAt": now, "updateStatus": "partial" if failures else "success",
               "sources": SOURCES, "positions": positions, "puzzle": puzzle, "changes": changes,
               "failures": failures, "history": history,
               "limitations": ["Opening statistics describe sampled master games and do not establish a best move.",
                               "A daily data refresh does not modify or retrain Echo Bot's search/evaluation code.",
                               "Personal game records are stored only in each user's browser unless explicitly exported."]}
    DATA.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {DATA} with {len(positions)} positions; status={payload['updateStatus']}; failures={len(failures)}")

if __name__ == "__main__":
    main()
