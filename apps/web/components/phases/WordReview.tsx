'use client'

import type { GameState, WordReviewEntry } from '@/hooks/useGameSocket'

interface Props {
  state: GameState
  onStartVoting: () => void
}

export default function WordReview({ state, onStartVoting }: Props) {
  const { wordReview, players, isHost } = state

  if (!wordReview) return null

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8 bg-[#0f0f23]">
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">

        <div className="text-center mb-6">
          <h2 className="text-white font-black text-2xl">What everyone said</h2>
          <p className="text-white/40 text-sm mt-1">Two words each, in order</p>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {wordReview.map((entry: WordReviewEntry, i: number) => {
            const player = players[entry.playerId]
            return (
              <div
                key={entry.playerId}
                className="bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center gap-4"
              >
                <span className="text-white/20 font-bold text-lg w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{player?.nickname ?? '?'}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-white/30">R1</span>
                    <span className={`text-sm font-bold ${entry.round1 === '—' ? 'text-white/20' : 'text-indigo-300'}`}>
                      {entry.round1}
                    </span>
                    <span className="text-xs text-white/20">·</span>
                    <span className="text-xs text-white/30">R2</span>
                    <span className={`text-sm font-bold ${entry.round2 === '—' ? 'text-white/20' : 'text-purple-300'}`}>
                      {entry.round2}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          {isHost ? (
            <button
              onClick={onStartVoting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
            >
              Start Voting
            </button>
          ) : (
            <p className="text-center text-white/40 text-sm animate-pulse">
              Waiting for host to start voting...
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
