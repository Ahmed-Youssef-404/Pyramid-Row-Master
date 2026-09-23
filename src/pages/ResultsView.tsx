import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, PlusCircle, Award, Home, Bot } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { GameState, Player } from '../types/game';

interface ResultsViewProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onNewGame: () => void;
  onViewRankings: () => void;
  onGoHome: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  gameState,
  onPlayAgain,
  onNewGame,
  onViewRankings,
  onGoHome,
}) => {
  const { players, scores, rowsCompletedCount, circlesClaimedCount, winnerId, isTie, tiedPlayerIds } =
    gameState;

  // Rank players by score descending
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = scores[a.id] || 0;
    const scoreB = scores[b.id] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    // Tiebreaker: rows completed
    return (rowsCompletedCount[b.id] || 0) - (rowsCompletedCount[a.id] || 0);
  });

  const winner = winnerId ? players.find(p => p.id === winnerId) : null;
  const tiedPlayers = isTie ? players.filter(p => tiedPlayerIds.includes(p.id)) : [];

  // Launch celebratory confetti
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

  const totalPoints = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full flex-1 max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center text-center">
      {/* Game Over Title Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black tracking-widest uppercase mb-3">
        Match Completed
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
            {winner.isBot ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                <Bot className="w-3 h-3" />
                BOT WINNER
              </span>
            ) : (
              'CHAMPION'
            )}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            {winner.isBot && <span className="text-2xl">🤖</span>}
            <span>{winner.name}</span>
            {winner.isBot && <span className="text-indigo-400 text-2xl font-bold">Wins!</span>}
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
          <span className="text-slate-500 font-normal">Pyramid size: {gameState.pyramidSize}</span>
        </h3>

        <div className="space-y-2">
          {sortedPlayers.map((player, rank) => {
            const score = scores[player.id] || 0;
            const rows = rowsCompletedCount[player.id] || 0;
            const circles = circlesClaimedCount[player.id] || 0;
            const isWinnerPlayer = !isTie && rank === 0;

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
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm block leading-tight">
                        {player.name}
                      </span>
                      {player.isBot && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Bot className="w-2.5 h-2.5" />
                          BOT
                        </span>
                      )}
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
            Total Turns: <strong className="text-slate-200">{gameState.turnNumber}</strong>
          </span>
          <span>
            Points Awarded: <strong className="text-amber-400">{totalPoints}</strong>
          </span>
          <span>
            Circles: <strong className="text-indigo-400">{Object.keys(gameState.cells).length}</strong>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-2.5">
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          icon={<RotateCcw className="w-5 h-5" />}
          onClick={onPlayAgain}
        >
          Play Again
        </Button>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={onNewGame}
          >
            New Match
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="w-full"
            icon={<Award className="w-4 h-4 text-amber-400" />}
            onClick={onViewRankings}
          >
            Rankings
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-400 hover:text-white"
          icon={<Home className="w-4 h-4" />}
          onClick={onGoHome}
        >
          Return to Menu
        </Button>
      </div>
    </div>
  );
};
