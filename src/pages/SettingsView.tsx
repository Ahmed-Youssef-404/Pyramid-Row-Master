import React, { useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Sparkles, Moon, Sun, ShieldAlert, Trash2, Check } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { ConfirmDialog } from '../components/Modals/ConfirmDialog';
import { GameSettings, ThemeMode } from '../types/game';
import { clearAllGameData } from '../utils/storage';
import { sounds } from '../game/sound';

interface SettingsViewProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onBack: () => void;
  onResetAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onBack,
  onResetAllData,
}) => {
  const [showResetDataConfirm, setShowResetDataConfirm] = useState<boolean>(false);

  const handleToggleSound = () => {
    const next = !settings.soundEnabled;
    onUpdateSettings({ soundEnabled: next });
    sounds.setMuted(!next);
    if (next) sounds.playClick();
  };

  const handleToggleAnimations = () => {
    onUpdateSettings({ animationsEnabled: !settings.animationsEnabled });
  };

  const handleToggleConfirmLeave = () => {
    onUpdateSettings({ confirmBeforeLeaving: !settings.confirmBeforeLeaving });
  };

  const handleSelectTheme = (theme: ThemeMode) => {
    onUpdateSettings({ theme });
    if (settings.soundEnabled) sounds.playClick();
  };

  const handleConfirmReset = () => {
    clearAllGameData();
    onResetAllData();
  };

  return (
    <div className="w-full flex-1 max-w-2xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <h2 className="text-xl font-bold text-white">Game Settings</h2>
        <div className="w-12" />
      </div>

      <div className="space-y-5">
        {/* 1. Theme Selection */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Visual Theme</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cosmic Theme */}
            <button
              type="button"
              onClick={() => handleSelectTheme('cosmic')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                settings.theme === 'cosmic'
                  ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-white flex items-center gap-2">
                  <Moon className="w-4 h-4 text-purple-400" />
                  Cosmic
                </span>
                {settings.theme === 'cosmic' && (
                  <Check className="w-4 h-4 text-indigo-400 stroke-[3]" />
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deep space atmosphere, glowing neon lines, vibrant stars, and saturated highlights.
              </p>
            </button>

            {/* Classic Theme */}
            <button
              type="button"
              onClick={() => handleSelectTheme('classic')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                settings.theme === 'classic'
                  ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-white flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Classic
                </span>
                {settings.theme === 'classic' && (
                  <Check className="w-4 h-4 text-indigo-400 stroke-[3]" />
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Refined tabletop board style, clean slate textures, crisp geometry, and soft shadows.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Audio & Animation Toggles */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Preferences</h3>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Sound Effects</span>
                <span className="text-xs text-slate-400">
                  Audio feedback for moves, completed rows, and victory
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.soundEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Animations Toggle */}
          <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Visual Animations</span>
                <span className="text-xs text-slate-400">
                  Floating score badges, celebrations, and glowing transitions
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAnimations}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.animationsEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.animationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Confirm Before Leaving Toggle */}
          <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Confirm Before Leaving</span>
                <span className="text-xs text-slate-400">
                  Ask for confirmation when navigating away from an active match
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleConfirmLeave}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.confirmBeforeLeaving ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.confirmBeforeLeaving ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3. Reset All Data */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-rose-400 block">Reset All Application Data</span>
              <span className="text-xs text-slate-400">
                Wipes active games, player leaderboard records, and preferences
              </span>
            </div>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowResetDataConfirm(true)}
            >
              Reset Data
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDataConfirm}
        onClose={() => setShowResetDataConfirm(false)}
        onConfirm={handleConfirmReset}
        title="Reset All Local Data?"
        message="This will immediately erase your active game, all saved player leaderboard records, and restore defaults. This action cannot be reversed."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};
