'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { GameState } from '@/hooks/useGameSocket'
import CategoryPicker from '@/components/CategoryPicker'

interface Props {
  state: GameState
  onStart: (category: string) => void
  onKick: (id: string) => void
}

export default function Lobby({ state, onStart, onKick }: Props) {
  const [pickingCategory, setPickingCategory] = useState(false)
  const players = Object.values(state.players)
  const canStart = players.filter(p => p.isConnected).length >= 3

  if (pickingCategory) {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-8 bg-[#130800]">
        <div className="max-w-sm mx-auto w-full flex flex-col flex-1">
          <div className="text-center mb-6">
            <h2 className="text-white font-bold text-xl">Pick a Category</h2>
            <p className="text-white/40 text-xs mt-1">Choose the word category for this round</p>
          </div>
          <CategoryPicker onPick={(cat) => { setPickingCategory(false); onStart(cat) }} />
          <button
            onClick={() => setPickingCategory(false)}
            className="mt-4 text-white/30 text-sm text-center hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8 bg-[#130800]">
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">
        <div className="text-center mb-6">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Room Code</p>
          <p className="text-4xl font-black text-white tracking-widest font-mono">{state.roomId}</p>
          <p className="text-white/40 text-xs mt-2">Share this code with your friends</p>
        </div>

        {state.roomId && (
          <div className="flex justify-center mb-5">
            <div className="bg-white p-3 rounded-2xl">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://imposter.app'}/?room=${state.roomId}`}
                size={140}
              />
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-2xl border border-white/10 flex-1 mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white/60 text-sm">{players.length} / 12 players</p>
          </div>
          <ul className="divide-y divide-white/5">
            {players.map(p => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-white font-medium">{p.nickname}</span>
                  {p.isHost && <span className="text-xs text-amber-400 font-semibold">HOST</span>}
                </div>
                {state.isHost && !p.isHost && (
                  <button
                    onClick={() => onKick(p.id)}
                    className="text-red-400/60 text-xs hover:text-red-400 transition-colors px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {state.isHost ? (
          <div className="flex flex-col gap-3">
            {!canStart && (
              <p className="text-white/40 text-sm text-center">Need at least 3 players to start</p>
            )}
            <button
              onClick={() => setPickingCategory(true)}
              disabled={!canStart}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
            >
              Start Game
            </button>
          </div>
        ) : (
          <p className="text-white/40 text-sm text-center">Waiting for the host to start the game...</p>
        )}
      </div>
    </div>
  )
}
