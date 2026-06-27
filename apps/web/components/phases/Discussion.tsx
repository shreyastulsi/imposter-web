'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameState } from '@/hooks/useGameSocket'

interface Props {
  state: GameState
  onRecording: () => void
  onSpoke: (word: string) => void
}

type MicState = 'idle' | 'listening' | 'confirming'

export default function Discussion({ state, onRecording, onSpoke }: Props) {
  const { discussionTurn, players, myId } = state
  const [secondsLeft, setSecondsLeft] = useState<number>(30)
  const [micState, setMicState] = useState<MicState>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const recognitionRef = useRef<any>(null)
  const timerFrozen = micState !== 'idle'

  // Reset mic state when turn changes
  useEffect(() => {
    setMicState('idle')
    setTranscript('')
  }, [discussionTurn?.playerId, discussionTurn?.turnNumber])

  // Countdown — stops when mic is active
  useEffect(() => {
    if (!discussionTurn || timerFrozen) return
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.floor((discussionTurn.timeoutAt - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [discussionTurn, timerFrozen])

  if (!discussionTurn) return null

  const { playerId, turnNumber } = discussionTurn
  const isMyTurn = playerId === myId
  const activeName = players[playerId]?.nickname ?? '?'
  const urgentColor = secondsLeft <= 5 ? 'text-red-400' : secondsLeft <= 10 ? 'text-yellow-400' : 'text-white/40'

  function startMic() {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      // Fallback: no speech API — let them type or auto-skip
      setMicState('confirming')
      setTranscript('')
      onRecording()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = (event: any) => {
      const raw = event.results[0][0].transcript.trim()
      const firstWord = raw.split(/\s+/)[0]
      setTranscript(firstWord)
      setMicState('confirming')
    }
    recognition.onerror = () => {
      setMicState('idle')
    }
    recognition.onend = () => {
      if (micState === 'listening') setMicState('idle')
    }

    recognition.start()
    setMicState('listening')
    onRecording()
  }

  function retry() {
    recognitionRef.current?.abort()
    setTranscript('')
    setMicState('idle')
  }

  function confirm() {
    onSpoke(transcript || '—')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0f0f23]">
      <div className="w-full max-w-sm text-center">

        <p className="text-white/30 text-xs uppercase tracking-widest mb-6">
          Round {turnNumber} of 2
        </p>

        {isMyTurn ? (
          <>
            {micState === 'idle' && (
              <>
                <div className="text-5xl mb-4">🎤</div>
                <h2 className="text-white font-black text-2xl mb-2">Your turn!</h2>
                <p className="text-white/50 text-sm mb-8">Tap the mic and say your one word.</p>
                <button
                  onClick={startMic}
                  className="w-24 h-24 mx-auto rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-4xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 mb-6"
                  aria-label="Start recording"
                >
                  🎙️
                </button>
              </>
            )}

            {micState === 'listening' && (
              <>
                <div className="text-5xl mb-4 animate-pulse">🔴</div>
                <h2 className="text-white font-black text-2xl mb-2">Listening...</h2>
                <p className="text-white/40 text-sm mb-8">Say your word now</p>
                <button
                  onClick={retry}
                  className="text-white/40 text-sm underline"
                >
                  Cancel
                </button>
              </>
            )}

            {micState === 'confirming' && (
              <>
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-white font-black text-2xl mb-1">Heard:</h2>
                <p className="text-indigo-300 font-black text-4xl mb-6">
                  {transcript || <span className="text-white/30 italic text-2xl">nothing</span>}
                </p>
                <button
                  onClick={confirm}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95 mb-3"
                >
                  Confirm
                </button>
                <button
                  onClick={startMic}
                  className="w-full bg-white/5 hover:bg-white/10 text-white/60 font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  🎙️ Try again
                </button>
              </>
            )}
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

        {!timerFrozen && (
          <p className={`text-3xl font-black tabular-nums mt-4 ${urgentColor}`}>
            {secondsLeft}s
          </p>
        )}

      </div>
    </div>
  )
}
