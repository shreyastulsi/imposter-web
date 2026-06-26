'use client'

import { useEffect, useReducer, useCallback, useRef } from 'react'
import { getSocket } from '@/lib/socket'
import type { GamePhase, InfoLevel, Player, CardData } from '@imposter/shared'

export type GameScreen =
  | 'home'
  | 'lobby'
  | 'card_reveal'
  | 'voting'
  | 'awaiting_guess'
  | 'results'

export interface VoteReveal {
  votes: Record<string, string>
  imposterId: string
  majorityCaught: boolean
}

export interface RoundResult {
  result: 'civilians_win' | 'imposter_wins'
  scores: Record<string, number>
  imposterId: string
  word: string
}

export interface GameState {
  screen: GameScreen
  roomId: string | null
  myId: string | null
  myNickname: string | null
  isHost: boolean
  players: Record<string, Player>
  hostId: string | null
  cardData: CardData | null
  voteTick: { count: number; total: number } | null
  voteReveal: VoteReveal | null
  guessResult: { correct: boolean; word: string } | null
  roundResult: RoundResult | null
  error: string | null
}

type Action =
  | { type: 'JOINED'; roomId: string; myId: string; nickname: string; players: Record<string, Player>; hostId: string; phase: GamePhase }
  | { type: 'ROOM_STATE'; players: Record<string, Player>; hostId: string; phase: GamePhase }
  | { type: 'CARD_DATA'; card: CardData }
  | { type: 'VOTE_TICK'; count: number; total: number }
  | { type: 'VOTE_REVEAL'; data: VoteReveal }
  | { type: 'GUESS_RESULT'; correct: boolean; word: string }
  | { type: 'ROUND_RESULT'; data: RoundResult }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }

function phaseToScreen(phase: GamePhase): GameScreen {
  const map: Record<GamePhase, GameScreen> = {
    lobby: 'lobby',
    card_reveal: 'card_reveal',
    voting: 'voting',
    awaiting_guess: 'awaiting_guess',
    results: 'results',
  }
  return map[phase]
}

const initial: GameState = {
  screen: 'home',
  roomId: null,
  myId: null,
  myNickname: null,
  isHost: false,
  players: {},
  hostId: null,
  cardData: null,
  voteTick: null,
  voteReveal: null,
  guessResult: null,
  roundResult: null,
  error: null,
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'JOINED':
      return {
        ...state,
        screen: phaseToScreen(action.phase),
        roomId: action.roomId,
        myId: action.myId,
        myNickname: action.nickname,
        isHost: action.players[action.myId]?.isHost ?? false,
        players: action.players,
        hostId: action.hostId,
        error: null,
      }
    case 'ROOM_STATE':
      return {
        ...state,
        screen: phaseToScreen(action.phase),
        players: action.players,
        hostId: action.hostId,
        isHost: state.myId ? action.players[state.myId]?.isHost ?? false : false,
        cardData: action.phase === 'lobby' ? null : state.cardData,
        voteTick: action.phase === 'lobby' ? null : state.voteTick,
        voteReveal: action.phase === 'lobby' ? null : state.voteReveal,
        roundResult: action.phase === 'lobby' ? null : state.roundResult,
      }
    case 'CARD_DATA':
      return { ...state, cardData: action.card, screen: 'card_reveal' }
    case 'VOTE_TICK':
      return { ...state, voteTick: { count: action.count, total: action.total } }
    case 'VOTE_REVEAL':
      return { ...state, voteReveal: action.data }
    case 'GUESS_RESULT':
      return { ...state, guessResult: { correct: action.correct, word: action.word } }
    case 'ROUND_RESULT':
      return { ...state, roundResult: action.data, screen: 'results' }
    case 'ERROR':
      return { ...state, error: action.message }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

export function useGameSocket() {
  const [state, dispatch] = useReducer(reducer, initial)
  const nicknameRef = useRef<string>('')

  useEffect(() => {
    const socket = getSocket()
    socket.connect()

    socket.on('room:joined', ({ roomId, player, room }) => {
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

    socket.on('vote:reveal', (data: VoteReveal) => {
      dispatch({ type: 'VOTE_REVEAL', data })
    })

    socket.on('phase:results', (data: RoundResult) => {
      dispatch({ type: 'ROUND_RESULT', data })
    })

    socket.on('error', ({ code }: { code: string }) => {
      dispatch({ type: 'ERROR', message: code })
    })

    return () => {
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
