import React from 'react';
import { Play, RotateCcw, Trophy, Settings, HelpCircle, Users, Sparkles, Bot } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { GameState } from '../types/game';

interface HomeViewProps {
  onStartNewGame: () => void;
  onResumeGame: () => void;
  onOpenRankings: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  activeGame: GameState | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartNewGame,
  onResumeGame,
  onOpenRankings,
  onOpenSettings,
  onOpenHelp,
  activeGame,
}) => {
  const hasActiveGame = activeGame && activeGame.status === 'playing';

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto text-center">
      {/* Brand Hero */}
      <div className="relative mb-8">
        {/* Decorative ambient glowing ring */}
        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-25 animate-pulse" />

        {/* Pyramid Icon Badge */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-b from-indigo-500/20 to-purple-600/30 border border-indigo-400/30 backdrop-blur-xl shadow-2xl mb-4">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-3xl text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              ▲
            </span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 uppercase">
          Pyramid Row <span className="text-indigo-400">Master</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
          Local turn-based strategy. Claim circles, complete rows, and outsmart your friends!
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="w-full space-y-3.5">
        {/* Continue Game (if active) */}
        {hasActiveGame && (
          <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 shadow-xl shadow-amber-500/20">
            <Button
              variant="accent"
              size="xl"
              className="w-full"
              icon={<RotateCcw className="w-5 h-5" />}
              onClick={onResumeGame}
            >
              Continue Game
            </Button>
            <div className="text-[11px] font-semibold text-slate-900 bg-amber-300/90 py-1 px-3 rounded-b-xl flex justify-between items-center">
              <span>Pyramid {activeGame.pyramidSize} rows</span>
              <span>
                {Object.values(activeGame.cells).filter(c => c.ownerId !== null).length} /{' '}
                {(activeGame.pyramidSize * (activeGame.pyramidSize + 1)) / 2} circles claimed
              </span>
            </div>
          </div>
        )}

        {/* Play / New Game */}
        <Button
          variant="primary"
          size="xl"
          className="w-full"
          icon={<Play className="w-5 h-5 fill-current" />}
          onClick={onStartNewGame}
        >
          {hasActiveGame ? 'New Game' : 'Play Game'}
        </Button>

        {/* Leaderboard / Rankings */}
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
          onClick={onOpenRankings}
        >
          Player Rankings
        </Button>

        {/* Rules & Settings Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            icon={<HelpCircle className="w-4 h-4 text-cyan-400" />}
            onClick={onOpenHelp}
          >
            How to Play
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="w-full"
            icon={<Settings className="w-4 h-4 text-slate-400" />}
            onClick={onOpenSettings}
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Feature Badges Footer */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-cyan-400" />
          Play vs AI Bots
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-400" />
          2–4 Players
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Dynamic Pyramids
        </span>
      </div>
    </div>
  );
};
