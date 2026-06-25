'use client'

import { useState } from 'react'
import type { InfoLevel } from '@imposter/shared'

interface Props {
  onCreate: (nickname: string, infoLevel: InfoLevel) => void
  onJoin: (roomId: string, nickname: string) => void
}

export default function Home({ onCreate, onJoin }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState('')
  const [infoLevel, setInfoLevel] = useState<InfoLevel>('category')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim()) onCreate(nickname.trim(), infoLevel)
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim() && code.trim()) onJoin(code.trim(), nickname.trim())
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0f0f23]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white tracking-tight">Imposter</h1>
          <p className="text-indigo-300 mt-2 text-sm">Who is the real imposter?</p>
        </div>

        <div className="flex rounded-xl overflow-hidden mb-6 border border-white/10">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60'}`}
            onClick={() => setTab('create')}
          >
            Create Room
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'join' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60'}`}
            onClick={() => setTab('join')}
          >
            Join Room
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <input
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="accent-indigo-500"
                  />
                  <span className="text-white text-sm">
                    {level === 'none' && 'Nothing — just knows they are the imposter'}
                    {level === 'category' && 'Category — knows the word\'s category'}
                    {level === 'hint' && 'Hint — knows both the category and a hint'}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
            >
              Create Room
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              required
            />
            <input
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest font-mono text-center"
              placeholder="ROOM CODE"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95"
            >
              Join Room
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
