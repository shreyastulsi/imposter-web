'use client'

import type { GameState } from '@/hooks/useGameSocket'

interface Props {
  state: GameState
  onNewRound: () => void
}

export default function Results({ state, onNewRound }: Props) {
  const { roundResult, players, myId, isHost, voteReveal } = state

  if (!roundResult) return null

  const civiliansWon = roundResult.result === 'civilians_win'
  const imposter = players[roundResult.imposterId]
  const iWasImposter = roundResult.imposterId === myId

  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8 bg-[#0f0f23]">
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{civiliansWon ? '🎉' : '🕵️'}</div>
          <h2 className="text-white font-black text-2xl">
            {civiliansWon ? 'Civilians win!' : 'Imposter wins!'}
          </h2>
          {iWasImposter && (
            <p className="text-white/50 text-sm mt-1">
              {civiliansWon ? 'You were caught' : 'You fooled everyone!'}
            </p>
          )}
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-4">
          <p className="text-white/40 text-xs mb-2">The imposter was</p>
          <p className="text-white font-bold text-lg">{imposter?.nickname ?? '?'}</p>
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-white/40 text-xs mb-1">The word was</p>
            <p className="text-white font-black text-2xl">{roundResult.word}</p>
            <p className="text-white/40 text-sm mt-1">
              {civiliansWon
                ? "Imposter couldn't guess the word"
                : voteReveal?.majorityCaught
                  ? 'Imposter guessed the word correctly!'
                  : "Imposter wasn't caught — not enough votes!"}
            </p>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white/60 text-sm font-semibold">Scoreboard</p>
          </div>
          <ul className="divide-y divide-white/5">
            {sortedPlayers.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-white/30 text-sm w-4">{i + 1}</span>
                  <span className="text-white font-medium">{p.nickname}</span>
                  {p.id === myId && <span className="text-xs text-indigo-400">(you)</span>}
                  {p.id === roundResult.imposterId && <span className="text-xs text-red-400">🕵️</span>}
                </div>
                <span className="text-white font-bold">{p.score}</span>
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <button
            onClick={onNewRound}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
          >
            Next Round
          </button>
        ) : (
          <p className="text-center text-white/40 text-sm">Waiting for the host to start the next round...</p>
        )}
      </div>
    </div>
  )
}
