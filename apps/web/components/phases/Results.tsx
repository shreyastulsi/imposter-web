'use client'

import type { GameState } from '@/hooks/useGameSocket'
import { useLang } from '@/contexts/LanguageContext'

interface Props {
  state: GameState
  onNewRound: () => void
  onResetGame: () => void
}

export default function Results({ state, onNewRound, onResetGame }: Props) {
  const { roundResult, players, myId, isHost } = state
  const { lang } = useLang()

  if (!roundResult) return null

  const civiliansWon = roundResult.result === 'civilians_win'
  const imposter = players[roundResult.imposterId]
  const iWasImposter = roundResult.imposterId === myId
  const { gameOver, winnerId } = roundResult
  const winner = winnerId ? players[winnerId] : null

  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score)

  const displayWord = lang === 'en' ? (roundResult.englishWord ?? roundResult.word) : roundResult.word

  if (gameOver && winner) {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-8 bg-[#0f0f23]">
        <div className="max-w-sm mx-auto w-full flex flex-col flex-1">

          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-yellow-400 font-black text-3xl mb-1">Game Over!</h2>
            <p className="text-white/60 text-sm">
              <span className="text-white font-bold">{winner.nickname}</span> wins with {winner.score} points!
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-white/60 text-sm font-semibold">Final Scores</p>
            </div>
            <ul className="divide-y divide-white/5">
              {sortedPlayers.map((p, i) => (
                <li key={p.id} className={`flex items-center justify-between px-4 py-3 ${p.id === winnerId ? 'bg-yellow-400/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-sm w-4">{i + 1}</span>
                    {i === 0 && <span>🏆</span>}
                    <span className={`font-medium ${p.id === winnerId ? 'text-yellow-400' : 'text-white'}`}>{p.nickname}</span>
                    {p.id === myId && <span className="text-xs text-indigo-400">(you)</span>}
                  </div>
                  <span className={`font-black text-lg ${p.id === winnerId ? 'text-yellow-400' : 'text-white'}`}>{p.score}</span>
                </li>
              ))}
            </ul>
          </div>

          {isHost ? (
            <button
              onClick={onResetGame}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
            >
              Play Again
            </button>
          ) : (
            <p className="text-center text-white/40 text-sm">Waiting for host to start a new game...</p>
          )}

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8 bg-[#0f0f23]">
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">

        <div className="text-center mb-5">
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
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/40 text-xs mb-1">Imposter</p>
              <p className="text-white font-bold">{imposter?.nickname ?? '?'}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs mb-1">The word was</p>
              <p className="text-white font-black text-xl">{displayWord}</p>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-3 pt-3 border-t border-white/10">
            {civiliansWon
              ? "Imposter couldn't guess the word"
              : roundResult.scores[roundResult.imposterId] !== undefined && !iWasImposter
                ? roundResult.result === 'imposter_wins'
                  ? "Imposter wasn't caught — not enough votes!"
                  : 'Imposter guessed the word correctly!'
                : roundResult.result === 'imposter_wins' && Object.values(players).some(p => p.id !== roundResult.imposterId)
                  ? "Imposter wasn't caught — not enough votes!"
                  : 'Imposter guessed the word correctly!'}
          </p>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 mb-5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
            <p className="text-white/60 text-sm font-semibold">Scoreboard</p>
            <p className="text-white/30 text-xs">First to 10 wins</p>
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
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-white/10 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (p.score / 10) * 100)}%` }}
                    />
                  </div>
                  <span className="text-white font-bold w-6 text-right">{p.score}</span>
                </div>
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
