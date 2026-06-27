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

// ─── ROUND_RESULT: score updates ─────────────────────────────────────────────

describe('ROUND_RESULT scoring', () => {
  it('updates player scores from the event payload — imposter wins 3 points', () => {
    const state: GameState = {
      ...initialState,
      screen: 'voting',
      players: mockPlayers,
    }
    const next = gameReducer(state, {
      type: 'ROUND_RESULT',
      data: {
        result: 'imposter_wins',
        scores: { 's1': 0, 's2': 3 },
        imposterId: 's2',
        word: 'शेर',
        gameOver: false,
      },
    })
    expect(next.screen).toBe('results')
    expect(next.players['s2'].score).toBe(3)
    expect(next.players['s1'].score).toBe(0)
  })

  it('updates player scores — civilians each win 1 point', () => {
    const state: GameState = {
      ...initialState,
      screen: 'voting',
      players: mockPlayers,
    }
    const next = gameReducer(state, {
      type: 'ROUND_RESULT',
      data: {
        result: 'civilians_win',
        scores: { 's1': 1, 's2': 0 },
        imposterId: 's2',
        word: 'शेर',
        gameOver: false,
      },
    })
    expect(next.players['s1'].score).toBe(1)
    expect(next.players['s2'].score).toBe(0)
  })

  it('carries gameOver and winnerId through to roundResult', () => {
    const state: GameState = {
      ...initialState,
      screen: 'voting',
      players: { ...mockPlayers, 's2': { ...mockPlayers['s2'], score: 9 } },
    }
    const next = gameReducer(state, {
      type: 'ROUND_RESULT',
      data: {
        result: 'imposter_wins',
        scores: { 's1': 0, 's2': 12 },
        imposterId: 's2',
        word: 'शेर',
        gameOver: true,
        winnerId: 's2',
      },
    })
    expect(next.roundResult?.gameOver).toBe(true)
    expect(next.roundResult?.winnerId).toBe('s2')
    expect(next.players['s2'].score).toBe(12)
  })
})
