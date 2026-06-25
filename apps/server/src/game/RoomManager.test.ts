import { describe, it, expect, beforeEach } from 'vitest'
import { RoomManager } from './RoomManager'

const WORD_LIST = [
  { id: 'w1', word: 'शेर', english: 'Lion', category: 'जानवर', hint: 'जंगल का राजा' },
  { id: 'w2', word: 'हाथी', english: 'Elephant', category: 'जानवर', hint: 'सबसे बड़ा जानवर' },
  { id: 'w3', word: 'बाघ', english: 'Tiger', category: 'जानवर', hint: 'धारीदार जानवर' },
]

let manager: RoomManager

beforeEach(() => {
  manager = new RoomManager(WORD_LIST)
})

// ─── Behavior 1: createRoom ───────────────────────────────────────────────────

describe('createRoom', () => {
  it('returns a room with a 6-char ID, creator as host, lobby phase', () => {
    const room = manager.createRoom('socket-1', 'Rahul', 'none')
    expect(room.id).toMatch(/^[A-Z2-9]{6}$/)
    expect(room.phase).toBe('lobby')
    expect(room.hostId).toBe('socket-1')
    expect(room.players['socket-1'].isHost).toBe(true)
    expect(room.players['socket-1'].nickname).toBe('Rahul')
    expect(room.players['socket-1'].score).toBe(0)
    expect(room.infoLevel).toBe('none')
  })

  it('generates unique IDs for concurrent rooms', () => {
    const ids = Array.from({ length: 20 }, (_, i) =>
      manager.createRoom(`s${i}`, `Player${i}`, 'none').id
    )
    expect(new Set(ids).size).toBe(20)
  })
})

// ─── Behavior 2: joinRoom ─────────────────────────────────────────────────────

describe('joinRoom', () => {
  it('adds a non-host player to an existing lobby', () => {
    const room = manager.createRoom('socket-1', 'Rahul', 'none')
    const updated = manager.joinRoom(room.id, 'socket-2', 'Priya')
    expect(updated.players['socket-2']).toBeDefined()
    expect(updated.players['socket-2'].isHost).toBe(false)
    expect(updated.players['socket-2'].nickname).toBe('Priya')
    expect(Object.keys(updated.players)).toHaveLength(2)
  })

  it('throws when room does not exist', () => {
    expect(() => manager.joinRoom('BADCODE', 'socket-2', 'Priya')).toThrow('room_not_found')
  })

  it('throws when room is not in lobby phase', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    manager.startGame(room.id, 's1')
    expect(() => manager.joinRoom(room.id, 's4', 'D')).toThrow('game_in_progress')
  })

  it('throws when room is full (12 players)', () => {
    const room = manager.createRoom('s0', 'P0', 'none')
    for (let i = 1; i < 12; i++) manager.joinRoom(room.id, `s${i}`, `P${i}`)
    expect(() => manager.joinRoom(room.id, 's12', 'P12')).toThrow('room_full')
  })
})

// ─── Behavior 4+5: startGame ─────────────────────────────────────────────────

describe('startGame', () => {
  it('transitions to card_reveal phase with ≥3 players', () => {
    const room = manager.createRoom('s1', 'A', 'hint')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    const started = manager.startGame(room.id, 's1')
    expect(started.phase).toBe('card_reveal')
    expect(started.round).not.toBeNull()
    expect(started.round!.imposterId).toBeDefined()
    expect(['s1', 's2', 's3']).toContain(started.round!.imposterId)
  })

  it('throws when fewer than 3 players', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    expect(() => manager.startGame(room.id, 's1')).toThrow('not_enough_players')
  })

  it('throws when caller is not host', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    expect(() => manager.startGame(room.id, 's2')).toThrow('not_host')
  })
})

// ─── Behaviors 6+7: getCardData ──────────────────────────────────────────────

