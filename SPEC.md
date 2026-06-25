# Epic: Imposter Web — System Architecture & Full Implementation

## Context

A real-time multiplayer browser game for Indian friend groups (3–12 players). One player is secretly the imposter; everyone else knows a Hindi/Indian-themed word. Players discuss verbally, vote to catch the imposter, and the imposter gets a last-chance word guess. Host shares a link; everyone joins on their own mobile device. No accounts, no persistence beyond session close.

This Epic establishes the full system architecture — tech stack, data models, Socket.io event contracts, state machine, and deployment topology — so every child issue can be implemented without a design decision left open.

---

## Architecture

**Two-service deployment:**

```
Browser (Vercel)                     Game Server (Railway)
─────────────────                    ──────────────────────
Next.js 14 App Router        ←─────→  Express + Socket.io
Tailwind CSS (mobile-first)  WS/WSS   In-memory room state
TypeScript                            TypeScript
```

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS → deployed to Vercel
- **Game server**: Express + Socket.io v4 → deployed to Railway (persistent process, not serverless)
- **State**: In-memory `Map<roomId, Room>` on the game server — no database, no Redis for v1
- **Word list**: Static TypeScript file bundled into the game server

**Why no database:** Game state is ephemeral (session-only, no accounts). A database adds cost, latency, and operational burden with zero benefit for v1. If we add accounts later, we add Postgres then.

---

## Monorepo Structure

```
imposter-web/
├── apps/
│   ├── web/                        # Next.js frontend (Vercel)
│   │   ├── app/
│   │   │   ├── page.tsx            # Home: create room + enter code
│   │   │   ├── join/[code]/        # Join redirect (validates code)
│   │   │   └── room/[code]/        # Game room (all phases rendered here)
│   │   ├── components/
│   │   │   ├── phases/
│   │   │   │   ├── Lobby.tsx
│   │   │   │   ├── CardReveal.tsx
│   │   │   │   ├── Voting.tsx
│   │   │   │   ├── AwaitingGuess.tsx
│   │   │   │   └── Results.tsx
│   │   │   ├── Card.tsx            # Flip animation component
│   │   │   └── Scoreboard.tsx
│   │   ├── hooks/
│   │   │   └── useGameSocket.ts    # All socket event handling
│   │   └── lib/
│   │       └── socket.ts           # Socket.io client singleton
│   └── server/                     # Express + Socket.io (Railway)
│       └── src/
│           ├── index.ts            # Server bootstrap
│           ├── game/
│           │   ├── RoomManager.ts  # CRUD for Room map
│           │   ├── handlers.ts     # All socket event handlers
│           │   └── words.ts        # Word selection logic
│           └── data/
│               └── words.ts        # Hindi word list
├── packages/
│   └── shared/
│       └── src/types.ts            # Shared TypeScript interfaces
├── package.json                    # npm workspaces root
└── PRD.md
```

---

## Data Models (`packages/shared/src/types.ts`)

```typescript
export type InfoLevel = 'none' | 'category' | 'hint'

export type GamePhase =
  | 'lobby'
  | 'card_reveal'
  | 'voting'
  | 'awaiting_guess'
  | 'results'

export interface WordEntry {
  id: string
  word: string      // Hindi word in Devanagari e.g. "शेर"
  category: string  // e.g. "जंगली जानवर"
  hint: string      // e.g. "जंगल का राजा"
}

export interface Player {
  id: string           // socket.id
  nickname: string
  isHost: boolean
  score: number        // session wins, persists across rounds
  connectedAt: number  // epoch ms — used for host transfer ordering
  isConnected: boolean
  hasRevealed: boolean // tracks card flip in card_reveal phase
  vote: string | null  // playerId this player voted for
}

export interface Round {
  word: WordEntry
  imposterId: string
  votes: Record<string, string>       // voterId → targetPlayerId
  result: 'civilians_win' | 'imposter_wins' | null
  guessCorrect: boolean | null
}

export interface Room {
  id: string           // 6-char alphanumeric e.g. "TIGER4"
  infoLevel: InfoLevel
  phase: GamePhase
  players: Record<string, Player>
  round: Round | null
  hostId: string
}
```

