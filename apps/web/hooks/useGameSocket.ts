'use client'

import { useEffect, useReducer, useCallback, useRef } from 'react'
import { getSocket } from '@/lib/socket'
import { gameReducer, initialState } from './gameReducer'
import type { GameState, Action } from './gameReducer'
import type { InfoLevel, CardData } from '@imposter/shared'

export type { GameScreen, GameState, VoteReveal, RoundResult } from './gameReducer'

const SESSION_ROOM = 'imposter_roomId'
const SESSION_PLAYER = 'imposter_playerId'
const store = typeof window !== 'undefined' ? localStorage : null

export function useGameSocket() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const nicknameRef = useRef<string>('')
  const autoReconnecting = useRef(false)

  useEffect(() => {
    const socket = getSocket()
    socket.connect()

    // On every (re)connect, attempt to resume a previous session
    socket.on('connect', () => {
      const savedRoomId = store?.getItem(SESSION_ROOM)
      const savedPlayerId = store?.getItem(SESSION_PLAYER)
      if (savedRoomId && savedPlayerId) {
        autoReconnecting.current = true
        socket.emit('room:reconnect', { roomId: savedRoomId, playerId: savedPlayerId })
      }
    })

    socket.on('room:joined', ({ roomId, player, room }) => {
      autoReconnecting.current = false
      store?.setItem(SESSION_ROOM, roomId)
      store?.setItem(SESSION_PLAYER, player.id)
      dispatch({
        type: 'JOINED',
        roomId,
        myId: player.id,
        nickname: player.nickname,
        players: room.players,
        hostId: room.hostId,
        phase: room.phase,
      })
    })

    socket.on('room:state', ({ phase, players, hostId }) => {
      dispatch({ type: 'ROOM_STATE', phase, players, hostId })
    })

    socket.on('card:data', (card: CardData) => {
      dispatch({ type: 'CARD_DATA', card })
    })

    socket.on('vote:tick', ({ count, total }) => {
      dispatch({ type: 'VOTE_TICK', count, total })
    })

    socket.on('vote:reveal', (data) => {
      dispatch({ type: 'VOTE_REVEAL', data })
    })

    socket.on('phase:results', (data) => {
      dispatch({ type: 'ROUND_RESULT', data })
    })

    socket.on('error', ({ code }: { code: string }) => {
      if (autoReconnecting.current) {
        // Auto-reconnect failed (room gone or kicked) — clear session silently
        autoReconnecting.current = false
        store?.removeItem(SESSION_ROOM)
        store?.removeItem(SESSION_PLAYER)
        return
      }
      dispatch({ type: 'ERROR', message: code })
    })

    return () => {
      socket.off('connect')
      socket.off('room:joined')
      socket.off('room:state')
      socket.off('card:data')
      socket.off('vote:tick')
      socket.off('vote:reveal')
      socket.off('phase:results')
      socket.off('error')
      socket.disconnect()
    }
  }, [])

  const createRoom = useCallback((nickname: string, infoLevel: InfoLevel) => {
    nicknameRef.current = nickname
    getSocket().emit('room:create', { nickname, infoLevel })
  }, [])

  const joinRoom = useCallback((roomId: string, nickname: string) => {
    nicknameRef.current = nickname
    getSocket().emit('room:join', { roomId: roomId.toUpperCase(), nickname })
  }, [])

  const startGame = useCallback((roomId: string) => {
    getSocket().emit('game:start', { roomId })
  }, [])

  const acknowledgeCard = useCallback((roomId: string) => {
    getSocket().emit('card:acknowledge', { roomId })
  }, [])

  const startVoting = useCallback((roomId: string) => {
    getSocket().emit('vote:start', { roomId })
  }, [])

  const submitVote = useCallback((roomId: string, targetPlayerId: string) => {
    getSocket().emit('vote:submit', { roomId, targetPlayerId })
  }, [])

  const judgeGuess = useCallback((roomId: string, correct: boolean) => {
    getSocket().emit('guess:judge', { roomId, correct })
  }, [])

  const startNewRound = useCallback((roomId: string) => {
    getSocket().emit('round:new', { roomId })
  }, [])

  const kickPlayer = useCallback((roomId: string, playerId: string) => {
    getSocket().emit('player:kick', { roomId, playerId })
  }, [])

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [])

  return {
    state,
    createRoom,
    joinRoom,
    startGame,
    acknowledgeCard,
    startVoting,
    submitVote,
    judgeGuess,
    startNewRound,
    kickPlayer,
    clearError,
  }
}
