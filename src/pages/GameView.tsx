import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, HelpCircle, ShieldAlert, Bot, User } from 'lucide-react';
import { GameState, GameSettings } from '../types/game';
import { executeMove } from '../game/gameLogic';
import { chooseBotMove, getBotThinkingDelay } from '../game/bot';
import { PyramidBoard } from '../components/Board/PyramidBoard';
import { Scoreboard } from '../components/Scoreboard/Scoreboard';
import { ConfirmDialog } from '../components/Modals/ConfirmDialog';
import { sounds } from '../game/sound';

interface GameViewProps {
  gameState: GameState;
  onUpdateGameState: (nextState: GameState) => void;
  onGameOver: (finalState: GameState) => void;
  onLeaveGame: () => void;
  onRestartGame: () => void;
  onOpenHelp: () => void;
  settings: GameSettings;
}

export const GameView: React.FC<GameViewProps> = ({
  gameState,
  onUpdateGameState,
  onGameOver,
  onLeaveGame,
  onRestartGame,
  onOpenHelp,
  settings,
}) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState<boolean>(false);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const totalCircles = (gameState.pyramidSize * (gameState.pyramidSize + 1)) / 2;
  const claimedCount = Object.values(gameState.cells).filter(c => c.ownerId !== null).length;
  const remainingCount = totalCircles - claimedCount;

  // Browser refresh / closing protection (Section 19)
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'A game is in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameState.status]);

  // Execute Move handler shared identically by humans and bots (Section 6, 29)
  const handleClaimCell = (cellId: string) => {
    const move = executeMove(gameState, cellId);
    if (!move) return;

    const { nextState, result } = move;

    // Trigger audio feedback based on move outcome
    if (settings.soundEnabled) {
      if (result.isGameOver) {
        sounds.playVictory();
      } else if (result.completedLines.length > 1) {
        sounds.playMultiRowCompleted();
      } else if (result.completedLines.length === 1) {
        sounds.playRowCompleted();
      } else {
        sounds.playClaim();
      }
    }

    onUpdateGameState(nextState);

    // If game finished, announce game over
    if (result.isGameOver) {
      setTimeout(() => {
        onGameOver(nextState);
      }, 700);
    }
  };

  // Bot Turn Automation (Section 6, 7, 18, 19)
  useEffect(() => {
    if (gameState.status !== 'playing') {
      setIsBotThinking(false);
      return;
    }

    // If current player is human, reset thinking and wait for human click
    if (!currentPlayer.isBot) {
      setIsBotThinking(false);
      return;
    }

    // Bot player's turn
    setIsBotThinking(true);
    const delay = getBotThinkingDelay(currentPlayer.difficulty);

    const timer = setTimeout(() => {
      // Re-verify game state
      if (gameState.status !== 'playing') return;

      const chosenCellId = chooseBotMove(gameState, currentPlayer);
      if (chosenCellId) {
        handleClaimCell(chosenCellId);
      }
      setIsBotThinking(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [gameState.currentPlayerIndex, gameState.turnNumber, gameState.status]);

  const handleLeaveClick = () => {
    if (settings.confirmBeforeLeaving && gameState.status === 'playing' && claimedCount > 0) {
      setShowLeaveConfirm(true);
    } else {
      onLeaveGame();
    }
  };

  const handleRestartClick = () => {
    if (claimedCount > 0) {
      setShowRestartConfirm(true);
    } else {
      onRestartGame();
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between max-w-5xl mx-auto px-2 sm:px-4 py-2">
      {/* Top Game Controls Bar */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-white/10 mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLeaveClick}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Leave Game</span>
          </button>

          <button
            onClick={handleRestartClick}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-400 hover:text-amber-400 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Restart Game with same settings"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>

        {/* Turn & Remaining Circles Counter */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            Turn <strong className="text-white font-bold">{gameState.turnNumber}</strong>
          </span>
          <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 hidden sm:inline-block">
            Remaining: <strong className="text-indigo-400 font-bold">{remainingCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
            title="Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Turn Banner - Highlighted clearly */}
      <div className="w-full max-w-xl mx-auto mb-2 text-center">
        <div
          className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-300"
          style={{
            borderColor: `${currentPlayer.colorHex}60`,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            boxShadow: `0 4px 20px ${currentPlayer.colorHex}25`,
          }}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full shrink-0 ${
              currentPlayer.isBot && isBotThinking ? 'animate-bounce' : 'animate-ping'
            }`}
            style={{ backgroundColor: currentPlayer.colorHex }}
          />
          <div className="text-left leading-tight">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
              <span>CURRENT TURN</span>
              {currentPlayer.isBot && (
                <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">
                  AI BOT ({currentPlayer.difficulty || 'medium'})
                </span>
              )}
            </div>
            <div className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <span style={{ color: currentPlayer.colorHex }}>{currentPlayer.name}</span>
              {currentPlayer.isBot ? (
                <span className="text-indigo-300 text-xs font-semibold bg-indigo-500/20 px-2.5 py-0.5 rounded-full animate-pulse border border-indigo-500/30 flex items-center gap-1">
                  <Bot className="w-3 h-3 animate-spin" />
                  Thinking...
                </span>
              ) : (
                <span className="text-slate-400 text-xs font-normal">• Choose a circle</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scoreboard Cards */}
      <div className="mb-2">
        <Scoreboard gameState={gameState} isBotThinking={isBotThinking} />
      </div>

      {/* Main Pyramid Board */}
      <div className="flex-1 flex items-center justify-center my-auto min-h-[360px]">
        <PyramidBoard
          gameState={gameState}
          onClaimCell={handleClaimCell}
          disabled={gameState.status !== 'playing' || isBotThinking || Boolean(currentPlayer.isBot)}
        />
      </div>

      {/* Bottom helper tip */}
      <div className="text-center text-[11px] text-slate-300 mt-2">
        Tap any circle to claim it • Claim the last circle in any line to complete it and earn the points!
      </div>

      {/* Confirm Leave Dialog */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={onLeaveGame}
        title="Leave Active Game?"
        message="Your current game progress will be kept in storage so you can resume later from the main menu."
        confirmLabel="Leave to Menu"
        cancelLabel="Keep Playing"
        variant="primary"
      />

      {/* Confirm Restart Dialog */}
      <ConfirmDialog
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        onConfirm={onRestartGame}
        title="Restart Game?"
        message="This will reset the current board and start a fresh match with the same players and size."
        confirmLabel="Restart Match"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};
