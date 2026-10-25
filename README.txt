OpenChess Academy — Echo Bot Competitive Arena v1.1

FILES
- index.html: responsive board, opponent profile, color selection, PGN copy, predicted continuation, free game-accuracy estimate, and learning references.
- echo-bot.js: independent JavaScript search/evaluation worker. Legal move generation is supplied by chess.js 0.10.3 via CDN.
- engine-tests.html: browser smoke tests for worker startup, legal move output, mate-in-one, terminal positions, integrations, and source links.
- CHESS_KNOWLEDGE.md: source summary, implementation map, and limitations.

IMPLEMENTED FEATURES
- Opening explorer: queries Lichess Opening Explorer during the opening and chooses a statistically supported legal move from the sampled game outcomes. This is database-based move selection, not a guarantee of best play.
- Endgame tablebase: tries Lichess/Syzygy for eligible positions with seven or fewer pieces; falls back to local search if unavailable.
- Daily puzzle: fetches the public Lichess daily puzzle and links out so the solution is not revealed in the app.
- Search: iterative deepening, alpha-beta/negamax, principal variation search, quiescence, transposition table, killer/history move ordering, capture/promotion/check ordering, and bounded difficulty settings.
- Evaluation: material, piece-square values, piece activity/mobility, center pawns, development, king shelter/centralization, bishop pair, rook files/seventh rank/connected rooks, pawn structure, and passed pawns.
- Free game-accuracy estimate: an internal limited-depth estimate, not an official Chess.com/Lichess accuracy metric or Elo.
- Opponent rating field is user-entered metadata only. It does not verify a player or alter engine strength.

SOURCE RESEARCH USED
- Chess.com lessons present opening principles (center control, development, king safety) and a broad tactical vocabulary (forks, pins, skewers, discovered attacks, sacrifices, mating patterns, and more).
- Chessable public product descriptions emphasize pattern recognition, calculation, defensive resources, and practical endgame patterns. Paid lesson/course files are not copied.
- World Chess public guides emphasize opening plans and pawn structures, strategy factors such as material, king safety, activity, space, pawn structure, and endgame concepts such as king activity, passed pawns, promotion races, and zugzwang.
- These sources inform the feature priorities and in-app learning links; they are not training data embedded wholesale in the engine.

LIMITATIONS
- The new center-pawn and connected-rook features are lightweight heuristics; they do not teach the engine full human opening theory or deep positional plans.
- Tactical motifs are not a separately trained classifier. Tactical strength still depends mostly on search depth, move ordering, and quiescence.
- No verified playing Elo, online matchmaking, persistent rating database, or guaranteed win. Do not claim 10,000 Elo or Stockfish-equivalent strength without independent benchmark evidence.
- Third-party APIs require internet access and may be unavailable/rate-limited.
- Browser syntax and static tests are not a substitute for real-browser playtests or engine-vs-engine matches.

INSTALL
1. Extract the ZIP.
2. Upload index.html, echo-bot.js, engine-tests.html, and CHESS_KNOWLEDGE.md to the root of the GitHub Pages repository.
3. Commit and wait for GitHub Pages.
4. Run engine-tests.html on the published site, then test both colors, opening database fallback, a tablebase position, daily puzzle fetch, undo/restart, promotion, and a complete game.

SOURCES
Chess.com opening principles: https://www.chess.com/lessons/opening-principles
Chess.com tactics lessons: https://www.chess.com/lessons/tactics
Chess.com tactics guide: https://www.chess.com/terms/chess-tactics
Chess.com endgame guide: https://www.chess.com/terms/chess-endgame
Chessable endgame pattern resource: https://shop.chessable.com/products/100-endgame-patterns-you-must-know-new-in-chess
Chessable tactical exercise resource: https://shop.chessable.com/products/1001-chess-exercises-for-advanced-club-players
World Chess opening guide: https://worldchess.com/chess-terms/openings
World Chess strategy guide: https://worldchess.com/chess-terms/chess-strategy
World Chess endgame guide: https://shop.worldchess.com/blogs/news/chess-endgame-tactics-how-to-win-the-final-stage-of-the-game
Lichess API: https://lichess.org/api
Lichess opening explorer: https://explorer.lichess.ovh/
Lichess tablebase: https://tablebase.lichess.ovh/
Lichess daily puzzle: https://lichess.org/api/puzzle/daily
Lichess public puzzle database: https://database.lichess.org/#puzzles
Lichess opening names (CC0): https://github.com/lichess-org/chess-openings


VERSION 1.1 — SECTION SEPARATION
- Custom Play · 1 vs 1 is now a dedicated tab for games against Echo Bot, opponent profile, difficulty, move history, and game analysis.
- Chess Learning Lessons is a separate tab with original introductory lessons for openings, tactics, endgames, and strategy.
- Learning tab includes external Chess.com, Chessable, and World Chess references, daily Lichess tactics, and live-data status panels.
- The learning content is educational material, not copied proprietary course content.
- No live deployment was performed by generating this package.


LIVE CHESS KNOWLEDGE UPDATE BASE (v1.2)
- New third tab: Live Knowledge Base.
- Daily GitHub Actions workflow refreshes aggregate Lichess master-opening statistics and daily puzzle metadata.
- Data snapshot: data/chess-knowledge.json. Updater: scripts/update_chess_knowledge.py.
- Workflow: .github/workflows/daily-chess-knowledge.yml (daily at 03:17 UTC, plus manual dispatch).
- Finished games are stored locally in the current browser and can be exported as PGN. The local game log is not uploaded or synced.
- Daily data does not retrain Echo Bot. Engine changes still require code updates and tests. See CHESS_KNOWLEDGE_UPDATE_BASE.md.

VERSION 1.3 — TWO GAME MODES + IN-APP FREE STUDY LIBRARY
- Added a mode selector for Human vs Echo Bot and Human vs Human on the same device.
- Human vs Human alternates White and Black moves locally, without asking Echo Bot to reply. Undo removes one move in this mode and one full human/bot turn in bot mode.
- Added an in-app Free Study Library with original opening, calculation, and endgame checklists visible without leaving the website.
- Added direct links to Lichess Learn, Practice, Training, and Study, which provide free learning features; third-party availability and account requirements can vary.
- Local completed-game tracking remains limited to Human vs Echo Bot games; two-player local games are not mislabelled as bot results.
- JavaScript syntax checks passed for the inline app script and echo-bot.js. A real-browser interactive test and live deployment still need to be performed.
