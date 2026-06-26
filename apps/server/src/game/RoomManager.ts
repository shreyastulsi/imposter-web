import type {
  Room,
  Player,
  InfoLevel,
  WordEntry,
  CardData,
  GuessResult,
} from '@imposter/shared'

interface VoteTick {
  count: number
  total: number
}

interface VoteResult {
  majorityCaught: boolean
  imposterId: string
  votes: Record<string, string>
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRoomId(existing: Set<string>): string {
  let id: string
  do {
    id = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  } while (existing.has(id))
  return id
}

export class RoomManager {
  private rooms = new Map<string, Room>()

  constructor(private wordList: WordEntry[]) {}

  createRoom(playerId: string, nickname: string, infoLevel: InfoLevel): Room {
    const id = generateRoomId(new Set(this.rooms.keys()))
    const player: Player = {
      id: playerId,
      nickname,
      isHost: true,
      score: 0,
      connectedAt: Date.now(),
      isConnected: true,
      hasRevealed: false,
      vote: null,
    }
    const room: Room = {
      id,
      infoLevel,
      phase: 'lobby',
      players: { [playerId]: player },
      round: null,
      hostId: playerId,
    }
    this.rooms.set(id, room)
    return this.clone(room)
  }

  joinRoom(roomId: string, playerId: string, nickname: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.phase !== 'lobby') throw new Error('game_in_progress')
    if (Object.keys(room.players).length >= 12) throw new Error('room_full')
    room.players[playerId] = {
      id: playerId,
      nickname,
      isHost: false,
      score: 0,
      connectedAt: Date.now(),
      isConnected: true,
      hasRevealed: false,
      vote: null,
    }
    return this.clone(room)
  }

  startGame(roomId: string, callerId: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.hostId !== callerId) throw new Error('not_host')
    const connected = this.connectedPlayers(room)
    if (connected.length < 3) throw new Error('not_enough_players')

    const word = this.pickWord(room)
    const imposterId = connected[Math.floor(Math.random() * connected.length)].id

