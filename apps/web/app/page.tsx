'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useGameSocket } from '@/hooks/useGameSocket'
import { LanguageProvider } from '@/contexts/LanguageContext'
import Home from '@/components/phases/Home'
import Lobby from '@/components/phases/Lobby'
import CardReveal from '@/components/phases/CardReveal'
import Discussion from '@/components/phases/Discussion'
import Voting from '@/components/phases/Voting'
import AwaitingGuess from '@/components/phases/AwaitingGuess'
import Results from '@/components/phases/Results'
import type { InfoLevel } from '@imposter/shared'

function Game() {
  const game = useGameSocket()
  const { state } = game
  const searchParams = useSearchParams()
  const initialRoomCode = searchParams.get('room') ?? undefined

  return (
    <div className="min-h-dvh flex flex-col">
      {state.error && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 px-4">
          <div className="bg-[#1a0800] rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-red-400 text-lg mb-4">{state.error}</p>
            <button
              onClick={game.clearError}
              className="bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {state.screen === 'home' && (
        <Home
          initialRoomCode={initialRoomCode}
          onCreate={(nickname: string, infoLevel: InfoLevel, targetScore: number, difficulty: string) =>
            game.createRoom(nickname, infoLevel, targetScore, difficulty)
          }
          onJoin={game.joinRoom}
        />
      )}
      {state.screen === 'lobby' && (
        <Lobby
          state={state}
          onStart={(category: string) => game.startGame(state.roomId!, category)}
          onKick={(id) => game.kickPlayer(state.roomId!, id)}
        />
      )}
      {state.screen === 'card_reveal' && (
        <CardReveal
          state={state}
          onAcknowledge={() => game.acknowledgeCard(state.roomId!)}
          onStartDiscussion={() => game.startDiscussion(state.roomId!)}
        />
      )}
      {state.screen === 'discussion' && (
        <Discussion
          state={state}
          onSpoke={() => game.spoke(state.roomId!)}
        />
      )}
      {state.screen === 'voting' && (
        <Voting
          state={state}
          onVote={(id) => game.submitVote(state.roomId!, id)}
        />
      )}
      {state.screen === 'awaiting_guess' && (
        <AwaitingGuess
          state={state}
          onJudge={(correct) => game.judgeGuess(state.roomId!, correct)}
        />
      )}
      {state.screen === 'results' && (
        <Results
          state={state}
          onNewRound={(category: string) => game.startNewRound(state.roomId!, category)}
          onResetGame={() => game.resetGame(state.roomId!)}
        />
      )}
    </div>
  )
}

export default function Page() {
  return (
    <LanguageProvider>
      <Suspense>
        <Game />
      </Suspense>
    </LanguageProvider>
  )
}
