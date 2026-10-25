# OpenChess Academy — Live Chess Knowledge Update Base

## What updates automatically

- `.github/workflows/daily-chess-knowledge.yml` runs daily at 03:17 UTC and can also be started manually with **Actions → Refresh chess knowledge base → Run workflow**.
- `scripts/update_chess_knowledge.py` requests aggregate move counts from the Lichess Masters Opening Explorer for five reference positions and reads the Lichess daily puzzle metadata. Requests are serial and throttled.
- `data/chess-knowledge.json` stores the timestamp, aggregate move shares, top-move changes, puzzle metadata, update failures, and a 45-snapshot history.
- The third website tab, **Live Knowledge Base**, displays this snapshot and your own local game record.

## Personal game record

Completed games against Echo Bot are stored in browser `localStorage` on the device used to play. The app shows wins/draws/losses and recommends a study topic using a transparent heuristic. **The game record is not uploaded**, does not synchronize across devices, and is not automatically submitted to the daily updater. Use **Export PGNs** to save the games for a future analysis workflow.

## What this does not do

- It does not scrape Chess.com, Chessable, or World Chess pages. Their learning resources remain external references.
- It does not copy paid course content or republish proprietary game collections.
- It does not modify Echo Bot's engine evaluation, search parameters, or Elo automatically. Public opening trends are reference data, not a substitute for tactical regression tests or engine benchmarks.
- It does not prove that a statistically common move is objectively best.

## Enable and verify the daily job

1. Upload the new files to the repository root, preserving the `.github`, `scripts`, and `data` directories.
2. Ensure GitHub Actions is enabled for the repository and that the workflow has permission to write repository contents.
3. Open **Actions → Refresh chess knowledge base → Run workflow** for the first update.
4. Confirm that `data/chess-knowledge.json` was committed and the `updatedAt` value is current.
5. Open the GitHub Pages site, choose **Live Knowledge Base**, and check that the snapshot and opening positions appear.
6. Wait for the scheduled run to verify subsequent daily updates.

## Data source notes

- Lichess API documentation: https://lichess.org/api
- Masters Opening Explorer: https://explorer.lichess.ovh/masters
- Public Lichess database and dataset terms: https://database.lichess.org/
- Daily puzzle API: https://lichess.org/api/puzzle/daily

This is a lightweight, reproducible data pipeline. Future work can import PGNs and evaluate the user's actual mistakes, but such analysis should be implemented and validated separately before it changes engine strategy.
