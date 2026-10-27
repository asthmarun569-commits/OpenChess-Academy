# Echo Bot hybrid Lichess advisor patch

## Repository inspection
The current `index.html` already queries the Lichess opening explorer and endgame tablebase. At present, it directly plays the opening-explorer recommendation instead of always letting Echo Bot's local search decide. It does not yet query the cloud-evaluation endpoint or expose an advisor toggle.

## Add the helper
1. Add `lichess-advisor.js` beside `index.html`.
2. In `index.html`, add `<script src="./lichess-advisor.js"></script>` before the app's main inline script.
3. Add a checkbox labelled “Use Lichess as optional advisor” in the existing “Live chess data and study tools” section. Default it checked.
4. When the checkbox is off, skip all `EchoLichessAdvisor` requests and run the existing worker search only.
5. When on, call `EchoLichessAdvisor.opening(game.fen(), game)` during the opening and display its move sample / game counts, but do **not** play that recommendation automatically. Always proceed to `worker.postMessage(...)` so Echo Bot's own search selects the move.
6. In middlegames, call `EchoLichessAdvisor.cloudEval(game.fen(), game)` and display the cached candidate/score as reference data only. If no cached result or the API fails, continue local search.
7. For eligible positions of seven pieces or fewer, call `EchoLichessAdvisor.tablebase(game.fen(), game)`. Tablebase results are exact for covered positions; it is reasonable to play its legal recommendation directly. If unavailable, fall back to the local worker.
8. Check that the app does not make overlapping API requests; use a short timeout and honour the existing `searchId` cancellation check after each await.

## Safety and correctness
- All returned UCI moves are filtered against `game.moves({verbose:true})` before use.
- The helper is advisory; opening statistics and cloud evaluations do not prove the best move.
- The helper contains no tokens or credentials.
- Respect Lichess rate limits; do not poll repeatedly or use the advisor to assist during games played on Lichess where external assistance is prohibited.

## Tests
Run `node --check lichess-advisor.js`. In the published site, test with advisor on and off, with network disabled, in the opening, in a middlegame with and without cached cloud evaluation, and in a tablebase-eligible endgame. Confirm the board remains responsive and Echo Bot still returns legal moves when the APIs fail.
