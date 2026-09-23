import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Copy,
  Check,
  Share2,
  Play,
  Wifi,
  WifiOff,
  AlertCircle,
  Crown,
  Loader2,
  Bot,
  Zap,
  Shield,
  Flame,
} from 'lucide-react';
import { Button } from '../components/Common/Button';
import { PRESET_COLORS, getColorById } from '../utils/colors';
import { getTotalCirclesForSize } from '../game/board';
import { onlineClient, getOnlineSession } from '../services/onlineClient';
import { RoomState } from '../types/online';
import { BotDifficulty } from '../types/game';

interface OnlineLobbyViewProps {
  onBackToHome: () => void;
  onGameStarted: (room: RoomState, myPlayerId: string) => void;
  initialRoomState?: RoomState | null;
  initialPlayerId?: string | null;
}

const PYRAMID_SIZES = [5, 6, 7, 8, 9, 10, 11, 12];

const DIFFICULTY_DETAILS: Record<BotDifficulty, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
  easy: {
    label: 'Easy',
    desc: 'Casual moves with occasional strategic plays',
    icon: <Shield className="w-3.5 h-3.5" />,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  medium: {
    label: 'Medium',
    desc: 'Balanced tactics, active scoring, and basic blocking',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
  hard: {
    label: 'Hard',
    desc: 'Deep multi-line combos, denial tactics, and setups',
    icon: <Flame className="w-3.5 h-3.5" />,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
};

export const OnlineLobbyView: React.FC<OnlineLobbyViewProps> = ({
  onBackToHome,
  onGameStarted,
  initialRoomState = null,
  initialPlayerId = null,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(initialRoomState);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(initialPlayerId);

  // Create Form State
  const [createName, setCreateName] = useState<string>('Player 1');
  const [createTargetCount, setCreateTargetCount] = useState<number>(2);
  const [createBotCount, setCreateBotCount] = useState<number>(0);
  const [createBotDifficulty, setCreateBotDifficulty] = useState<BotDifficulty>('medium');
  const [createColorId, setCreateColorId] = useState<string>('blue');
  const [createPyramidSize, setCreatePyramidSize] = useState<number>(7);

  // Join Form State
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinName, setJoinName] = useState<string>('Player 2');
  const [joinColorId, setJoinColorId] = useState<string>('red');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [shareSupported, setShareSupported] = useState<boolean>(false);

  useEffect(() => {
    setShareSupported(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  // Clamp botCount whenever targetPlayersCount changes
  const handleTargetCountChange = (count: number) => {
    setCreateTargetCount(count);
    const maxBots = count - 1;
    if (createBotCount > maxBots) {
      setCreateBotCount(maxBots);
    }
  };

  // Setup Socket listeners for room updates & game start
  useEffect(() => {
    const socket = onlineClient.getSocket();

    const handleRoomUpdated = (updatedRoom: RoomState) => {
      setCurrentRoom(updatedRoom);
      if (updatedRoom.status === 'playing' && updatedRoom.gameState && myPlayerId) {
        onGameStarted(updatedRoom, myPlayerId);
      }
    };

    const handlePlayerDisconnected = (data: { playerId: string; playerName: string }) => {
      setInfoNotice(`${data.playerName} disconnected from lobby.`);
      setTimeout(() => setInfoNotice(null), 3000);
    };

    const handleHostChanged = (data: { newHostId: string; newHostName: string }) => {
      if (data.newHostId === myPlayerId) {
        setInfoNotice('👑 You are now the room host!');
      } else {
        setInfoNotice(`👑 ${data.newHostName} is now the room host.`);
      }
      setTimeout(() => setInfoNotice(null), 4000);
    };

    socket.on('room:updated', handleRoomUpdated);
    socket.on('room:player_disconnected', handlePlayerDisconnected);
    socket.on('room:host_changed', handleHostChanged);

    return () => {
      socket.off('room:updated', handleRoomUpdated);
      socket.off('room:player_disconnected', handlePlayerDisconnected);
      socket.off('room:host_changed', handleHostChanged);
    };
  }, [myPlayerId, onGameStarted]);

  // Attempt auto-reconnect on mount if session exists and no room is loaded
  useEffect(() => {
    if (currentRoom) return;

    const saved = getOnlineSession();
    if (saved && saved.roomId && saved.playerId) {
      setIsLoading(true);
      onlineClient
        .connect()
        .then(() => onlineClient.reconnect({ roomId: saved.roomId, playerId: saved.playerId }))
        .then(res => {
          if (res.success && res.room && res.playerId) {
            setCurrentRoom(res.room);
            setMyPlayerId(res.playerId);
            if (res.room.status === 'playing' && res.room.gameState) {
              onGameStarted(res.room, res.playerId);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [currentRoom, onGameStarted]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!createName.trim()) {
      setErrorMessage('Please enter your player name.');
      return;
    }

    try {
      setIsLoading(true);
      await onlineClient.connect();
      const res = await onlineClient.createRoom({
        playerName: createName.trim(),
        colorId: createColorId,
        targetPlayersCount: createTargetCount,
        botCount: createBotCount,
        botDifficulty: createBotDifficulty,
        pyramidSize: createPyramidSize,
      });

      if (res.success && res.room && res.playerId) {
        setCurrentRoom(res.room);
        setMyPlayerId(res.playerId);
      } else {
        setErrorMessage(res.error || 'Failed to create room.');
      }
    } catch {
      setErrorMessage('Connection error. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Room code must be exactly 6 characters.');
      return;
    }

    if (!joinName.trim()) {
      setErrorMessage('Please enter your player name.');
      return;
    }

    try {
      setIsLoading(true);
      await onlineClient.connect();
      const res = await onlineClient.joinRoom({
        roomId: cleanCode,
        playerName: joinName.trim(),
        colorId: joinColorId,
      });

      if (res.success && res.room && res.playerId) {
        setCurrentRoom(res.room);
        setMyPlayerId(res.playerId);
      } else {
        setErrorMessage(res.error || 'Failed to join room.');
      }
    } catch {
      setErrorMessage('Connection error. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!currentRoom || !myPlayerId) return;
    setErrorMessage(null);
    try {
      setIsLoading(true);
      const res = await onlineClient.startGame(currentRoom.roomId, myPlayerId);
      if (!res.success) {
        setErrorMessage(res.error || 'Could not start game.');
      }
    } catch {
      setErrorMessage('Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    onlineClient.leaveRoom();
    setCurrentRoom(null);
    setMyPlayerId(null);
    setErrorMessage(null);
    setInfoNotice(null);
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.roomId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = async () => {
    if (!currentRoom || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Pyramid Row Master — Join my Online Match',
        text: `Join my Pyramid Row Master room! Code: ${currentRoom.roomId}`,
        url: window.location.href,
      });
    } catch {
      // User cancelled share
    }
  };

  // If in an active room lobby, render the Lobby screen
  if (currentRoom) {
    const isHost = currentRoom.hostPlayerId === myPlayerId;
    const isFull = currentRoom.players.length === currentRoom.targetPlayersCount;
    const missingPlayersCount = currentRoom.targetPlayersCount - currentRoom.players.length;

    return (
      <div className="w-full flex-1 max-w-xl mx-auto px-4 py-6">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Online Lobby
            </span>
          </div>
          <div className="w-20" />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoNotice && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
            <Crown className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{infoNotice}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Room Code Showcase Box */}
          <div className="relative overflow-hidden bg-gradient-to-b from-indigo-950/80 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 text-center shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <span className="text-xs font-black uppercase tracking-widest text-indigo-300 block mb-2">
              Room Code
            </span>

            {/* Big readable Room Code */}
            <div className="inline-flex items-center justify-center tracking-widest text-4xl sm:text-5xl font-mono font-black text-amber-400 py-2 px-6 rounded-2xl bg-black/40 border border-amber-500/30 shadow-inner mb-4">
              {currentRoom.roomId}
            </div>

            {/* Action buttons for Room Code */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={copySuccess ? 'accent' : 'secondary'}
                size="sm"
                icon={copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                onClick={handleCopyCode}
              >
                {copySuccess ? 'Copied Code!' : 'Copy Room Code'}
              </Button>

              {shareSupported && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Share2 className="w-4 h-4 text-indigo-300" />}
                  onClick={handleShare}
                >
                  Share
                </Button>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Share this 6-character code with other players to join this match.
            </p>
          </div>

          {/* Players Roster */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-200">Room Roster</span>
              </div>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                {currentRoom.players.length} / {currentRoom.targetPlayersCount} Ready
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Joined Players */}
              {currentRoom.players.map((player, idx) => {
                const isMe = player.id === myPlayerId;
                const isBot = player.isBot || player.isAiControlled;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-slate-800/90 border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-slate-800/50 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-md relative"
                        style={{ backgroundColor: player.colorHex }}
                      >
                        {isBot ? <Bot className="w-4 h-4" /> : idx + 1}
                        {player.isHost && (
                          <span className="absolute -top-1.5 -right-1 text-amber-300 text-xs drop-shadow">
                            👑
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {player.name}
                          </span>
                          {isMe && (
                            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                              YOU
                            </span>
                          )}
                          {player.isHost && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" />
                              HOST
                            </span>
                          )}
                          {isBot && (
                            <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30 flex items-center gap-1">
                              <Bot className="w-2.5 h-2.5" />
                              AI ({player.difficulty || currentRoom.botDifficulty})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: player.colorHex }}
                          />
                          <span>{getColorById(player.colorId).name}</span>
                          <span>•</span>
                          <span className="capitalize">{isBot ? 'AI Bot' : 'Human Player'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold">
                      {isBot ? (
                        <span className="text-purple-400 flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                          <Bot className="w-3.5 h-3.5" />
                          <span>AI Active</span>
                        </span>
                      ) : player.isConnected ? (
                        <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                          <Wifi className="w-3.5 h-3.5" />
                          <span>Online</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                          <WifiOff className="w-3.5 h-3.5" />
                          <span>Disconnected</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty Slots */}
              {Array.from({ length: missingPlayersCount }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 text-slate-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-xs font-bold">
                      {currentRoom.players.length + idx + 1}
                    </div>
                    <span className="text-sm font-medium">Waiting for human player to join...</span>
                  </div>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Game Settings Info */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
            <div>
              Pyramid Size:{' '}
              <strong className="text-white">{currentRoom.pyramidSize} Rows</strong> (
              {getTotalCirclesForSize(currentRoom.pyramidSize)} Circles)
            </div>
            <div>
              AI Bots:{' '}
              <strong className="text-purple-300 font-bold">
                {currentRoom.botCount} ({currentRoom.botDifficulty.toUpperCase()})
              </strong>
            </div>
            <div>
              Total Players:{' '}
              <strong className="text-indigo-300 font-bold">
                {currentRoom.targetPlayersCount}
              </strong>
            </div>
          </div>

          {/* Bottom Action Controls */}
          {isHost ? (
            <div className="space-y-2">
              <Button
                variant="accent"
                size="xl"
                className="w-full shadow-2xl"
                icon={<Play className="w-5 h-5 fill-current" />}
                disabled={!isFull || isLoading}
                onClick={handleStartGame}
              >
                {isLoading
                  ? 'Starting Match...'
                  : isFull
                  ? 'Start Match'
                  : `Waiting for ${missingPlayersCount} More Player${missingPlayersCount > 1 ? 's' : ''}...`}
              </Button>
              {!isFull && (
                <p className="text-center text-xs text-amber-300/80">
                  Game can be started once all human slots are filled.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Waiting for host to start the game...</span>
              </div>
              <p className="text-xs text-slate-400">
                The game will begin automatically as soon as the host clicks Start.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Otherwise, render Create / Join Room tabs
  return (
    <div className="w-full flex-1 max-w-xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </button>
        <h2 className="text-xl font-bold text-white">Online Multiplayer</h2>
        <div className="w-16" />
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('create');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Create Room
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('join');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'join'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Join Room
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. CREATE ROOM FORM */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateRoom} className="space-y-5">
          {/* Target Players Count */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Total Room Capacity
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleTargetCountChange(num)}
                  className={`py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    createTargetCount === num
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <span className="text-lg">{num}</span>
                  <span className="text-[11px] font-normal opacity-80">Players</span>
                </button>
              ))}
            </div>
          </div>

          {/* Online Bots Count Selector */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>Online AI Bots</span>
              </label>
              <span className="text-xs font-semibold text-purple-300">
                {createBotCount === 0
                  ? 'All Human Players'
                  : `${createTargetCount - createBotCount} Human + ${createBotCount} AI Bot${createBotCount > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: createTargetCount }).map((_, botIdx) => (
                <button
                  key={`bot-opt-${botIdx}`}
                  type="button"
                  onClick={() => setCreateBotCount(botIdx)}
                  className={`py-2 px-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    createBotCount === botIdx
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <span className="text-sm font-black">{botIdx}</span>
                  <span className="text-[10px] font-medium opacity-80">
                    {botIdx === 0 ? 'No Bots' : botIdx === 1 ? '1 Bot' : `${botIdx} Bots`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bot Difficulty Selector (when bots are configured) */}
          {createBotCount > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Bot Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['easy', 'medium', 'hard'] as BotDifficulty[]).map(diff => {
                  const conf = DIFFICULTY_DETAILS[diff];
                  const isSelected = createBotDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setCreateBotDifficulty(diff)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? `${conf.color} ring-2 ring-purple-400 shadow-md`
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white capitalize">
                        {conf.icon}
                        <span>{conf.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        {conf.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player Name */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Player Name
            </label>
            <input
              type="text"
              maxLength={18}
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Player Color Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Player Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map(color => {
                const isSelected = createColorId === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setCreateColorId(color.id)}
                    className={`w-9 h-9 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'scale-110 ring-2 ring-white shadow-lg'
                        : 'opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: isSelected ? `0 0 12px ${color.hex}` : undefined,
                    }}
                    title={color.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pyramid Board Size */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pyramid Board Size
              </label>
              <span className="text-xs font-bold text-indigo-400">
                {createPyramidSize} Rows ({getTotalCirclesForSize(createPyramidSize)} Circles)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 justify-between">
              {PYRAMID_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setCreatePyramidSize(size)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    createPyramidSize === size
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            variant="accent"
            size="xl"
            className="w-full shadow-2xl"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Room...' : 'Create Room & Open Lobby'}
          </Button>
        </form>
      )}

      {/* 2. JOIN ROOM FORM */}
      {activeTab === 'join' && (
        <form onSubmit={handleJoinRoom} className="space-y-5">
          {/* Room Code */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Enter 6-Character Room Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. X7K4P9"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3.5 text-center font-mono text-2xl tracking-widest text-amber-400 uppercase font-black placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Player Name */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Player Name
            </label>
            <input
              type="text"
              maxLength={18}
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Player Color Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Player Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map(color => {
                const isSelected = joinColorId === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setJoinColorId(color.id)}
                    className={`w-9 h-9 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'scale-110 ring-2 ring-white shadow-lg'
                        : 'opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: isSelected ? `0 0 12px ${color.hex}` : undefined,
                    }}
                    title={color.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              Note: Colors already selected by the host or other players will be reserved.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="xl"
            className="w-full shadow-2xl"
            disabled={isLoading}
          >
            {isLoading ? 'Joining Room...' : 'Join Game Room'}
          </Button>
        </form>
      )}
    </div>
  );
};
