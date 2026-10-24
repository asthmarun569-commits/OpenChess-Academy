# OpenChess Academy

Full-stack starter for a browser-based chess platform. This is an initial working foundation, not a finished commercial service.

## Stack
- `apps/web`: React + TypeScript + Vite
- `apps/server`: Express + Socket.IO + chess.js + Prisma
- PostgreSQL for persistent accounts, games, and ratings
- GitHub Actions CI
- Server validates online moves; clients cannot submit arbitrary game results.

## Features in this starter
- Register / login using JWT
- Interactive legal-move chessboard
- Local practice vs another person on the same device
- Online room creation/joining and server-validated moves via Socket.IO
- Elo-style rating updates when a server-recorded game finishes
- Learning section with starter curriculum and progress saved in browser
- Tactics section with starter puzzle
- Player profile and game history endpoints
- Database schema, environment templates, CI, and Git version-control workflow

## Requirements
- Node.js 20+
- PostgreSQL 15+
- npm 10+

## Run locally
1. Copy `.env.example` to `apps/server/.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. Install dependencies from the repository root:
   ```bash
   npm install
   ```
3. Create tables:
   ```bash
   npm run db:push
   ```
4. Run frontend and server:
   ```bash
   npm run dev
   ```
   Web: http://localhost:5173
   API: http://localhost:4000/health

## Before public launch
- Add rate limiting, email verification, password reset, account deletion, moderation/reporting, anti-cheat review, logging/monitoring, backups, and security review.
- Configure production PostgreSQL and HTTPS.
- Set `VITE_API_URL` to the deployed API URL.
- Set `CORS_ORIGIN` to the deployed web URL.
- The current matchmaking is a small in-memory queue; use a shared queue (e.g. Redis) for multiple server instances.
- Ratings here are app ratings, not FIDE ratings.
- The included puzzle and curriculum are seed content, not a complete verified chess course.
- The computer-opponent panel is a placeholder for Stockfish integration; no engine is bundled in this starter.

## Git workflow
- `main`: protected production branch
- `develop`: integration branch
- `feature/<short-name>`: one feature per branch
- Open a pull request into `develop`; merge tested releases into `main`.
- Use meaningful commits such as `feat: add online matchmaking`, `fix: reject illegal server moves`.
- Never commit `.env`, access tokens, passwords, database URLs, or production secrets.

## Suggested milestones
1. Foundation (this starter)
2. Stockfish computer opponent + difficulty controls
3. Verified puzzle library and lesson content
4. Persistent matchmaking and reconnection
5. Tournament rooms, leaderboards, and anti-cheat
6. PWA polish, accessibility, load testing, and production hardening