---

## Socket.io Event Contracts

### Client → Server

| Event | Payload | Who can send |
|-------|---------|-------------|
| `room:create` | `{ nickname: string, infoLevel: InfoLevel }` | Any |
| `room:join` | `{ roomId: string, nickname: string }` | Any |
| `room:reconnect` | `{ roomId: string, playerId: string }` | Any |
| `game:start` | — | Host only |
| `card:acknowledge` | — | Any (triggers private card:data response) |
| `vote:submit` | `{ targetPlayerId: string }` | Any |
| `guess:submit` | `{ guess: string }` | Imposter only, awaiting_guess phase |
| `round:new` | — | Host only |
| `player:kick` | `{ playerId: string }` | Host only |

### Server → Client

| Event | Payload | Delivery |
|-------|---------|---------|
| `room:joined` | `{ roomId, player, room: RoomPublic }` | Private to joiner |
| `room:state` | `{ phase, players, hostId }` | Broadcast to room |
| `card:data` | `{ isImposter, word?, category?, hint? }` | **Private to socket only** |
| `vote:tick` | `{ count: number, total: number }` | Broadcast (no voter IDs) |
| `vote:reveal` | `{ votes, imposterId, majorityCaught: boolean }` | Broadcast |
| `guess:result` | `{ correct: boolean, word: string }` | Broadcast |
| `phase:results` | `{ result, scores, imposterId, word }` | Broadcast |
| `error` | `{ code: string, message: string }` | Private to socket |

> **Critical privacy boundary:** `card:data` is sent via `socket.emit` (never `io.to(room).emit`). The word is NEVER present in the imposter's `card:data` payload. The frontend never holds full game state — each client only knows its own role.

---

## Game State Machine

```
            ┌─────────────────────────────────────┐
            │              LOBBY                  │
            │  (host clicks Start, ≥3 players)    │
            └──────────────┬──────────────────────┘
                           │
                           ▼
            ┌─────────────────────────────────────┐
            │           CARD_REVEAL               │
            │  (each player taps to flip card)    │
            │  (host clicks "Start Voting")        │
            └──────────────┬──────────────────────┘
                           │
                           ▼
            ┌─────────────────────────────────────┐
            │             VOTING                  │
            │  (all players submit votes)         │
            └──────────────┬──────────────────────┘
                           │
              ┌────────────┴─────────────┐
              │                          │
              ▼                          ▼
   majority caught imposter          tie / no majority
              │                          │
              ▼                          │
   ┌──────────────────────┐             │
   │   AWAITING_GUESS     │             │
   │  (imposter guesses)  │             │
   └──────────┬───────────┘             │
              │                          │
    ┌─────────┴──────────────────────────┤
    │                                    │
    ▼                                    ▼
 ┌────────────────────────────────────────────┐
 │                  RESULTS                   │
 │  (scores updated, host clicks New Round)   │
 └───────────────────┬────────────────────────┘
                     │
                     ▼
                   LOBBY
              (same players, same room,
               scores preserved, phase reset)
```

### Disconnection Handling

- Player disconnects → server starts 60s timer, broadcasts `isConnected: false` to room
- Reconnect within 60s → `room:reconnect` event, player rejoins with same socket ID, timer cleared
- 60s expires → player removed, game continues if ≥3 players remain
- Removed player was host → host transfers to player with lowest `connectedAt` among connected players
- Room drops below 3 connected players mid-round → server emits `error: insufficient_players`, phase snaps to `lobby`

---

## Room Code Generation

- 6-character alphanumeric, uppercase only, excluding O/0/I/1 for readability
- Collision-checked against active rooms on creation
- Share URL: `https://imposter.game/join/TIGER4`
- Lobby displays code prominently: **Room: TIGER4**
- Home page has two CTAs: "Create Room" and "Enter Code" input

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| `apps/web` | Vercel | Auto-deploy on push to `main` |
| `apps/server` | Railway | Single persistent process |
| Env vars | Both | `NEXT_PUBLIC_SOCKET_URL` (frontend), `PORT` (server) |

