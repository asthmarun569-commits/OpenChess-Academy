# Architecture and trust boundaries

- Browser renders the board and sends intended moves.
- `chess.js` on the server is authoritative for online moves and game termination.
- Account passwords are bcrypt-hashed. JWT secrets are environment-only.
- PostgreSQL persists accounts and completed games.
- App ratings are Elo-style estimates and are not official FIDE ratings.
- The current matchmaking queue is in-memory and intended for one server instance only.
- The current online protocol needs reconnection, clock enforcement, resign/draw actions, rate limits, and stronger abuse controls before public competition.
