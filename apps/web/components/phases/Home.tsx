'use client'

import { useState, useEffect } from 'react'
import type { InfoLevel } from '@imposter/shared'

interface Props {
  onCreate: (nickname: string, infoLevel: InfoLevel, targetScore: number, difficulty: string) => void
  onJoin: (roomId: string, nickname: string) => void
  initialRoomCode?: string
}

export default function Home({ onCreate, onJoin, initialRoomCode }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState(initialRoomCode ?? '')
  const [infoLevel, setInfoLevel] = useState<InfoLevel>('category')
  const [targetScore, setTargetScore] = useState(10)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [showHowTo, setShowHowTo] = useState(false)

  useEffect(() => {
    if (initialRoomCode) {
      setCode(initialRoomCode)
      setTab('join')
    }
  }, [initialRoomCode])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim()) onCreate(nickname.trim(), infoLevel, targetScore, difficulty)
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim() && code.trim()) onJoin(code.trim(), nickname.trim())
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#130800]">
      {showHowTo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowHowTo(false)}>
          <div className="bg-[#1a0800] w-full max-w-sm rounded-t-2xl p-6 border-t border-white/10" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-black text-xl mb-4">How to Play</h2>
            <ul className="flex flex-col gap-3 text-white/70 text-sm mb-6">
              <li className="flex gap-3"><span className="text-orange-400 font-bold shrink-0">1.</span> Everyone gets a secret card. Most players see <span className="text-green-400 font-semibold">&nbsp;the word</span>. One player is the <span className="text-red-400 font-semibold">&nbsp;🕵️ Imposter</span> and doesn't know it.</li>
              <li className="flex gap-3"><span className="text-orange-400 font-bold shrink-0">2.</span> Players take turns saying one word related to the secret word. The imposter must bluff — say something that sounds right without knowing the word.</li>
              <li className="flex gap-3"><span className="text-orange-400 font-bold shrink-0">3.</span> Everyone votes on who they think the imposter is. If the imposter gets the most votes, they get a last chance to guess the word.</li>
              <li className="flex gap-3"><span className="text-orange-400 font-bold shrink-0">4.</span> <span className="text-amber-400 font-semibold">Civilians win</span> if they catch the imposter and they can't guess the word. <span className="text-red-400 font-semibold">Imposter wins</span> if not caught, or if they guess correctly.</li>
              <li className="flex gap-3"><span className="text-orange-400 font-bold shrink-0">5.</span> Civilians earn <span className="text-white font-semibold">1 point</span> each per win. Imposter earns <span className="text-white font-semibold">3 points</span>. First to the target score wins!</li>
            </ul>
            <button
              onClick={() => setShowHowTo(false)}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white tracking-tight">Imposter</h1>
          <p className="text-amber-300 mt-2 text-sm">Who is the real imposter?</p>
          <button
            onClick={() => setShowHowTo(true)}
            className="mt-2 text-white/30 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
          >
            How to play?
          </button>
        </div>

        <div className="flex rounded-xl overflow-hidden mb-6 border border-white/10">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'create' ? 'bg-orange-600 text-white' : 'bg-white/5 text-white/60'}`}
            onClick={() => setTab('create')}
          >
            Create Room
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'join' ? 'bg-orange-600 text-white' : 'bg-white/5 text-white/60'}`}
            onClick={() => setTab('join')}
          >
            Join Room
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <input
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Your nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              required
            />

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-white/60 text-xs mb-3">What does the imposter know?</p>
              {(['none', 'category', 'hint'] as InfoLevel[]).map(level => (
                <label key={level} className="flex items-center gap-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="infoLevel"
                    value={level}
                    checked={infoLevel === level}
                    onChange={() => setInfoLevel(level)}
                    className="accent-orange-500"
                  />
                  <span className="text-white text-sm">
                    {level === 'none' && 'Nothing — just knows they are the imposter'}
                    {level === 'category' && "Category — knows the word's category"}
                    {level === 'hint' && 'Hint — knows both the category and a hint'}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-white/50 text-xs mb-2">Word difficulty</p>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full bg-transparent text-white text-sm outline-none cursor-pointer"
                >
                  <option value="easy" className="bg-[#130800]">Easy</option>
                  <option value="medium" className="bg-[#130800]">Medium</option>
                  <option value="hard" className="bg-[#130800]">Hard</option>
                </select>
              </div>
              <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-white/50 text-xs mb-2">Win at</p>
                <select
                  value={targetScore}
                  onChange={e => setTargetScore(Number(e.target.value))}
                  className="w-full bg-transparent text-white text-sm outline-none cursor-pointer"
                >
                  <option value={5} className="bg-[#130800]">5 points</option>
                  <option value={10} className="bg-[#130800]">10 points</option>
                  <option value={15} className="bg-[#130800]">15 points</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
            >
              Create Room
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Your nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              required
            />
            <input
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-orange-500 uppercase tracking-widest font-mono text-center"
              placeholder="ROOM CODE"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
            >
              Join Room
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
