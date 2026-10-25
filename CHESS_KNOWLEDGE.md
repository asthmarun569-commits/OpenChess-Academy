# Chess knowledge research used by Echo Bot

This document summarizes publicly accessible concepts used to prioritize the engine's own implementation. It does not reproduce paid lessons, books, course PGNs, or proprietary databases.

## Source-derived themes

### Chess.com
The public opening-principles lesson emphasizes control of the center, rapid development, king safety, and piece activity. Its public tactics lesson catalogue includes forks/double attacks, pins, skewers, discovered attacks, sacrifices, checkmate patterns, defensive resources, promotion, zugzwang, and related motifs.

### Chessable
Public product descriptions for tactical exercises emphasize pattern recognition, visualization, calculation, quiet moves, and defensive tactics. Public endgame-pattern descriptions emphasize recognizing recurring practical patterns. These descriptions informed future priorities; no paid course file or copyrighted text has been bundled.

### World Chess
Its public opening guide emphasizes move orders, opening plans, strengths/weaknesses, and how the opening shapes the middlegame. Its strategy guide discusses material, king safety, piece activity, space, pawn structure, improving the worst-placed piece, prophylaxis, and purposeful exchanges. Its endgame guide emphasizes king activity, passed pawns, promotion races, zugzwang, and patient calculation.

## What the current engine implements

- Existing search and quiescence are the primary tactical calculation mechanism. Move ordering prioritizes captures, promotions, checks, and search heuristics.
- Evaluation includes material, piece-square values, development, center-pawn presence, mobility, king shelter/centralization, bishop pair, rook files/seventh rank/connected rooks, pawn structure, and passed pawns.
- Lichess Opening Explorer provides sampled move statistics during the opening; this is not copied from Chess.com, Chessable, or World Chess.
- Lichess/Syzygy provides exact tablebase results only for covered positions.
- The Lichess daily puzzle is linked as separate practice, not used to train the engine.

## What remains unimplemented

No full named-opening repertoire, tactical-motif classifier, neural-network training, large proprietary PGN dataset, comprehensive strategic planning module, or verified Elo benchmark has been added. Those require suitable openly licensed data and systematic testing.

## References

- https://www.chess.com/lessons/opening-principles
- https://www.chess.com/lessons/tactics
- https://www.chess.com/terms/chess-tactics
- https://www.chess.com/terms/chess-endgame
- https://shop.chessable.com/products/100-endgame-patterns-you-must-know-new-in-chess
- https://shop.chessable.com/products/1001-chess-exercises-for-advanced-club-players
- https://worldchess.com/chess-terms/openings
- https://worldchess.com/chess-terms/chess-strategy
- https://shop.worldchess.com/blogs/news/chess-endgame-tactics-how-to-win-the-final-stage-of-the-game


## v1.1 interface update
The app now separates Custom Play (1 vs 1) from Chess Learning Lessons using two accessible tabs. Learning contains original short lessons on opening principles, tactical motifs, endgame basics, and positional planning, plus external source links and the Lichess daily puzzle tool.