describe('getCardData', () => {
  function setupStartedRoom(infoLevel: 'none' | 'category' | 'hint') {
    const room = manager.createRoom('s1', 'A', infoLevel)
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    const started = manager.startGame(room.id, 's1')
    return { roomId: room.id, imposterId: started.round!.imposterId, players: ['s1', 's2', 's3'] }
  }

  it('civilian gets word, english translation, category, and hint with infoLevel=hint', () => {
    const { roomId, imposterId, players } = setupStartedRoom('hint')
    const civilian = players.find(p => p !== imposterId)!
    const card = manager.getCardData(roomId, civilian)
    expect(card.isImposter).toBe(false)
    expect(card.word).toBeDefined()
    expect(card.english).toBeDefined()
    expect(card.category).toBeDefined()
    expect(card.hint).toBeDefined()
  })

  it('civilian gets word, english translation, and category but no hint with infoLevel=category', () => {
    const { roomId, imposterId, players } = setupStartedRoom('category')
    const civilian = players.find(p => p !== imposterId)!
    const card = manager.getCardData(roomId, civilian)
    expect(card.isImposter).toBe(false)
    expect(card.word).toBeDefined()
    expect(card.english).toBeDefined()
    expect(card.category).toBeDefined()
    expect(card.hint).toBeUndefined()
  })

  it('imposter never receives the word field regardless of infoLevel — PRIVACY CRITICAL', () => {
    const { roomId, imposterId } = setupStartedRoom('hint')
    const card = manager.getCardData(roomId, imposterId)
    expect(card.isImposter).toBe(true)
    expect('word' in card).toBe(false)
  })

  it('imposter with infoLevel=hint gets category+hint but no word', () => {
    const { roomId, imposterId } = setupStartedRoom('hint')
    const card = manager.getCardData(roomId, imposterId)
    expect(card.isImposter).toBe(true)
    expect('word' in card).toBe(false)
    expect(card.category).toBeDefined()
    expect(card.hint).toBeDefined()
  })

  it('imposter with infoLevel=category gets only category, no word or hint', () => {
    const { roomId, imposterId } = setupStartedRoom('category')
    const card = manager.getCardData(roomId, imposterId)
    expect(card.isImposter).toBe(true)
    expect('word' in card).toBe(false)
    expect(card.category).toBeDefined()
    expect('hint' in card).toBe(false)
  })

  it('imposter with infoLevel=none gets only isImposter:true', () => {
    const { roomId, imposterId } = setupStartedRoom('none')
    const card = manager.getCardData(roomId, imposterId)
    expect(card.isImposter).toBe(true)
    expect('word' in card).toBe(false)
    expect('category' in card).toBe(false)
    expect('hint' in card).toBe(false)
  })

  it('getCardData marks the player as hasRevealed in room state', () => {
    const { roomId, players } = setupStartedRoom('none')
    manager.getCardData(roomId, players[0])
    const room = manager.getRoom(roomId)!
    expect(room.players[players[0]].hasRevealed).toBe(true)
    // other players are still unrevealed
    expect(room.players[players[1]].hasRevealed).toBe(false)
  })

  it('all players revealed when every player calls getCardData', () => {
    const { roomId, players } = setupStartedRoom('none')
    for (const pid of players) manager.getCardData(roomId, pid)
    const room = manager.getRoom(roomId)!
    const allRevealed = Object.values(room.players).every(p => p.hasRevealed)
    expect(allRevealed).toBe(true)
  })
})

// ─── Behaviors 8+9+10: voting ────────────────────────────────────────────────

describe('voting', () => {
  function setupVotingRoom() {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    const started = manager.startGame(room.id, 's1')
    manager.startVoting(room.id, 's1')
    return { roomId: room.id, imposterId: started.round!.imposterId }
  }

  it('records a vote and returns updated tick count', () => {
    const { roomId } = setupVotingRoom()
    const tick = manager.submitVote(roomId, 's1', 's2')
    expect(tick.count).toBe(1)
    expect(tick.total).toBe(3)
  })

  it('majority vote catches the imposter', () => {
    const { roomId, imposterId } = setupVotingRoom()
    const civilians = ['s1', 's2', 's3'].filter(p => p !== imposterId)
    manager.submitVote(roomId, civilians[0], imposterId)
    manager.submitVote(roomId, civilians[1], imposterId)
    manager.submitVote(roomId, imposterId, civilians[0])
    const result = manager.tallyVotes(roomId)
    expect(result.majorityCaught).toBe(true)
    expect(result.imposterId).toBe(imposterId)
  })

  it('tie vote means imposter survives (majorityCaught: false)', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    manager.joinRoom(room.id, 's4', 'D')
    const started = manager.startGame(room.id, 's1')
    manager.startVoting(room.id, 's1')
    const imposterId = started.round!.imposterId
    const others = ['s1', 's2', 's3', 's4'].filter(p => p !== imposterId)
    manager.submitVote(room.id, others[0], others[1])
    manager.submitVote(room.id, others[1], others[0])
    manager.submitVote(room.id, others[2], others[1])
    manager.submitVote(room.id, imposterId, others[0])
    const result = manager.tallyVotes(room.id)
    expect(result.majorityCaught).toBe(false)
  })
})