    room.round = {
      word,
      imposterId,
      votes: {},
      result: null,
      guessCorrect: null,
    }
    room.phase = 'card_reveal'
    Object.values(room.players).forEach(p => { p.hasRevealed = false; p.vote = null })
    return this.clone(room)
  }

  startDiscussion(roomId: string, callerId: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.hostId !== callerId) throw new Error('not_host')
    if (room.phase !== 'card_reveal') throw new Error('wrong_phase')
    const round = this.requireRound(room)
    const connected = this.connectedPlayers(room)
    const shuffled = [...connected].sort(() => Math.random() - 0.5).map(p => p.id)
    round.turnOrder = shuffled
    round.currentTurnIndex = 0
    round.discussionRound = 1
    room.phase = 'discussion'
    return this.clone(room)
  }

  advanceTurn(roomId: string): { done: true } | { done: false; playerId: string; turnNumber: 1 | 2 } {
    const room = this.getWritableRoom(roomId)
    const round = this.requireRound(room)
    const order = round.turnOrder!
    let index = round.currentTurnIndex! + 1
    let discussionRound = round.discussionRound!

    // If we've exhausted this round, move to next round or finish
    if (index >= order.length) {
      if (discussionRound === 2) {
        room.phase = 'voting'
        return { done: true }
      }
      discussionRound = 2
      index = 0
    }

    // Skip disconnected players
    while (index < order.length && !room.players[order[index]]?.isConnected) {
      index++
      if (index >= order.length) {
        if (discussionRound === 2) {
          room.phase = 'voting'
          return { done: true }
        }
        discussionRound = 2
        index = 0
      }
    }

    round.currentTurnIndex = index
    round.discussionRound = discussionRound
    return { done: false, playerId: order[index], turnNumber: discussionRound }
  }

  startVoting(roomId: string, callerId: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.hostId !== callerId) throw new Error('not_host')
    room.phase = 'voting'
    return this.clone(room)
  }

  getCardData(roomId: string, playerId: string): CardData {
    const room = this.getWritableRoom(roomId)
    const round = this.requireRound(room)
    const { infoLevel } = room
    const isImposter = round.imposterId === playerId

    room.players[playerId].hasRevealed = true

    if (!isImposter) {
      const base: CardData = { isImposter: false, word: round.word.word, english: round.word.english, category: round.word.category, englishCategory: round.word.englishCategory }
      if (infoLevel === 'hint') { base.hint = round.word.hint; base.englishHint = round.word.englishHint }
      return base
    }

    const card: CardData = { isImposter: true }
    if (infoLevel === 'category') { card.category = round.word.category; card.englishCategory = round.word.englishCategory }
    if (infoLevel === 'hint') { card.category = round.word.category; card.englishCategory = round.word.englishCategory; card.hint = round.word.hint; card.englishHint = round.word.englishHint }
    return card
  }

  submitVote(roomId: string, voterId: string, targetId: string): VoteTick {
    const room = this.getWritableRoom(roomId)
    const round = this.requireRound(room)
    round.votes[voterId] = targetId
    room.players[voterId].vote = targetId
    const total = this.connectedPlayers(room).length
    return { count: Object.keys(round.votes).length, total }
  }

  tallyVotes(roomId: string): VoteResult {
    const room = this.getWritableRoom(roomId)
    const round = this.requireRound(room)
    const tally: Record<string, number> = {}
    for (const targetId of Object.values(round.votes)) {
      tally[targetId] = (tally[targetId] ?? 0) + 1
    }
    const total = this.connectedPlayers(room).length
    const threshold = total / 2
    let majorityCaught = false
    for (const [targetId, count] of Object.entries(tally)) {
      if (count > threshold && targetId === round.imposterId) {
        majorityCaught = true
        break
      }
    }
    room.phase = majorityCaught ? 'awaiting_guess' : 'results'
    if (!majorityCaught) round.result = 'imposter_wins'
    return { majorityCaught, imposterId: round.imposterId, votes: { ...round.votes } }
  }

  hostJudgeGuess(roomId: string, hostId: string, correct: boolean): { result: 'civilians_win' | 'imposter_wins' } {
    const room = this.getWritableRoom(roomId)
    if (room.hostId !== hostId) throw new Error('not_host')
    if (room.phase !== 'awaiting_guess') throw new Error('wrong_phase')
    const round = this.requireRound(room)
    const result = correct ? 'imposter_wins' : 'civilians_win'
    round.guessCorrect = correct
    round.result = result
    return { result }
  }

  finalizeResult(roomId: string, result: 'civilians_win' | 'imposter_wins'): Room {
    const room = this.getWritableRoom(roomId)
    const round = this.requireRound(room)
    round.result = result
    room.phase = 'results'

    const players = Object.values(room.players)
    if (result === 'civilians_win') {
      players.filter(p => p.id !== round.imposterId).forEach(p => { p.score += 1 })
    } else {
      room.players[round.imposterId].score += 1
    }
    return this.clone(room)
  }

  startNewRound(roomId: string, callerId: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.hostId !== callerId) throw new Error('not_host')
    if (!room.round) throw new Error('no_active_round')

    const word = this.pickWord(room)
    const connected = this.connectedPlayers(room)
    const imposterId = connected[Math.floor(Math.random() * connected.length)].id

    room.round = { word, imposterId, votes: {}, result: null, guessCorrect: null }
    room.phase = 'card_reveal'
    Object.values(room.players).forEach(p => { p.hasRevealed = false; p.vote = null })
    return this.clone(room)
  }

  disconnectPlayer(roomId: string, playerId: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.players[playerId]) room.players[playerId].isConnected = false
    return this.clone(room)
  }

  reconnectPlayer(roomId: string, oldPlayerId: string, newPlayerId: string): Room {
    const room = this.getWritableRoom(roomId)
    const existing = room.players[oldPlayerId]
    if (!existing) throw new Error('player_not_found')
    const restored: Player = { ...existing, id: newPlayerId, isConnected: true }
    delete room.players[oldPlayerId]
    room.players[newPlayerId] = restored
    if (room.hostId === oldPlayerId) room.hostId = newPlayerId
    return this.clone(room)
  }

  transferHostIfNeeded(roomId: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.players[room.hostId]?.isConnected) return this.clone(room)
    const connected = this.connectedPlayers(room)
    if (connected.length === 0) return this.clone(room)
    const newHost = connected.sort((a, b) => a.connectedAt - b.connectedAt)[0]
    room.players[room.hostId].isHost = false
    newHost.isHost = true
    room.hostId = newHost.id
    return this.clone(room)
  }

  kickPlayer(roomId: string, callerId: string, targetId: string): Room {
    const room = this.getWritableRoom(roomId)
    if (room.hostId !== callerId) throw new Error('not_host')
    delete room.players[targetId]
    return this.clone(room)
  }

  getRoom(roomId: string): Room | null {
    const room = this.rooms.get(roomId)
    return room ? this.clone(room) : null
  }

  private getWritableRoom(roomId: string): Room {
    const room = this.rooms.get(roomId)
    if (!room) throw new Error('room_not_found')
    return room
  }

  private requireRound(room: Room) {
    if (!room.round) throw new Error('no_active_round')
    return room.round
  }

  private connectedPlayers(room: Room) {
    return Object.values(room.players).filter(p => p.isConnected)
  }

  private pickWord(room: Room): WordEntry {
    return this.wordList[Math.floor(Math.random() * this.wordList.length)]
  }

  private clone(room: Room): Room {
    return JSON.parse(JSON.stringify(room))
  }
}