CORS: game server allows `https://imposter.game` in production, `localhost:3000` in dev.

---

## Child Issues & Dependency Graph

```
#1 Monorepo setup + shared types
    │
    ├──> #2 Word list (data/words.ts — 10 categories × 5+ words)
    │
    └──> #3 Game server — RoomManager + Socket.io handlers
              │
              ├──> #4 Frontend — Socket.io client hook (useGameSocket)
              │         │
              │         ├──> #5 Home page (create room + enter code)
              │         │
              │         └──> #6 Room page — phase router + Lobby screen
              │                   │
              │                   ├──> #7 Card reveal screen + flip animation
              │                   │
              │                   ├──> #8 Voting screen
              │                   │
              │                   ├──> #9 Results + last-chance guess screen
              │                   │
              │                   └──> #10 Scoreboard component
              │
              └──> #11 Deployment (Vercel + Railway, env wiring, CORS)
```

**Sequencing rationale:** #1 first — monorepo scaffold and shared types are the compile target for everything. #2 and #3 can run in parallel after #1. Frontend (#4 onward) cannot start until the server emits real events. #11 can be wired early but not fully tested until #6–#10 are complete.

---

## Acceptance Criteria

1. Host creates a room and receives a 6-character code and shareable URL
2. 3 players join via URL on separate devices; lobby shows all 3 nicknames in real time
3. Host starts game; each player's device shows a face-down card
4. Each player taps their card; it flips to reveal their word (civilians) or imposter status
5. Imposter's `card:data` socket payload contains no `word` field — verifiable in browser devtools
6. Host triggers voting; all players see the player list and submit a vote
7. Votes are hidden until all are submitted, then all reveal simultaneously
8. Majority vote → imposter gets last-chance guess; correct = imposter wins, wrong = civilians win
9. Tie → imposter wins without guess flow
10. Results screen shows winner, word reveal, and updated scoreboard
11. Host clicks New Round — same players, same room, scores preserved, new word, new imposter
12. Player disconnects mid-game → shown as disconnected; reconnect within 60s restores their state
13. Host disconnects → host role transfers to next-oldest connected player automatically
14. Room drops to 2 players → game snaps to lobby with `insufficient_players` error message
15. All screens usable at 375px width (iPhone SE) with no horizontal scroll
16. Hindi Devanagari text renders correctly on iOS Safari and Android Chrome

---

## Testing Plan

| Layer | What | Count |
|-------|------|-------|
| Unit | `RoomManager` — create, join, reconnect, kick, host transfer | +8 |
| Unit | Word selection — no repeat in session, all categories reachable | +3 |
| Unit | Vote tallying — majority detection, tie detection | +4 |
| Unit | `card:data` payload — imposter never receives word field | +2 |
| Integration | Full round: join → start → card reveal → vote → result → new round | +2 |
| Integration | Disconnection: disconnect mid-vote → reconnect → vote still counted | +2 |
| Integration | Host transfer: host disconnects → new host can trigger `round:new` | +1 |
| E2E (Playwright) | Mobile viewport: create room → join at 375px → complete full round | +1 |

---

## Effort Estimate

| Area | Estimate |
|------|----------|
| #1 Monorepo + shared types | 2h |
| #2 Word list (10 categories × 5+ words, Hindi + hints) | 3h |
| #3 Game server (RoomManager + all Socket.io handlers) | 6h |
| #4 Socket.io client hook | 2h |
| #5 Home page | 1h |
| #6 Room page + Lobby | 2h |
| #7 Card reveal + flip animation | 2h |
| #8 Voting screen | 2h |
| #9 Results + guess screen | 2h |
| #10 Scoreboard | 1h |
| #11 Deployment | 2h |
| Tests | 3h |
| **Total** | **~28h** |

---

## Out of Scope (v1)

- User accounts or authentication
- Custom word entry by host
- Discussion timer
- Multiple imposters
- Persistent scores across sessions
- Spectator mode
- Game replay or history

---

## Rollback Plan

Each service deploys independently. Game server bug: redeploy previous Railway build (Railway retains last 3). Frontend bug: Vercel instant rollback via dashboard. No database means no migration rollback needed.
