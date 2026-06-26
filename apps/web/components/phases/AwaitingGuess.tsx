'use client'

import type { GameState } from '@/hooks/useGameSocket'

interface Props {
  state: GameState
  onJudge: (correct: boolean) => void
}

export default function AwaitingGuess({ state, onJudge }: Props) {
  const { voteReveal, myId, isHost } = state
  const imposterId = voteReveal?.imposterId
  const imposterName = imposterId ? state.players[imposterId]?.nickname : 'The imposter'

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0f0f23]">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🕵️</div>
        <h2 className="text-white font-black text-2xl mb-2">Last Chance!</h2>
        <p className="text-white/60 text-sm mb-8">
          <span className="text-yellow-400 font-semibold">{imposterName}</span> must say the word out loud.
        </p>

        {isHost ? (
          <>
            <p className="text-white/40 text-xs mb-6">Did they get it right?</p>
            <div className="flex gap-4">
              <button
                onClick={() => onJudge(false)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
              >
                Wrong
              </button>
              <button
                onClick={() => onJudge(true)}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
              >
                Correct
              </button>
            </div>
          </>
        ) : (
          <p className="text-white/40 text-sm animate-pulse">
            {myId === imposterId
              ? 'Say the word out loud — the host will decide!'
              : 'Waiting for the host to judge the guess...'}
          </p>
        )}
      </div>
    </div>
  )
}
