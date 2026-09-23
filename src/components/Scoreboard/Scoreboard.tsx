import React from 'react';
import { Crown, Bot, Wifi, WifiOff } from 'lucide-react';
import { GameState } from '../../types/game';
import { OnlinePlayer } from '../../types/online';

interface ScoreboardProps {
  gameState: GameState;
  isBotThinking?: boolean;
  onlinePlayers?: OnlinePlayer[];
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ gameState, isBotThinking, onlinePlayers }) => {
  const {
    players,
    scores,
    rowsCompletedCount,
    circlesClaimedCount,
    currentPlayerIndex,
    status,
  } = gameState;

  // Identify highest score for leader crown
  const maxScore = Math.max(...Object.values(scores), 0);
  const isLeader = (playerId: string) => {
    return maxScore > 0 && scores[playerId] === maxScore;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {players.map((player, idx) => {
          const isCurrentTurn = status === 'playing' && idx === currentPlayerIndex;
          const score = scores[player.id] || 0;
          const rowsCount = rowsCompletedCount[player.id] || 0;
          const circlesCount = circlesClaimedCount[player.id] || 0;
          const hasCrown = isLeader(player.id);

          const onlinePlayer = onlinePlayers?.find(p => p.id === player.id);
          const isAiTakenOver = onlinePlayer?.isAiTakenOver;
          const isBot = player.isBot || onlinePlayer?.isBot || onlinePlayer?.isAiControlled;

          return (
            <div
              key={player.id}
              id={`player-card-${player.id}`}
              className={`relative rounded-xl p-3 sm:p-3.5 transition-all duration-300 border backdrop-blur-md overflow-hidden ${
                isCurrentTurn
                  ? 'bg-slate-900/95 shadow-xl scale-[1.02]'
                  : 'bg-slate-900/50 hover:bg-slate-900/70'
              }`}
              style={{
                borderColor: isCurrentTurn ? player.colorHex : 'rgba(255, 255, 255, 0.08)',
                boxShadow: isCurrentTurn ? `0 4px 20px ${player.colorHex}35` : undefined,
              }}
            >
              {/* Active turn indicator banner / top strip */}
              {isCurrentTurn && (
                <div
                  className="absolute top-0 inset-x-0 h-1"
                  style={{ backgroundColor: player.colorHex }}
                />
              )}

              {/* Player Header */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: player.colorHex,
                      boxShadow: `0 0 8px ${player.colorHex}80`,
                    }}
                  >
                    <span className="text-[9px] font-black text-white">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold truncate ${
                      isCurrentTurn ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {onlinePlayer?.originalHumanName || player.name}
                  </span>

                  {isAiTakenOver ? (
                    <span
                      title="AI Took Over this player"
                      className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    >
                      <Bot className="w-2.5 h-2.5" />
                      AI TAKEOVER
                    </span>
                  ) : isBot ? (
                    <span
                      title={`AI Bot (${player.difficulty || onlinePlayer?.difficulty || 'medium'})`}
                      className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    >
                      <Bot className="w-2.5 h-2.5" />
                      BOT
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onlinePlayer && !isBot && (
                    onlinePlayer.status === 'reconnecting' ? (
                      <span title="Reconnecting..." className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    ) : onlinePlayer.isConnected ? (
                      <span title="Online" className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : (
                      <span title="Disconnected" className="w-2 h-2 rounded-full bg-rose-400" />
                    )
                  )}

                  {hasCrown && (
                    <span
                      title="Current Leader"
                      className="flex items-center text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    >
                      <Crown className="w-3 h-3 mr-0.5" />
                      Top
                    </span>
                  )}
                </div>
              </div>

              {/* Big Score Display */}
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                    {score}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">
                    pts
                  </span>
                </div>

                {isCurrentTurn && (
                  <span
                    className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider animate-pulse flex items-center gap-1"
                    style={{
                      backgroundColor: `${player.colorHex}25`,
                      color: player.colorHex,
                    }}
                  >
                    {player.isBot && isBotThinking ? (
                      <>
                        <Bot className="w-3 h-3 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      'Turn'
                    )}
                  </span>
                )}
              </div>

              {/* Sub-stats (Rows completed, circles claimed) */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/5">
                <span title="Completed scoring rows">
                  Rows:{' '}
                  <strong className="text-slate-200 font-semibold">{rowsCount}</strong>
                </span>
                <span title="Circles claimed on board">
                  Circles:{' '}
                  <strong className="text-slate-200 font-semibold">{circlesCount}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
