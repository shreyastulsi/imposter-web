'use client'

import { useState } from 'react'
import type { GameState } from '@/hooks/useGameSocket'

interface Props {
  state: GameState
  onVote: (targetId: string) => void
}

export default function Voting({ state, onVote }: Props) {
  const [voted, setVoted] = useState<string | null>(null)
  const { players, myId, voteTick, voteReveal } = state

  const handleVote = (id: string) => {
    if (voted || id === myId) return
    setVoted(id)
    onVote(id)
  }

  const playerList = Object.values(players).filter(p => p.isConnected)

  if (voteReveal) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-[#0f0f23]">
        <div className="w-full max-w-sm">
          <h2 className="text-white font-bold text-xl text-center mb-6">Votes का नतीजा</h2>
          <ul className="flex flex-col gap-3 mb-6">
            {playerList.map(p => {
              const votesForThis = Object.values(voteReveal.votes).filter(v => v === p.id).length
              const isImposter = p.id === voteReveal.imposterId
              return (
                <li
                  key={p.id}
                  className={`rounded-2xl p-4 border flex items-center justify-between ${
                    isImposter ? 'bg-red-900/30 border-red-500/40' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isImposter && <span>🕵️</span>}
                    <span className="text-white font-semibold">{p.nickname}</span>
                    {p.id === myId && <span className="text-xs text-indigo-400">(तुम)</span>}
                  </div>
                  <span className="text-white/60 text-sm">{votesForThis} vote{votesForThis !== 1 ? 's' : ''}</span>
                </li>
              )
            })}
          </ul>
          {voteReveal.majorityCaught ? (
            <p className="text-center text-yellow-400 font-semibold">Imposter पकड़ा गया! अब guess करेगा...</p>
          ) : (
            <p className="text-center text-red-400 font-semibold">कोई majority नहीं — Imposter जीत गया!</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8 bg-[#0f0f23]">
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">
        <div className="text-center mb-6">
          <h2 className="text-white font-bold text-xl">Imposter कौन है?</h2>
          <p className="text-white/40 text-sm mt-1">एक को vote करें</p>
        </div>

        {voteTick && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-white/40 mb-2">
              <span>Votes मिले</span>
              <span>{voteTick.count} / {voteTick.total}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${(voteTick.count / voteTick.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-3 flex-1">
          {playerList.map(p => {
            const isMe = p.id === myId
            const isSelected = voted === p.id
            return (
              <li key={p.id}>
                <button
                  onClick={() => handleVote(p.id)}
                  disabled={!!voted || isMe}
                  className={`w-full rounded-2xl p-4 border text-left transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-yellow-500/20 border-yellow-500 text-white'
                      : isMe
                      ? 'bg-white/5 border-white/5 text-white/30 cursor-default'
                      : voted
                      ? 'bg-white/5 border-white/10 text-white/50'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="font-semibold">{p.nickname}</span>
                  {isMe && <span className="text-xs text-white/40 ml-2">(तुम)</span>}
                  {isSelected && <span className="text-xs text-yellow-400 ml-2">✓ voted</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {voted && !voteTick && (
          <p className="text-center text-white/40 text-sm mt-4">Vote दे दिया! बाकियों का इंतज़ार...</p>
        )}
      </div>
    </div>
  )
}
