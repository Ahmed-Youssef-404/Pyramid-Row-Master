import React, { useState, useEffect } from 'react';
import { GameState, GameSettings, Player } from './types/game';
import {
  loadActiveGame,
  saveActiveGame,
  clearActiveGame,
  loadSettings,
  saveSettings,
  recordGameResults,
  DEFAULT_SETTINGS,
} from './utils/storage';
import { createNewGame } from './game/gameLogic';
import { sounds } from './game/sound';

import { Header } from './components/Common/Header';
import { HowToPlayModal } from './components/Modals/HowToPlayModal';
import { ResumeGameModal } from './components/Modals/ResumeGameModal';

import { HomeView } from './pages/HomeView';
import { SetupView } from './pages/SetupView';
import { GameView } from './pages/GameView';
import { ResultsView } from './pages/ResultsView';
import { RankingsView } from './pages/RankingsView';
import { SettingsView } from './pages/SettingsView';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Initialize active game & audio settings on mount
  useEffect(() => {
    sounds.setMuted(!settings.soundEnabled);

    const savedGame = loadActiveGame();
    if (savedGame && savedGame.status === 'playing') {
      setActiveGame(savedGame);
      setShowResumeModal(true);
    }
  }, []);

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      if (typeof newSettings.soundEnabled === 'boolean') {
        sounds.setMuted(!newSettings.soundEnabled);
      }
      return updated;
    });
  };

  // Setup / Start New Game
  const handleStartGame = (players: Player[], pyramidSize: number) => {
    const newGame = createNewGame(players, pyramidSize);
    setActiveGame(newGame);
    saveActiveGame(newGame);
    setCurrentView('game');
  };

  // State update during moves
  const handleUpdateGameState = (nextState: GameState) => {
    setActiveGame(nextState);
    saveActiveGame(nextState);
  };

  // Game over handler
  const handleGameOver = (finalState: GameState) => {
    setActiveGame(finalState);
    recordGameResults(finalState);
    clearActiveGame();
    setCurrentView('results');
  };

  // Play Again with same players & board size
  const handlePlayAgain = () => {
    if (!activeGame) return;
    const newGame = createNewGame(activeGame.players, activeGame.pyramidSize);
    setActiveGame(newGame);
    saveActiveGame(newGame);
    setCurrentView('game');
  };

  // Restart current match immediately
  const handleRestartMatch = () => {
    if (!activeGame) return;
    const freshGame = createNewGame(activeGame.players, activeGame.pyramidSize);
    setActiveGame(freshGame);
    saveActiveGame(freshGame);
  };

  // Reset all local storage data
  const handleResetAllData = () => {
    setActiveGame(null);
    setSettings(DEFAULT_SETTINGS);
    setCurrentView('home');
  };

  const themeClass = settings.theme === 'classic' ? 'theme-classic' : 'theme-cosmic';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${themeClass} selection:bg-indigo-500 selection:text-white`}
    >
      {/* Top App Header */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenHelp={() => setShowHelpModal(true)}
        isGameActive={activeGame?.status === 'playing'}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col justify-center">
        {currentView === 'home' && (
          <HomeView
            onStartNewGame={() => setCurrentView('setup')}
            onResumeGame={() => setCurrentView('game')}
            onOpenRankings={() => setCurrentView('rankings')}
            onOpenSettings={() => setCurrentView('settings')}
            onOpenHelp={() => setShowHelpModal(true)}
            activeGame={activeGame}
          />
        )}

        {currentView === 'setup' && (
          <SetupView
            onStartGame={handleStartGame}
            onCancel={() => setCurrentView('home')}
          />
        )}

        {currentView === 'game' && activeGame && (
          <GameView
            gameState={activeGame}
            onUpdateGameState={handleUpdateGameState}
            onGameOver={handleGameOver}
            onLeaveGame={() => setCurrentView('home')}
            onRestartGame={handleRestartMatch}
            onOpenHelp={() => setShowHelpModal(true)}
            settings={settings}
          />
        )}

        {currentView === 'results' && activeGame && (
          <ResultsView
            gameState={activeGame}
            onPlayAgain={handlePlayAgain}
            onNewGame={() => setCurrentView('setup')}
            onViewRankings={() => setCurrentView('rankings')}
            onGoHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'rankings' && (
          <RankingsView onBack={() => setCurrentView(activeGame?.status === 'playing' ? 'game' : 'home')} />
        )}

        {currentView === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onBack={() => setCurrentView(activeGame?.status === 'playing' ? 'game' : 'home')}
            onResetAllData={handleResetAllData}
          />
        )}
      </main>

      {/* Resume Unfinished Game Dialog on First Load */}
      {showResumeModal && activeGame && (
        <ResumeGameModal
          isOpen={showResumeModal}
          activeGame={activeGame}
          onResume={() => {
            setShowResumeModal(false);
            setCurrentView('game');
          }}
          onStartNew={() => {
            setShowResumeModal(false);
            setCurrentView('setup');
          }}
        />
      )}

      {/* How to Play Rules Modal */}
      <HowToPlayModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
