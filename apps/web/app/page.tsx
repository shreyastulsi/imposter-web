'use client'

import { useGameSocket } from '@/hooks/useGameSocket'
import Home from '@/components/phases/Home'
import Lobby from '@/components/phases/Lobby'
import CardReveal from '@/components/phases/CardReveal'
import Voting from '@/components/phases/Voting'
import AwaitingGuess from '@/components/phases/AwaitingGuess'
import Results from '@/components/phases/Results'

export default function Page() {
  const game = useGameSocket()
  const { state } = game

  return (
    <div className="min-h-dvh flex flex-col">
      {state.error && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 px-4">
          <div className="bg-[#1a1a3e] rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-red-400 text-lg mb-4">{state.error}</p>
            <button
              onClick={game.clearError}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {state.screen === 'home' && (
        <Home onCreate={game.createRoom} onJoin={game.joinRoom} />
      )}
      {state.screen === 'lobby' && (
        <Lobby
          state={state}
          onStart={() => game.startGame(state.roomId!)}
          onKick={(id) => game.kickPlayer(state.roomId!, id)}
        />
      )}
      {state.screen === 'card_reveal' && (
        <CardReveal
          state={state}
          onAcknowledge={() => game.acknowledgeCard(state.roomId!)}
          onStartVoting={() => game.startVoting(state.roomId!)}
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
          onGuess={(g) => game.submitGuess(state.roomId!, g)}
        />
      )}
      {state.screen === 'results' && (
        <Results
          state={state}
          onNewRound={() => game.startNewRound(state.roomId!)}
        />
      )}
    </div>
  )
}
