'use client'

import { useState } from 'react'
import type { GameState } from '@/hooks/useGameSocket'
import { useLang } from '@/contexts/LanguageContext'

interface Props {
  state: GameState
  onAcknowledge: () => void
  onStartVoting: () => void
}

export default function CardReveal({ state, onAcknowledge, onStartVoting }: Props) {
  const [flipped, setFlipped] = useState(false)
  const { cardData, players, isHost, myId } = state
  const { lang } = useLang()

  const displayWord = lang === 'en' ? (cardData?.english ?? cardData?.word) : cardData?.word
  const displayCategory = lang === 'en' ? (cardData?.englishCategory ?? cardData?.category) : cardData?.category
  const displayHint = lang === 'en' ? (cardData?.englishHint ?? cardData?.hint) : cardData?.hint

  const revealedCount = Object.values(players).filter(p => p.hasRevealed).length
  const totalCount = Object.values(players).filter(p => p.isConnected).length
  const allRevealed = revealedCount === totalCount

  const handleFlip = () => {
    if (flipped) return
    setFlipped(true)
    onAcknowledge()
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-between px-4 py-8 bg-[#0f0f23]">
      <div className="text-center">
        <h2 className="text-white font-bold text-xl">Check your card</h2>
        <p className="text-white/40 text-sm mt-1">Don't show your screen to anyone</p>
      </div>

      <div className="w-full max-w-xs">
        <div
          onClick={handleFlip}
          className="relative w-full aspect-[3/4] cursor-pointer"
          style={{ perspective: '1000px' }}
        >
          <div
            className="w-full h-full relative transition-transform duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Back face */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center border-2 border-indigo-400/30"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🃏</div>
                <p className="text-white font-bold text-lg">Tap to reveal</p>
                <p className="text-white/50 text-sm mt-1">Check privately</p>
              </div>
            </div>

            {/* Front face */}
            <div
              className="absolute inset-0 rounded-3xl flex items-center justify-center p-6 border-2"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: cardData?.isImposter
                  ? 'linear-gradient(135deg, #1a0a0a, #3d0a0a)'
                  : 'linear-gradient(135deg, #0a1a0a, #0a3d1a)',
                borderColor: cardData?.isImposter ? '#7f1d1d' : '#14532d',
              }}
            >
              {cardData ? (
                cardData.isImposter ? (
                  <div className="text-center">
                    <div className="text-5xl mb-4">🕵️</div>
                    <p className="text-red-400 font-black text-2xl mb-2">IMPOSTER</p>
                    <p className="text-white/60 text-sm">You are the imposter!</p>
                    {displayCategory && (
                      <div className="mt-4 bg-white/5 rounded-xl p-3">
                        <p className="text-white/40 text-xs">Category</p>
                        <p className="text-white font-semibold">{displayCategory}</p>
                      </div>
                    )}
                    {displayHint && (
                      <div className="mt-2 bg-white/5 rounded-xl p-3">
                        <p className="text-white/40 text-xs">Hint</p>
                        <p className="text-white font-semibold">{displayHint}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-green-400/60 text-xs uppercase tracking-widest mb-3">Word</p>
                    <p className="text-white font-black text-4xl mb-1">{displayWord}</p>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-white/40 text-xs">Category</p>
                      <p className="text-white font-semibold">{displayCategory}</p>
                    </div>
                    {displayHint && (
                      <div className="mt-2 bg-white/5 rounded-xl p-3">
                        <p className="text-white/40 text-xs">Hint</p>
                        <p className="text-white font-semibold">{displayHint}</p>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <p className="text-white/40">Loading...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <div className="flex justify-between text-sm text-white/40">
          <span>Cards revealed</span>
          <span>{revealedCount} / {totalCount}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? (revealedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
        {isHost && (
          <button
            onClick={onStartVoting}
            disabled={!allRevealed}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors mt-2"
          >
            {allRevealed ? 'Start Voting' : 'Waiting for everyone to reveal...'}
          </button>
        )}
      </div>
    </div>
  )
}
