import type { GamePhase, Player, CardData } from '@imposter/shared'

export type GameScreen =
  | 'home'
  | 'lobby'
  | 'card_reveal'
  | 'discussion'
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
  englishWord?: string
  gameOver?: boolean
  winnerId?: string
}

export interface DiscussionTurn {
  playerId: string
  turnNumber: 1 | 2
  timeoutAt: number
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
  discussionTurn: DiscussionTurn | null
  voteTick: { count: number; total: number } | null
  voteReveal: VoteReveal | null
  guessResult: { correct: boolean; word: string } | null
  roundResult: RoundResult | null
  error: string | null
}

export type Action =
  | { type: 'JOINED'; roomId: string; myId: string; nickname: string; players: Record<string, Player>; hostId: string; phase: GamePhase }
  | { type: 'ROOM_STATE'; players: Record<string, Player>; hostId: string; phase: GamePhase }
  | { type: 'CARD_DATA'; card: CardData }
  | { type: 'DISCUSSION_TURN'; turn: DiscussionTurn }
  | { type: 'VOTE_TICK'; count: number; total: number }
  | { type: 'VOTE_REVEAL'; data: VoteReveal }
  | { type: 'GUESS_RESULT'; correct: boolean; word: string }
  | { type: 'ROUND_RESULT'; data: RoundResult }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }

export function phaseToScreen(phase: GamePhase): GameScreen {
  const map: Record<GamePhase, GameScreen> = {
    lobby: 'lobby',
    card_reveal: 'card_reveal',
    discussion: 'discussion',
    voting: 'voting',
    awaiting_guess: 'awaiting_guess',
    results: 'results',
  }
  return map[phase]
}

export const initialState: GameState = {
  screen: 'home',
  roomId: null,
  myId: null,
  myNickname: null,
  isHost: false,
  players: {},
  hostId: null,
  cardData: null,
  discussionTurn: null,
  voteTick: null,
  voteReveal: null,
  guessResult: null,
  roundResult: null,
  error: null,
}

export function gameReducer(state: GameState, action: Action): GameState {
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
    case 'ROOM_STATE': {
      const enteringCardReveal = action.phase === 'card_reveal' && state.screen !== 'card_reveal'
      const enteringLobby = action.phase === 'lobby'
      return {
        ...state,
        screen: phaseToScreen(action.phase),
        players: action.players,
        hostId: action.hostId,
        isHost: state.myId ? action.players[state.myId]?.isHost ?? false : false,
        cardData: enteringLobby || enteringCardReveal ? null : state.cardData,
        discussionTurn: enteringLobby || enteringCardReveal ? null : state.discussionTurn,
        voteTick: enteringLobby || enteringCardReveal ? null : state.voteTick,
        voteReveal: enteringLobby || enteringCardReveal ? null : state.voteReveal,
        roundResult: enteringLobby || enteringCardReveal ? null : state.roundResult,
      }
    }
    case 'CARD_DATA':
      return { ...state, cardData: action.card, screen: 'card_reveal' }
    case 'DISCUSSION_TURN':
      return { ...state, discussionTurn: action.turn, screen: 'discussion' }
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
