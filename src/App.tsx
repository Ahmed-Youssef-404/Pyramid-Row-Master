import React, { useState, useEffect } from 'react';
import { GameState, GameSettings, Player } from './types/game';
import { RoomState } from './types/online';
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
import { onlineClient, getOnlineSession, clearOnlineSession } from './services/onlineClient';

import { Header } from './components/Common/Header';
import { HowToPlayModal } from './components/Modals/HowToPlayModal';
import { ResumeGameModal } from './components/Modals/ResumeGameModal';

import { HomeView } from './pages/HomeView';
import { SetupView } from './pages/SetupView';
import { GameView } from './pages/GameView';
import { ResultsView } from './pages/ResultsView';
import { RankingsView } from './pages/RankingsView';
import { SettingsView } from './pages/SettingsView';
import { OnlineLobbyView } from './pages/OnlineLobbyView';
import { OnlineGameView } from './pages/OnlineGameView';
import { OnlineResultsView } from './pages/OnlineResultsView';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Online Multiplayer State
  const [onlineRoom, setOnlineRoom] = useState<RoomState | null>(null);
  const [onlinePlayerId, setOnlinePlayerId] = useState<string | null>(null);

  // Initialize active game & audio settings on mount
  useEffect(() => {
    sounds.setMuted(!settings.soundEnabled);

    // 1. Check if user was inside an active online game before refresh
    const savedOnlineSession = getOnlineSession();
    if (savedOnlineSession && savedOnlineSession.roomId && savedOnlineSession.playerId) {
      onlineClient
        .connect()
        .then(() =>
          onlineClient.reconnect({
            roomId: savedOnlineSession.roomId,
            playerId: savedOnlineSession.playerId,
          })
        )
        .then(res => {
          if (res.success && res.room && res.playerId) {
            setOnlineRoom(res.room);
            setOnlinePlayerId(res.playerId);
            if (res.room.status === 'playing' && res.room.gameState) {
              setCurrentView('online_game');
            } else if (res.room.status === 'finished') {
              setCurrentView('online_results');
            } else if (res.room.status === 'waiting') {
              setCurrentView('online_lobby');
            }
          }
        })
        .catch(() => {
          clearOnlineSession();
        });
    }

    // 2. Check local saved game
    const savedGame = loadActiveGame();
    if (savedGame && savedGame.status === 'playing' && !savedOnlineSession) {
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

  // Local Game: Setup / Start New Game
  const handleStartGame = (players: Player[], pyramidSize: number) => {
    const newGame = createNewGame(players, pyramidSize);
    setActiveGame(newGame);
    saveActiveGame(newGame);
    setCurrentView('game');
  };

  // Local Game: State update during moves
  const handleUpdateGameState = (nextState: GameState) => {
    setActiveGame(nextState);
    saveActiveGame(nextState);
  };

  // Local Game: Game over handler
  const handleGameOver = (finalState: GameState) => {
    setActiveGame(finalState);
    recordGameResults(finalState);
    clearActiveGame();
    setCurrentView('results');
  };

  // Local Game: Play Again with same players & board size
  const handlePlayAgain = () => {
    if (!activeGame) return;
    const newGame = createNewGame(activeGame.players, activeGame.pyramidSize);
    setActiveGame(newGame);
    saveActiveGame(newGame);
    setCurrentView('game');
  };

  // Local Game: Restart current match immediately
  const handleRestartMatch = () => {
    if (!activeGame) return;
    const freshGame = createNewGame(activeGame.players, activeGame.pyramidSize);
    setActiveGame(freshGame);
    saveActiveGame(freshGame);
  };

  // Reset all local storage data
  const handleResetAllData = () => {
    setActiveGame(null);
    clearActiveGame();
    clearOnlineSession();
    setOnlineRoom(null);
    setOnlinePlayerId(null);
    setSettings(DEFAULT_SETTINGS);
    setCurrentView('home');
  };

  // Online Multiplayer Handlers
  const handleOnlineGameStarted = (room: RoomState, playerId: string) => {
    setOnlineRoom(room);
    setOnlinePlayerId(playerId);
    setCurrentView('online_game');
  };

  const handleOnlineGameOver = (finalRoom: RoomState) => {
    setOnlineRoom(finalRoom);
    setCurrentView('online_results');
  };

  const handleOnlineRematchStarted = (updatedRoom: RoomState) => {
    setOnlineRoom(updatedRoom);
    setCurrentView('online_game');
  };

  const handleLeaveOnlineGame = () => {
    onlineClient.leaveRoom();
    setOnlineRoom(null);
    setOnlinePlayerId(null);
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
        onNavigate={(view) => {
          if (view === 'home' && currentView === 'online_game') {
            handleLeaveOnlineGame();
          } else {
            setCurrentView(view);
          }
        }}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenHelp={() => setShowHelpModal(true)}
        isGameActive={activeGame?.status === 'playing' || onlineRoom?.status === 'playing'}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col justify-center">
        {currentView === 'home' && (
          <HomeView
            onStartNewGame={() => setCurrentView('setup')}
            onOpenOnline={() => setCurrentView('online_lobby')}
            onResumeGame={() => setCurrentView('game')}
            onOpenRankings={() => setCurrentView('rankings')}
            onOpenSettings={() => setCurrentView('settings')}
            onOpenHelp={() => setShowHelpModal(true)}
            activeGame={activeGame}
          />
        )}

        {/* Local Pass & Play / Bots Setup */}
        {currentView === 'setup' && (
          <SetupView
            onStartGame={handleStartGame}
            onCancel={() => setCurrentView('home')}
          />
        )}

        {/* Local Active Game */}
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

        {/* Local Results */}
        {currentView === 'results' && activeGame && (
          <ResultsView
            gameState={activeGame}
            onPlayAgain={handlePlayAgain}
            onNewGame={() => setCurrentView('setup')}
            onViewRankings={() => setCurrentView('rankings')}
            onGoHome={() => setCurrentView('home')}
          />
        )}

        {/* Online Multiplayer Lobby (Create Room / Join Room / Room Waiting) */}
        {currentView === 'online_lobby' && (
          <OnlineLobbyView
            onBackToHome={() => setCurrentView('home')}
            onGameStarted={handleOnlineGameStarted}
            initialRoomState={onlineRoom}
            initialPlayerId={onlinePlayerId}
          />
        )}

        {/* Online Active Game */}
        {currentView === 'online_game' && onlineRoom && onlinePlayerId && (
          <OnlineGameView
            initialRoom={onlineRoom}
            myPlayerId={onlinePlayerId}
            onGameOver={handleOnlineGameOver}
            onLeaveRoom={handleLeaveOnlineGame}
            onOpenHelp={() => setShowHelpModal(true)}
            settings={settings}
          />
        )}

        {/* Online Results Screen */}
        {currentView === 'online_results' && onlineRoom && onlinePlayerId && (
          <OnlineResultsView
            room={onlineRoom}
            myPlayerId={onlinePlayerId}
            onRematchStarted={handleOnlineRematchStarted}
            onGoHome={handleLeaveOnlineGame}
          />
        )}

        {/* Rankings */}
        {currentView === 'rankings' && (
          <RankingsView
            onBack={() => {
              if (onlineRoom?.status === 'playing') {
                setCurrentView('online_game');
              } else if (activeGame?.status === 'playing') {
                setCurrentView('game');
              } else {
                setCurrentView('home');
              }
            }}
          />
        )}

        {/* Settings */}
        {currentView === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onBack={() => {
              if (onlineRoom?.status === 'playing') {
                setCurrentView('online_game');
              } else if (activeGame?.status === 'playing') {
                setCurrentView('game');
              } else {
                setCurrentView('home');
              }
            }}
            onResetAllData={handleResetAllData}
          />
        )}
      </main>

      {/* Resume Unfinished Local Game Dialog on First Load */}
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
