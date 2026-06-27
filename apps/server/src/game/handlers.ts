import type { Server, Socket } from 'socket.io'
import type { RoomManager } from './RoomManager'

const TURN_DURATION_MS = 30_000
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTurnTimer(roomId: string) {
  const t = turnTimers.get(roomId)
  if (t) { clearTimeout(t); turnTimers.delete(roomId) }
}

function emitTurn(io: Server, mgr: RoomManager, roomId: string, playerId: string, turnNumber: 1 | 2) {
  const timeoutAt = Date.now() + TURN_DURATION_MS
  io.to(roomId).emit('discussion:turn', { playerId, turnNumber, timeoutAt })
  clearTurnTimer(roomId)
  turnTimers.set(roomId, setTimeout(() => {
    advanceTurnAndBroadcast(io, mgr, roomId)
  }, TURN_DURATION_MS))
}

function advanceTurnAndBroadcast(io: Server, mgr: RoomManager, roomId: string, autoWord?: string) {
  clearTurnTimer(roomId)
  try {
    const room = mgr.getRoom(roomId)
    if (!room?.round) return
    const currentPlayerId = room.round.turnOrder?.[room.round.currentTurnIndex ?? 0]
    const currentRound = room.round.discussionRound ?? 1
    if (currentPlayerId) {
      mgr.recordWord(roomId, currentPlayerId, autoWord ?? '—', currentRound)
    }
    const result = mgr.advanceTurn(roomId)
    if (result.done) {
      const updated = mgr.getRoom(roomId)
      if (updated) {
        io.to(roomId).emit('room:state', { phase: updated.phase, players: updated.players, hostId: updated.hostId })
        io.to(roomId).emit('discussion:review', mgr.getWordReviewData(roomId))
      }
    } else {
      emitTurn(io, mgr, roomId, result.playerId, result.turnNumber)
    }
  } catch {
    // room may be gone
  }
}

export function registerHandlers(io: Server, socket: Socket, mgr: RoomManager) {
  socket.on('room:create', ({ nickname, infoLevel }) => {
    try {
      const room = mgr.createRoom(socket.id, nickname, infoLevel)
      socket.join(room.id)
      socket.emit('room:joined', { roomId: room.id, player: room.players[socket.id], room })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('room:join', ({ roomId, nickname }) => {
    try {
      const room = mgr.joinRoom(roomId, socket.id, nickname)
      socket.join(roomId)
      socket.emit('room:joined', { roomId, player: room.players[socket.id], room })
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('room:reconnect', ({ roomId, playerId }) => {
    try {
      const room = mgr.reconnectPlayer(roomId, playerId, socket.id)
      socket.join(roomId)
      socket.emit('room:joined', { roomId, player: room.players[socket.id], room })
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('game:start', ({ roomId }) => {
    try {
      const room = mgr.startGame(roomId, socket.id)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('discussion:start', ({ roomId }) => {
    try {
      const room = mgr.startDiscussion(roomId, socket.id)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
      const round = room.round!
      emitTurn(io, mgr, roomId, round.turnOrder![0], 1)
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('discussion:recording', ({ roomId }) => {
    try {
      const room = mgr.getRoom(roomId)
      if (!room?.round) return
      if (room.round.turnOrder![room.round.currentTurnIndex!] !== socket.id) return
      // Player has committed to their turn — clear auto-advance timer, give 60s to finish
      clearTurnTimer(roomId)
      turnTimers.set(roomId, setTimeout(() => {
        advanceTurnAndBroadcast(io, mgr, roomId)
      }, 60_000))
    } catch {
      // ignore
    }
  })

  socket.on('discussion:spoke', ({ roomId, word }) => {
    try {
      const room = mgr.getRoom(roomId)
      if (!room?.round) return
      const round = room.round
      if (round.turnOrder![round.currentTurnIndex!] !== socket.id) return
      clearTurnTimer(roomId)
      mgr.recordWord(roomId, socket.id, word ?? '—', round.discussionRound ?? 1)
      const result = mgr.advanceTurn(roomId)
      if (result.done) {
        const updated = mgr.getRoom(roomId)
        if (updated) {
          io.to(roomId).emit('room:state', { phase: updated.phase, players: updated.players, hostId: updated.hostId })
          io.to(roomId).emit('discussion:review', mgr.getWordReviewData(roomId))
        }
      } else {
        emitTurn(io, mgr, roomId, result.playerId, result.turnNumber)
      }
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('vote:start', ({ roomId }) => {
    try {
      const room = mgr.startVoting(roomId, socket.id)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('card:acknowledge', ({ roomId }) => {
    try {
      const card = mgr.getCardData(roomId, socket.id)
      socket.emit('card:data', card)
      const room = mgr.getRoom(roomId)
      if (room) {
        io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
      }
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('vote:submit', ({ roomId, targetPlayerId }) => {
    try {
      const tick = mgr.submitVote(roomId, socket.id, targetPlayerId)
      io.to(roomId).emit('vote:tick', tick)

      if (tick.count === tick.total) {
        const result = mgr.tallyVotes(roomId)
        io.to(roomId).emit('vote:reveal', result)
        if (!result.majorityCaught) {
          const room = mgr.finalizeResult(roomId, 'imposter_wins')
          io.to(roomId).emit('phase:results', {
            result: 'imposter_wins',
            scores: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, p.score])),
            imposterId: result.imposterId,
            word: room.round?.word.word,
            englishWord: room.round?.word.english,
          })
        } else {
          const room = mgr.getRoom(roomId)
          if (room) io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
        }
      }
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('guess:judge', ({ roomId, correct }) => {
    try {
      const judgeResult = mgr.hostJudgeGuess(roomId, socket.id, correct)
      const room = mgr.finalizeResult(roomId, judgeResult.result)
      io.to(roomId).emit('phase:results', {
        result: judgeResult.result,
        scores: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, p.score])),
        imposterId: room.round?.imposterId,
        word: room.round?.word.word,
        englishWord: room.round?.word.english,
      })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('round:new', ({ roomId }) => {
    try {
      const room = mgr.startNewRound(roomId, socket.id)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('player:kick', ({ roomId, playerId }) => {
    try {
      const room = mgr.kickPlayer(roomId, socket.id, playerId)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('disconnect', () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      try {
        mgr.disconnectPlayer(roomId, socket.id)
        mgr.transferHostIfNeeded(roomId)
        const room = mgr.getRoom(roomId)
        if (room) {
          io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
        }
        setTimeout(() => {
          const current = mgr.getRoom(roomId)
          if (current?.players[socket.id]?.isConnected === false) {
            mgr.kickPlayer(roomId, current.hostId, socket.id)
            const updated = mgr.getRoom(roomId)
            if (updated) {
              io.to(roomId).emit('room:state', { phase: updated.phase, players: updated.players, hostId: updated.hostId })
            }
          }
        }, 60_000)
      } catch {
        // Room may already be gone
      }
    }
  })
}
