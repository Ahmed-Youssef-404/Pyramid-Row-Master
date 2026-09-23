import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  HelpCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Crown,
  Bot,
  RotateCcw,
  Eye,
  Loader2,
} from 'lucide-react';
import { GameSettings, MoveResult } from '../types/game';
import { OnlinePlayer, RoomState } from '../types/online';
import { onlineClient } from '../services/onlineClient';
import { PyramidBoard } from '../components/Board/PyramidBoard';
import { Scoreboard } from '../components/Scoreboard/Scoreboard';
import { ConfirmDialog } from '../components/Modals/ConfirmDialog';
import { sounds } from '../game/sound';

interface OnlineGameViewProps {
  initialRoom: RoomState;
  myPlayerId: string;
  onGameOver: (finalRoom: RoomState) => void;
  onLeaveRoom: () => void;
  onOpenHelp: () => void;
  settings: GameSettings;
}

export const OnlineGameView: React.FC<OnlineGameViewProps> = ({
  initialRoom,
  myPlayerId,
  onGameOver,
  onLeaveRoom,
  onOpenHelp,
  settings,
}) => {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const [isSubmittingMove, setIsSubmittingMove] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Status notification banners
  const [notification, setNotification] = useState<{
    type: 'warn' | 'success' | 'info';
    message: string;
  } | null>(null);

  // AI Thinking state
  const [aiThinkingInfo, setAiThinkingInfo] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);

  // Remaining grace period seconds for any reconnecting player
  const [graceSecondsRemaining, setGraceSecondsRemaining] = useState<number | null>(null);

  const gameState = room.gameState;

  // Find my player in room
  const myPlayer = useMemo(() => {
    return room.players.find(p => p.id === myPlayerId) || null;
  }, [room.players, myPlayerId]);

  // Is this player in spectator mode (e.g. AI took over seat)?
  const isSpectator = Boolean(myPlayer?.isAiControlled || myPlayer?.isAiTakenOver);

  // Active turn & player calculations
  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex] || null;
  }, [gameState]);

  const currentOnlinePlayer = useMemo(() => {
    if (!currentPlayer) return null;
    return room.players.find(p => p.id === currentPlayer.id) || null;
  }, [room.players, currentPlayer]);

  const isCurrentPlayerAi = Boolean(
    currentPlayer?.isBot ||
    currentOnlinePlayer?.isBot ||
    currentOnlinePlayer?.isAiControlled
  );

  const isCurrentPlayerReconnecting = Boolean(
    currentOnlinePlayer?.status === 'reconnecting'
  );

  const isMyTurn = Boolean(
    currentPlayer &&
    currentPlayer.id === myPlayerId &&
    !isSpectator
  );

  const totalCircles = gameState
    ? (gameState.pyramidSize * (gameState.pyramidSize + 1)) / 2
    : 0;

  const claimedCount = gameState
    ? Object.values(gameState.cells).filter(c => c.ownerId !== null).length
    : 0;

  const remainingCount = totalCircles - claimedCount;

  // Countdown timer for reconnecting players
  useEffect(() => {
    const reconnectingPlayer = room.players.find(
      p => p.status === 'reconnecting' && p.disconnectExpiry
    );

    if (!reconnectingPlayer || !reconnectingPlayer.disconnectExpiry) {
      setGraceSecondsRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, reconnectingPlayer.disconnectExpiry! - now);
      const seconds = Math.ceil(remainingMs / 1000);
      setGraceSecondsRemaining(seconds);

      if (seconds <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    const now = Date.now();
    const remainingMs = Math.max(0, reconnectingPlayer.disconnectExpiry - now);
    setGraceSecondsRemaining(Math.ceil(remainingMs / 1000));

    return () => clearInterval(interval);
  }, [room.players]);

  // Prevent accidental tab close
  useEffect(() => {
    if (room.status !== 'playing') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'An online match is currently in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [room.status]);

  // Socket event listeners for authoritative real-time updates
  useEffect(() => {
    const socket = onlineClient.getSocket();

    const handleRoomUpdated = (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
      setAiThinkingInfo(null);
      if (updatedRoom.status === 'finished') {
        setTimeout(() => {
          onGameOver(updatedRoom);
        }, 750);
      }
    };

    const handleMoveMade = (data: { gameState: any; moveResult: MoveResult }) => {
      setAiThinkingInfo(null);
      if (settings.soundEnabled && data.moveResult) {
        if (data.moveResult.isGameOver) {
          sounds.playVictory();
        } else if (data.moveResult.completedLines && data.moveResult.completedLines.length > 1) {
          sounds.playMultiRowCompleted();
        } else if (data.moveResult.completedLines && data.moveResult.completedLines.length === 1) {
          sounds.playRowCompleted();
        } else {
          sounds.playClaim();
        }
      }
    };

    const handlePlayerDisconnected = (data: { playerId: string; playerName: string }) => {
      setNotification({
        type: 'warn',
        message: `${data.playerName} lost connection. Reconnecting... (AI takeover in 30s)`,
      });
    };

    const handlePlayerReconnected = (data: { playerId: string; playerName?: string }) => {
      const name = data.playerName || 'Player';
      setNotification({
        type: 'success',
        message: `${name} has reconnected to the match!`,
      });
      setTimeout(() => setNotification(null), 4000);
    };

    const handleAiTakeover = (data: {
      playerId: string;
      playerName: string;
      originalHumanName?: string;
      reason: 'disconnect_timeout' | 'explicit_leave';
    }) => {
      const name = data.originalHumanName || data.playerName;
      if (data.reason === 'disconnect_timeout') {
        setNotification({
          type: 'warn',
          message: `${name} did not reconnect in time. AI has taken control of this player.`,
        });
      } else {
        setNotification({
          type: 'info',
          message: `${name} left the game. AI has taken control of this player.`,
        });
      }
      setTimeout(() => setNotification(null), 5000);
    };

    const handleHostChanged = (data: { newHostId: string; newHostName: string }) => {
      if (data.newHostId === myPlayerId) {
        setNotification({
          type: 'info',
          message: '👑 The previous host left. You are now the room host!',
        });
      } else {
        setNotification({
          type: 'info',
          message: `👑 ${data.newHostName} is now the room host.`,
        });
      }
      setTimeout(() => setNotification(null), 4000);
    };

    const handleAiThinking = (data: { playerId: string; playerName: string }) => {
      setAiThinkingInfo({
        playerId: data.playerId,
        playerName: data.playerName,
      });
    };

    socket.on('room:updated', handleRoomUpdated);
    socket.on('game:move_made', handleMoveMade);
    socket.on('room:player_disconnected', handlePlayerDisconnected);
    socket.on('room:player_reconnected', handlePlayerReconnected);
    socket.on('room:ai_takeover', handleAiTakeover);
    socket.on('room:host_changed', handleHostChanged);
    socket.on('game:ai_thinking', handleAiThinking);

    return () => {
      socket.off('room:updated', handleRoomUpdated);
      socket.off('game:move_made', handleMoveMade);
      socket.off('room:player_disconnected', handlePlayerDisconnected);
      socket.off('room:player_reconnected', handlePlayerReconnected);
      socket.off('room:ai_takeover', handleAiTakeover);
      socket.off('room:host_changed', handleHostChanged);
      socket.off('game:ai_thinking', handleAiThinking);
    };
  }, [myPlayerId, onGameOver, settings.soundEnabled]);

  // Click handler for claiming circle
  const handleClaimCell = async (cellId: string) => {
    if (
      !gameState ||
      gameState.status !== 'playing' ||
      !isMyTurn ||
      isSpectator ||
      isSubmittingMove
    ) {
      return;
    }

    setMoveError(null);
    setIsSubmittingMove(true);

    try {
      const res = await onlineClient.makeMove(room.roomId, myPlayerId, cellId);
      if (!res.success) {
        setMoveError(res.error || 'Move could not be made.');
      }
    } catch {
      setMoveError('Network connection issue. Please retry.');
    } finally {
      setIsSubmittingMove(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomId);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    onlineClient.leaveRoom();
    onLeaveRoom();
  };

  if (!gameState) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Synchronizing game state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col justify-between max-w-5xl mx-auto px-2 sm:px-4 py-2">
      {/* Top Game Controls Bar */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-white/10 mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Leave Room</span>
          </button>

          {/* Room Code Badge */}
          <button
            onClick={handleCopyCode}
            title="Click to copy room code"
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <span>ROOM: {room.roomId}</span>
            {copyCodeSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-amber-400/80" />
            )}
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors cursor-pointer"
            title="Rules & How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Spectator Mode Banner */}
      {isSpectator && (
        <div className="w-full max-w-xl mx-auto mb-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow-md">
          <Eye className="w-4 h-4 text-purple-300 shrink-0" />
          <span>Spectator Mode: 🤖 AI is currently controlling your player. You can watch the rest of this match!</span>
        </div>
      )}

      {/* Disconnect / Takeover / Host Alert Notice */}
      {notification && (
        <div
          className={`w-full max-w-xl mx-auto mb-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-lg transition-all ${
            notification.type === 'warn'
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
              : notification.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Move Error Notice */}
      {moveError && (
        <div className="w-full max-w-xl mx-auto mb-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{moveError}</span>
        </div>
      )}

      {/* Active Turn Banner */}
      <div className="w-full max-w-xl mx-auto mb-2 text-center">
        <div
          className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-300"
          style={{
            borderColor: `${currentPlayer?.colorHex || '#6366f1'}70`,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            boxShadow: `0 4px 20px ${currentPlayer?.colorHex || '#6366f1'}30`,
          }}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full shrink-0 ${isMyTurn ? 'animate-ping' : ''}`}
            style={{ backgroundColor: currentPlayer?.colorHex || '#6366f1' }}
          />

          <div className="text-left leading-tight">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-2">
              <span>CURRENT TURN</span>
              {isMyTurn && (
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  IT'S YOUR TURN!
                </span>
              )}
              {isCurrentPlayerAi && (
                <span className="text-[9px] font-black text-purple-400 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30 flex items-center gap-1">
                  <Bot className="w-2.5 h-2.5" />
                  AI PLAYER
                </span>
              )}
              {isCurrentPlayerReconnecting && graceSecondsRemaining !== null && (
                <span className="text-[9px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 animate-pulse">
                  AI TAKEOVER IN {graceSecondsRemaining}S
                </span>
              )}
            </div>

            <div className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <span style={{ color: currentPlayer?.colorHex || '#ffffff' }}>
                {isMyTurn
                  ? 'Your Turn'
                  : currentOnlinePlayer?.originalHumanName
                  ? `${currentOnlinePlayer.originalHumanName}'s AI`
                  : `${currentPlayer?.name}'s Turn`}
              </span>
              <span className="text-slate-400 text-xs font-normal">
                {isMyTurn ? (
                  '• Tap any empty circle'
                ) : isCurrentPlayerAi ? (
                  aiThinkingInfo ? '• AI is calculating best move...' : '• AI turn in progress...'
                ) : isCurrentPlayerReconnecting ? (
                  `• Waiting for reconnect (${graceSecondsRemaining ?? 30}s)`
                ) : (
                  '• Waiting for move...'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scoreboard Cards with Online Presence & AI Badges */}
      <div className="mb-2">
        <Scoreboard
          gameState={gameState}
          isBotThinking={Boolean(aiThinkingInfo)}
          onlinePlayers={room.players}
        />
      </div>

      {/* Main Pyramid Board */}
      <div className="flex-1 flex items-center justify-center my-auto min-h-[360px]">
        <PyramidBoard
          gameState={gameState}
          onClaimCell={handleClaimCell}
          disabled={!isMyTurn || gameState.status !== 'playing' || isSubmittingMove}
        />
      </div>

      {/* Bottom helper tip */}
      <div className="text-center text-[11px] text-slate-300 mt-2">
        {isSpectator
          ? '👁️ You are spectating this match. AI is handling moves.'
          : isMyTurn
          ? '🎯 It is your turn! Claim any circle on the board.'
          : isCurrentPlayerAi
          ? `🤖 ${currentPlayer?.name} is thinking...`
          : `⏳ Waiting for ${currentPlayer?.name || 'opponent'} to make their move.`}
      </div>

      {/* Confirm Leave Room Dialog */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleConfirmLeave}
        title="Leave Online Match?"
        message="If you leave now, an AI will immediately take over your player seat so the match can continue for everyone else."
        confirmLabel="Leave Match"
        cancelLabel="Stay in Game"
        variant="danger"
      />
    </div>
  );
};