// ─── Behaviors 11+12: submitGuess ────────────────────────────────────────────

describe('submitGuess', () => {
  function setupGuessRoom() {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    const started = manager.startGame(room.id, 's1')
    manager.startVoting(room.id, 's1')
    const imposterId = started.round!.imposterId
    const civilians = ['s1', 's2', 's3'].filter(p => p !== imposterId)
    manager.submitVote(room.id, civilians[0], imposterId)
    manager.submitVote(room.id, civilians[1], imposterId)
    manager.submitVote(room.id, imposterId, civilians[0])
    manager.tallyVotes(room.id)
    return { roomId: room.id, word: started.round!.word.word }
  }

  it('correct guess gives imposter the win', () => {
    const { roomId, word } = setupGuessRoom()
    const result = manager.submitGuess(roomId, word)
    expect(result.correct).toBe(true)
    expect(result.result).toBe('imposter_wins')
  })

  it('wrong guess gives civilians the win', () => {
    const { roomId } = setupGuessRoom()
    const result = manager.submitGuess(roomId, 'गलत जवाब')
    expect(result.correct).toBe(false)
    expect(result.result).toBe('civilians_win')
  })
})

// ─── Behavior 13: startNewRound ──────────────────────────────────────────────

describe('startNewRound', () => {
  it('preserves scores, resets phase to card_reveal, assigns new imposter', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    const started = manager.startGame(room.id, 's1')
    manager.startVoting(room.id, 's1')
    const imposterId = started.round!.imposterId
    const civilians = ['s1', 's2', 's3'].filter(p => p !== imposterId)
    manager.submitVote(room.id, civilians[0], imposterId)
    manager.submitVote(room.id, civilians[1], imposterId)
    manager.submitVote(room.id, imposterId, civilians[0])
    manager.tallyVotes(room.id)
    manager.finalizeResult(room.id, 'civilians_win')

    const newRoom = manager.startNewRound(room.id, 's1')
    expect(newRoom.phase).toBe('card_reveal')
    expect(newRoom.players[civilians[0]].score).toBe(1)
    expect(newRoom.players[civilians[1]].score).toBe(1)
    expect(newRoom.players[imposterId].score).toBe(0)
    expect(newRoom.round).not.toBeNull()
  })
})

// ─── Behaviors 14+15+16: disconnection & reconnection ────────────────────────

describe('disconnection', () => {
  it('marks player as disconnected', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.disconnectPlayer(room.id, 's2')
    const updated = manager.getRoom(room.id)!
    expect(updated.players['s2'].isConnected).toBe(false)
  })

  it('reconnect within grace period restores player', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.disconnectPlayer(room.id, 's2')
    manager.reconnectPlayer(room.id, 's2', 's2-new')
    const updated = manager.getRoom(room.id)!
    expect(updated.players['s2-new'].isConnected).toBe(true)
    expect(updated.players['s2-new'].nickname).toBe('B')
    expect(updated.players['s2']).toBeUndefined()
  })

  it('host transfers to oldest connected player when host disconnects', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    manager.disconnectPlayer(room.id, 's1')
    manager.transferHostIfNeeded(room.id)
    const updated = manager.getRoom(room.id)!
    expect(updated.hostId).toBe('s2')
    expect(updated.players['s2'].isHost).toBe(true)
    expect(updated.players['s1'].isHost).toBe(false)
  })
})

// ─── Behavior 17: kickPlayer ─────────────────────────────────────────────────

describe('kickPlayer', () => {
  it('host can kick another player', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.kickPlayer(room.id, 's1', 's2')
    const updated = manager.getRoom(room.id)!
    expect(updated.players['s2']).toBeUndefined()
  })

  it('non-host cannot kick', () => {
    const room = manager.createRoom('s1', 'A', 'none')
    manager.joinRoom(room.id, 's2', 'B')
    manager.joinRoom(room.id, 's3', 'C')
    expect(() => manager.kickPlayer(room.id, 's2', 's3')).toThrow('not_host')
  })
})
