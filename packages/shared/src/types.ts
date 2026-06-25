export type InfoLevel = 'none' | 'category' | 'hint'

export type GamePhase =
  | 'lobby'
  | 'card_reveal'
  | 'voting'
  | 'awaiting_guess'
  | 'results'

export interface WordEntry {
  id: string
  word: string
  category: string
  hint: string
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
  category?: string
  hint?: string
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
