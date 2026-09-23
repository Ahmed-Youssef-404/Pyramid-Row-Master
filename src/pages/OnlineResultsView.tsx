import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Crown, User, Loader2, Bot } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { RoomState } from '../types/online';
import { onlineClient } from '../services/onlineClient';

interface OnlineResultsViewProps {
  room: RoomState;
  myPlayerId: string;
  onRematchStarted: (updatedRoom: RoomState) => void;
  onGoHome: () => void;
}

export const OnlineResultsView: React.FC<OnlineResultsViewProps> = ({
  room,
  myPlayerId,
  onRematchStarted,
  onGoHome,
}) => {
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<RoomState>(room);

  const gameState = currentRoom.gameState;
  const isHost = currentRoom.hostPlayerId === myPlayerId;

  // Listen for rematch start by host
  useEffect(() => {
    const socket = onlineClient.getSocket();

    const handleRoomUpdated = (updatedRoom: RoomState) => {
      setCurrentRoom(updatedRoom);
      if (updatedRoom.status === 'playing' && updatedRoom.gameState) {
        onRematchStarted(updatedRoom);
      }
    };

    socket.on('room:updated', handleRoomUpdated);
    return () => {
      socket.off('room:updated', handleRoomUpdated);
    };
  }, [onRematchStarted]);

  const players = gameState?.players || [];
  const scores = gameState?.scores || {};
  const rowsCompletedCount = gameState?.rowsCompletedCount || {};
  const circlesClaimedCount = gameState?.circlesClaimedCount || {};
  const winnerId = gameState?.winnerId || null;
  const isTie = gameState?.isTie || false;
  const tiedPlayerIds = gameState?.tiedPlayerIds || [];

  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = scores[a.id] || 0;
    const scoreB = scores[b.id] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (rowsCompletedCount[b.id] || 0) - (rowsCompletedCount[a.id] || 0);
  });

  const winner = winnerId ? players.find(p => p.id === winnerId) : null;
  const tiedPlayers = isTie ? players.filter(p => tiedPlayerIds.includes(p.id)) : [];

  // Launch confetti
  useEffect(() => {
    try {
      const end = Date.now() + 1200;
      const colors = winner
        ? [winner.colorHex, '#f59e0b', '#ffffff']
        : ['#6366f1', '#ec4899', '#10b981', '#f59e0b'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch {
      // Ignored if canvas unsupported
    }
  }, [winner]);

  const handleRestartGame = async () => {
    if (!isHost) return;
    setIsRestarting(true);
    try {
      await onlineClient.restartGame(currentRoom.roomId, myPlayerId);
    } catch {
      setIsRestarting(false);
    }
  };

  const handleLeaveToMenu = () => {
    onlineClient.leaveRoom();
    onGoHome();
  };

  const totalPoints = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full flex-1 max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center text-center">
      {/* Game Over Title Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black tracking-widest uppercase mb-3">
        Online Match Completed • Room {currentRoom.roomId}
      </div>

      {/* Winner Hero Display */}
      {isTie ? (
        <div className="mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shadow-xl mb-1">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">It's a Tie!</h2>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {tiedPlayers.map(p => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-xl text-sm font-bold border backdrop-blur-md"
                style={{
                  backgroundColor: `${p.colorHex}20`,
                  borderColor: p.colorHex,
                  color: p.colorHex,
                }}
              >
                {p.name} ({scores[p.id]} pts)
              </span>
            ))}
          </div>
        </div>
      ) : winner ? (
        <div className="mb-6 space-y-2">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl border shadow-2xl mb-1 relative"
            style={{
              backgroundColor: `${winner.colorHex}25`,
              borderColor: winner.colorHex,
              boxShadow: `0 0 35px ${winner.colorHex}50`,
            }}
          >
            <Trophy className="w-10 h-10" style={{ color: winner.colorHex }} />
            <span className="absolute -top-2 -right-2 text-xl">👑</span>
          </div>

          <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400 flex items-center justify-center gap-1.5">
            {winner.id === myPlayerId ? '🎉 YOU WON THE MATCH! 🎉' : 'MATCH WINNER'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span style={{ color: winner.colorHex }}>{winner.name}</span>
          </h2>
          <div className="text-2xl font-black text-amber-400">
            {scores[winner.id] || 0}{' '}
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Points
            </span>
          </div>
        </div>
      ) : null}

      {/* Final Scores Ranking Table */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 text-left shadow-xl backdrop-blur-md">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Final Standings</span>
          <span className="text-slate-500 font-normal">
            Pyramid size: {gameState?.pyramidSize || 7}
          </span>
        </h3>

        <div className="space-y-2">
          {sortedPlayers.map((player, rank) => {
            const score = scores[player.id] || 0;
            const rows = rowsCompletedCount[player.id] || 0;
            const circles = circlesClaimedCount[player.id] || 0;
            const isWinnerPlayer = !isTie && rank === 0;
            const isMe = player.id === myPlayerId;
            const onlinePlayer = currentRoom.players.find(p => p.id === player.id);
            const isAiTakenOver = onlinePlayer?.isAiTakenOver;
            const isBot = player.isBot || onlinePlayer?.isBot || onlinePlayer?.isAiControlled;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isWinnerPlayer
                    ? 'bg-slate-800/90 border-amber-400/40 shadow-md'
                    : 'bg-slate-800/40 border-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 text-center font-black text-sm ${
                      rank === 0
                        ? 'text-amber-400'
                        : rank === 1
                        ? 'text-slate-300'
                        : rank === 2
                        ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}
                  >
                    #{rank + 1}
                  </span>

                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: player.colorHex }}
                  />

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm block leading-tight">
                        {onlinePlayer?.originalHumanName || player.name}
                      </span>
                      {isMe && (
                        <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          YOU
                        </span>
                      )}
                      {isAiTakenOver ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Bot className="w-2.5 h-2.5" />
                          AI TAKEOVER
                        </span>
                      ) : isBot ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Bot className="w-2.5 h-2.5" />
                          AI ({onlinePlayer?.difficulty || player.difficulty || currentRoom.botDifficulty})
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {rows} rows • {circles} circles
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-white">{score}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 ml-1">
                    pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Match Summary Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-400">
          <span>
            Total Turns: <strong className="text-slate-200">{gameState?.turnNumber || 0}</strong>
          </span>
          <span>
            Points Awarded: <strong className="text-amber-400">{totalPoints}</strong>
          </span>
          <span>
            Circles:{' '}
            <strong className="text-indigo-400">
              {Object.keys(gameState?.cells || {}).length}
            </strong>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-2.5">
        {isHost ? (
          <Button
            variant="accent"
            size="lg"
            className="w-full shadow-2xl"
            icon={<RotateCcw className="w-5 h-5" />}
            disabled={isRestarting}
            onClick={handleRestartGame}
          >
            {isRestarting ? 'Starting Rematch...' : 'Start Rematch (Play Again)'}
          </Button>
        ) : (
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Waiting for host to start a rematch...</span>
          </div>
        )}

        <Button
          variant="secondary"
          size="md"
          className="w-full text-slate-300 hover:text-white"
          icon={<Home className="w-4 h-4" />}
          onClick={handleLeaveToMenu}
        >
          Return to Menu
        </Button>
      </div>
    </div>
  );
};
