import type { Server, Socket } from 'socket.io'
import type { RoomManager } from './RoomManager'

export function registerHandlers(io: Server, socket: Socket, manager: RoomManager) {
  socket.on('room:create', ({ nickname, infoLevel }) => {
    try {
      const room = manager.createRoom(socket.id, nickname, infoLevel)
      socket.join(room.id)
      socket.emit('room:joined', { roomId: room.id, player: room.players[socket.id], room })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('room:join', ({ roomId, nickname }) => {
    try {
      const room = manager.joinRoom(roomId, socket.id, nickname)
      socket.join(roomId)
      socket.emit('room:joined', { roomId, player: room.players[socket.id], room })
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('room:reconnect', ({ roomId, playerId }) => {
    try {
      const room = manager.reconnectPlayer(roomId, playerId, socket.id)
      socket.join(roomId)
      socket.emit('room:joined', { roomId, player: room.players[socket.id], room })
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('game:start', ({ roomId }) => {
    try {
      const room = manager.startGame(roomId, socket.id)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('vote:start', ({ roomId }) => {
    try {
      const room = manager.startVoting(roomId, socket.id)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('card:acknowledge', ({ roomId }) => {
    try {
      const card = manager.getCardData(roomId, socket.id)
      socket.emit('card:data', card)
      const room = manager.getRoom(roomId)
      if (room) {
        io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
      }
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('vote:submit', ({ roomId, targetPlayerId }) => {
    try {
      const tick = manager.submitVote(roomId, socket.id, targetPlayerId)
      io.to(roomId).emit('vote:tick', tick)

      if (tick.count === tick.total) {
        const result = manager.tallyVotes(roomId)
        io.to(roomId).emit('vote:reveal', result)
        if (!result.majorityCaught) {
          const room = manager.finalizeResult(roomId, 'imposter_wins')
          io.to(roomId).emit('phase:results', {
            result: 'imposter_wins',
            scores: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, p.score])),
            imposterId: result.imposterId,
            word: room.round?.word.word,
          })
        }
      }
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('guess:submit', ({ roomId, guess }) => {
    try {
      const guessResult = manager.submitGuess(roomId, guess)
      io.to(roomId).emit('guess:result', { correct: guessResult.correct, word: guess })
      const room = manager.finalizeResult(roomId, guessResult.result)
      io.to(roomId).emit('phase:results', {
        result: guessResult.result,
        scores: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, p.score])),
        imposterId: room.round?.imposterId,
        word: room.round?.word.word,
      })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('round:new', ({ roomId }) => {
    try {
      const room = manager.startNewRound(roomId, socket.id)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('player:kick', ({ roomId, playerId }) => {
    try {
      const room = manager.kickPlayer(roomId, socket.id, playerId)
      io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
    } catch (e: any) {
      socket.emit('error', { code: e.message })
    }
  })

  socket.on('disconnect', () => {
    // Find which room this socket is in
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      try {
        manager.disconnectPlayer(roomId, socket.id)
        manager.transferHostIfNeeded(roomId)
        const room = manager.getRoom(roomId)
        if (room) {
          io.to(roomId).emit('room:state', { phase: room.phase, players: room.players, hostId: room.hostId })
        }
        // Schedule cleanup after 60s grace period
        setTimeout(() => {
          const current = manager.getRoom(roomId)
          if (current?.players[socket.id]?.isConnected === false) {
            manager.kickPlayer(roomId, current.hostId, socket.id)
            const updated = manager.getRoom(roomId)
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
