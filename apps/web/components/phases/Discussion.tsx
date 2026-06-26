'use client'

import { useEffect, useState } from 'react'
import type { GameState } from '@/hooks/useGameSocket'

interface Props {
  state: GameState
  onSpoke: () => void
}

export default function Discussion({ state, onSpoke }: Props) {
  const { discussionTurn, players, myId } = state
  const [secondsLeft, setSecondsLeft] = useState<number>(30)

  useEffect(() => {
    if (!discussionTurn) return
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.floor((discussionTurn.timeoutAt - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [discussionTurn])

  if (!discussionTurn) return null

  const { playerId, turnNumber } = discussionTurn
  const isMyTurn = playerId === myId
  const activeName = players[playerId]?.nickname ?? '?'

  const urgentColor = secondsLeft <= 5 ? 'text-red-400' : secondsLeft <= 10 ? 'text-yellow-400' : 'text-white/50'

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0f0f23]">
      <div className="w-full max-w-sm text-center">

        <p className="text-white/30 text-xs uppercase tracking-widest mb-6">
          Round {turnNumber} of 2
        </p>

        {isMyTurn ? (
          <>
            <div className="text-5xl mb-4">🎤</div>
            <h2 className="text-white font-black text-2xl mb-2">Your turn!</h2>
            <p className="text-white/50 text-sm mb-8">Say one word out loud, then tap done.</p>
            <button
              onClick={onSpoke}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95 mb-4"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">👂</div>
            <h2 className="text-white font-black text-2xl mb-1">
              <span className="text-indigo-400">{activeName}</span>
            </h2>
            <p className="text-white/40 text-sm mb-8">is saying their word...</p>
          </>
        )}

        <p className={`text-3xl font-black tabular-nums ${urgentColor}`}>
          {secondsLeft}s
        </p>

      </div>
    </div>
  )
}
