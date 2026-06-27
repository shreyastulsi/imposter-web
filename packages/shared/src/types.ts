export type InfoLevel = 'none' | 'category' | 'hint'

export type GamePhase =
  | 'lobby'
  | 'card_reveal'
  | 'discussion'
  | 'voting'
  | 'awaiting_guess'
  | 'results'

export interface WordEntry {
  id: string
  word: string
  english: string
  category: string
  englishCategory: string
  hint: string
  englishHint: string
}

export interface Player {
  id: string
  nickname: string
  isHost: boolean
  score: number
  connectedAt: number
  isConnected: boolean
  hasRevealed: boolean
  vote: string | null
}

export interface Round {
  word: WordEntry
  imposterId: string
  votes: Record<string, string>
  result: 'civilians_win' | 'imposter_wins' | null
  guessCorrect: boolean | null
  turnOrder?: string[]
  currentTurnIndex?: number
  discussionRound?: 1 | 2
}

export interface DiscussionTurnEvent {
  playerId: string
  turnNumber: 1 | 2
  timeoutAt: number
}

export interface Room {
  id: string
  infoLevel: InfoLevel
  phase: GamePhase
  players: Record<string, Player>
  round: Round | null
  hostId: string
}

export interface CardData {
  isImposter: boolean
  word?: string
  english?: string
  category?: string
  englishCategory?: string
  hint?: string
  englishHint?: string
}

export interface VoteResult {
  majorityCaught: boolean
  imposterId: string
  votes: Record<string, string>
}

export interface GuessResult {
  correct: boolean
  result: 'civilians_win' | 'imposter_wins'
}
