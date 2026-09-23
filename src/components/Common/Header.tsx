import React from 'react';
import { Volume2, VolumeX, Settings, HelpCircle, Trophy, Home } from 'lucide-react';
import { GameSettings } from '../../types/game';
import { sounds } from '../../game/sound';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onOpenHelp: () => void;
  isGameActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  settings,
  onUpdateSettings,
  onOpenHelp,
  isGameActive = false,
}) => {
  const toggleSound = () => {
    const nextSound = !settings.soundEnabled;
    onUpdateSettings({ soundEnabled: nextSound });
    sounds.setMuted(!nextSound);
    if (nextSound) {
      sounds.playClick();
    }
  };

  return (
    <header className="w-full z-30 px-4 py-3 border-b border-white/10 backdrop-blur-md bg-slate-950/40 sticky top-0 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-amber-400 font-black text-sm">▲</span>
            </div>
          </div>
          <div className="text-left">
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent block leading-tight">
              PYRAMID ROW
            </span>
            <span className="text-[10px] font-semibold text-indigo-400 tracking-widest uppercase block">
              MASTER
            </span>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {currentView !== 'home' && (
            <button
              onClick={() => onNavigate('home')}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Home Menu"
              aria-label="Home Menu"
            >
              <Home className="w-5 h-5" />
            </button>
          )}

          {currentView !== 'rankings' && (
            <button
              onClick={() => onNavigate('rankings')}
              className="p-2 rounded-xl text-slate-300 hover:text-amber-300 hover:bg-white/10 transition-colors"
              title="Leaderboard Rankings"
              aria-label="Leaderboard Rankings"
            >
              <Trophy className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onOpenHelp}
            className="p-2 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition-colors"
            title="How to Play"
            aria-label="How to Play"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title={settings.soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            aria-label={settings.soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500" />
            )}
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-xl transition-colors ${
              currentView === 'settings'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Game Settings"
            aria-label="Game Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
