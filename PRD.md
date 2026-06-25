# PRD: Imposter — Web Edition

## Overview

A real-time, browser-based multiplayer word game for groups of 3–12 players. A host creates a room, shares a link, and players join on their own devices. One player is secretly the imposter — everyone else knows the word. The group discusses, votes, and tries to catch the imposter before they slip away.

Targeted at Indian audiences — all words and categories are Hindi/Indian in nature (Bollywood, cricket, food, festivals, etc.).

---

## Core Game Loop

1. Host creates a room and configures imposter difficulty (no info / category only / category + hint)
2. Host shares the link — players join with just a nickname, no account required
3. Host starts the round — each player taps their card on their own device to reveal either **the word** or **"You are the Imposter"** (+ configured info level)
4. Players discuss verbally — no app timer
5. Host triggers the **voting phase** — each player votes for who they think the imposter is
6. Votes are held, then **revealed all at once** once everyone has submitted
7. **Win conditions:**
   - Majority votes out the imposter → imposter gets a **last-chance word guess** → guess wrong = civilians win, guess right = imposter wins
   - No majority / tie → imposter wins
8. Results screen shown, scoreboard updated
9. Host can start a new round in the same room — same players, fresh word, new imposter

---

## Player Roles

| Role | What they see on card |
|------|----------------------|
| Civilian | The word |
| Imposter (no info) | "You are the Imposter" |
| Imposter (category) | "You are the Imposter" + category |
| Imposter (hint) | "You are the Imposter" + category + hint |

---

## Room & Session Management

- Nickname-only entry — no accounts, no login
- Room persists for multiple rounds until host closes it
- 3–12 players per room
- Host has elevated controls: start game, trigger voting, start new round

---

## Voting

- Open voting — each player selects one name
- Votes hidden during submission, revealed simultaneously once all votes are in
- Tie = imposter wins (no re-vote)

---

## Scoreboard

- Lightweight, session-only — resets when room closes
- Tracks wins per player across rounds
- Displayed after each round result

---

## Content

- Built-in curated word list: Hindi words organized into Indian categories (Bollywood, cricket, street food, festivals, mythology, etc.)
- Each word has a category and an optional hint
- Random word selected each round from the list

---

## Platform

- Mobile-first web app
- Works in browser — no app install required
- Share link is the primary entry point

---

## Issues

### Issue 1 — Room creation & share link
Host creates a room, gets a unique shareable URL. Room stores configuration: player nickname, imposter info level setting, player count.

### Issue 2 — Lobby / waiting room
After joining via link, players land in a lobby showing all connected players. Host sees a "Start Game" button once minimum players (3) are present.

### Issue 3 — Game configuration screen
Before starting the first round, host selects the imposter info level (none / category / category + hint). This is locked in for the session.

### Issue 4 — Card reveal flow
Each player sees a face-down card on their device. They tap to flip it. Card shows word (civilian) or imposter status + configured info. Cards are private — only visible on that player's own device.

### Issue 5 — Voting phase
Host triggers voting. Each player sees a list of all player names and selects one. Vote is submitted and locked. Once all players have voted, all votes reveal simultaneously.

### Issue 6 — Win condition & last-chance guess
After vote reveal: if imposter is majority-voted out, they get a text input to guess the word. Correct guess = imposter wins. Wrong guess or tie = civilians win. Result screen shown to all players.

### Issue 7 — New round flow
Host sees a "New Round" button on result screen. Triggers fresh word selection, new imposter assignment, resets card states. Same players, same room.

### Issue 8 — Session scoreboard
After each round, update and display per-player win count. Shown on result screen. Resets only when room is closed.

### Issue 9 — Hindi/Indian word list
Curate a minimum viable word list: 10+ categories, 5+ words per category, each word with a category label and a hint. Categories to cover: Bollywood, cricket, street food, Indian festivals, Bollywood actors, mythological characters, Indian cities, etc.

### Issue 10 — Real-time sync
Player join/leave events, game state transitions (lobby → card reveal → voting → results), and vote submission all need to sync across all connected devices in real time.

### Issue 11 — Mobile-first UI
Design all screens (lobby, card reveal, voting, results, scoreboard) for small screens first. Clear tap targets, large card flip interaction, readable Hindi text.
