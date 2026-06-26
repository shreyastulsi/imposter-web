import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from './gameReducer'
import type { GameState } from './gameReducer'

const mockPlayers = {
  's1': { id: 's1', nickname: 'A', isHost: true, score: 0, connectedAt: 0, isConnected: true, hasRevealed: false, vote: null },
  's2': { id: 's2', nickname: 'B', isHost: false, score: 0, connectedAt: 1, isConnected: true, hasRevealed: false, vote: null },
}

const roomStateCardReveal = {
  type: 'ROOM_STATE' as const,
  phase: 'card_reveal' as const,
  players: mockPlayers,
  hostId: 's1',
}

const mockCard = { isImposter: false as const, word: 'शेर', english: 'Lion', category: 'जानवर' }

// ─── ROOM_STATE: card_reveal transitions ─────────────────────────────────────

describe('ROOM_STATE card_reveal', () => {
  it('clears cardData when entering card_reveal from results (new round start)', () => {
    const stateWithCard: GameState = {
      ...initialState,
      screen: 'results',
      cardData: mockCard,
    }
    const next = gameReducer(stateWithCard, roomStateCardReveal)
    expect(next.cardData).toBeNull()
  })

  it('preserves cardData when already in card_reveal (another player acknowledged)', () => {
    const stateAlreadyInReveal: GameState = {
      ...initialState,
      screen: 'card_reveal',
      cardData: mockCard,
    }
    const next = gameReducer(stateAlreadyInReveal, roomStateCardReveal)
    expect(next.cardData).toEqual(mockCard)
  })

  it('clears voteTick and voteReveal when entering card_reveal from results', () => {
    const stateWithVotes: GameState = {
      ...initialState,
      screen: 'results',
      voteTick: { count: 3, total: 3 },
      voteReveal: { votes: {}, imposterId: 's2', majorityCaught: true },
    }
    const next = gameReducer(stateWithVotes, roomStateCardReveal)
    expect(next.voteTick).toBeNull()
    expect(next.voteReveal).toBeNull()
  })

  it('preserves voteTick and voteReveal when already in card_reveal', () => {
    // voteTick/voteReveal are null in card_reveal anyway, but clearing must not wipe cardData
    const state: GameState = {
      ...initialState,
      screen: 'card_reveal',
      cardData: mockCard,
      voteTick: null,
      voteReveal: null,
    }
    const next = gameReducer(state, roomStateCardReveal)
    expect(next.cardData).toEqual(mockCard)
  })
})
