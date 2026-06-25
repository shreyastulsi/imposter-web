'use client'

import { useState } from 'react'
import type { GameState } from '@/hooks/useGameSocket'

interface Props {
  state: GameState
  onGuess: (guess: string) => void
}

export default function AwaitingGuess({ state, onGuess }: Props) {
  const [guess, setGuess] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { voteReveal, myId, guessResult } = state

  const isImposter = voteReveal?.imposterId === myId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guess.trim() || submitted) return
    setSubmitted(true)
    onGuess(guess.trim())
  }

  if (guessResult) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0f0f23]">
        <div className="text-center">
          <div className="text-6xl mb-4">{guessResult.correct ? '🎉' : '❌'}</div>
          <p className="text-white font-bold text-2xl">
            {guessResult.correct ? 'Correct guess!' : 'Wrong guess!'}
          </p>
          <p className="text-white/50 mt-2">Waiting for results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0f0f23]">
      <div className="w-full max-w-sm">
        {isImposter ? (
          <>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🕵️</div>
              <h2 className="text-white font-black text-2xl">Last chance!</h2>
              <p className="text-white/50 mt-2 text-sm">Guess the word correctly and you still win!</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-4 text-xl text-center outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="What was the word?"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                disabled={submitted}
                autoFocus
              />
              <button
                type="submit"
                disabled={!guess.trim() || submitted}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
              >
                {submitted ? 'Guess submitted...' : 'Submit Guess'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">🕵️</div>
            <h2 className="text-white font-bold text-xl">Imposter is guessing...</h2>
            <p className="text-white/40 text-sm mt-2">Do they know the word?</p>
          </div>
        )}
      </div>
    </div>
  )
}
