OpenChess Academy — Echo Bot v0.3

Files
- index.html: browser chess UI and human-vs-bot flow
- echo-bot.js: original search/evaluation code running in a Web Worker
- engine-tests.html: browser smoke-test page for basic engine behavior

v0.3 changes
- Retains iterative deepening, quiescence search, transposition table, move ordering, game-phase-aware king positioning, piece-square tables, passed-pawn bonuses, pawn-structure penalties, and search time/node budgets.
- Improves root move ordering by prioritizing the previous iteration's best move.
- Changes transposition-table capacity handling to evict an older batch instead of clearing the entire table at once.
- Fixes a quiescence-search edge case: the engine no longer uses a stand-pat score while in check at the quiescence depth limit; it searches legal evasions one ply before evaluating.
- Adds engine-tests.html for worker startup, legal-move output, mate-in-one recognition, and terminal-position handling.

How to test
1. Publish or serve index.html, echo-bot.js, and engine-tests.html from the same directory.
2. Open engine-tests.html in a browser with internet access.
3. Press “Run tests” and record the pass/fail summary.
4. Test normal gameplay separately on desktop and mobile.

Important limitations
- This is an independent learning prototype, not a Stockfish derivative and not claimed to be as strong as Stockfish 19 or Chess.com engines.
- It relies on chess.js 0.10.3 from a CDN for legal move generation and game rules. An internet connection is needed unless that library is hosted locally.
- FEN does not preserve the full game repetition history in the worker, so draw/repetition handling inside engine search is not fully history-aware.
- The stop message cannot interrupt JavaScript currently executing synchronously inside the worker; search stops itself at its time/node budget and returns the best move from the last completed iteration.
- The smoke tests do not estimate Elo or prove competitive strength. Run larger tactical suites and engine-vs-engine matches before making strength claims.

Publish
Upload index.html and echo-bot.js together to the root of the GitHub Pages repository, then commit both files. Keep echo-bot.js beside index.html. README.txt and engine-tests.html are optional for the live app; keep engine-tests.html if you want a browser-based smoke test page.
