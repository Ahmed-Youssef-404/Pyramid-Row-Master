import React, { useState, useMemo } from 'react';
import { Trophy, ArrowLeft, Trash2, ArrowUpDown, Award, Flame, Search } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { ConfirmDialog } from '../components/Modals/ConfirmDialog';
import { PlayerStats } from '../types/game';
import { loadRankings, clearRankings } from '../utils/storage';

interface RankingsViewProps {
  onBack: () => void;
}

type SortField = 'wins' | 'points' | 'highest' | 'rows' | 'games';

export const RankingsView: React.FC<RankingsViewProps> = ({ onBack }) => {
  const [rankings, setRankings] = useState<PlayerStats[]>(() => loadRankings());
  const [sortField, setSortField] = useState<SortField>('wins');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for stats
    }
  };

  const sortedRankings = useMemo(() => {
    const filtered = rankings.filter(p =>
      p.displayName.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    return filtered.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'wins':
          valA = a.totalWins;
          valB = b.totalWins;
          break;
        case 'points':
          valA = a.totalPoints;
          valB = b.totalPoints;
          break;
        case 'highest':
          valA = a.highestScore;
          valB = b.highestScore;
          break;
        case 'rows':
          valA = a.totalRowsCompleted;
          valB = b.totalRowsCompleted;
          break;
        case 'games':
          valA = a.totalGames;
          valB = b.totalGames;
          break;
      }

      if (valA !== valB) {
        return sortAsc ? valA - valB : valB - valA;
      }
      // Secondary sort: wins then points
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      return b.totalPoints - a.totalPoints;
    });
  }, [rankings, sortField, sortAsc, searchQuery]);

  const handleClearRankings = () => {
    clearRankings();
    setRankings([]);
  };

  return (
    <div className="w-full flex-1 max-w-4xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold text-white tracking-wide">Player Leaderboard</h2>
        </div>

        {rankings.length > 0 ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
            title="Reset Rankings"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Search & Sort Filters Bar */}
      {rankings.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search player..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Sort Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Sort:</span>
            {(
              [
                { id: 'wins', label: 'Wins' },
                { id: 'points', label: 'Total Pts' },
                { id: 'highest', label: 'Best Score' },
                { id: 'rows', label: 'Rows' },
                { id: 'games', label: 'Games' },
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSort(opt.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  sortField === opt.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {opt.label} {sortField === opt.id && (sortAsc ? '↑' : '↓')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Table / Cards */}
      {rankings.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Historical Matches Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Play games to the end to record player records, total wins, scoring streaks, and rank
            on this leaderboard.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="md" onClick={onBack}>
              Play First Game
            </Button>
          </div>
        </div>
      ) : sortedRankings.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          No players match your search "{searchQuery}"
        </div>
      ) : (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Player</th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-white"
                    onClick={() => handleSort('wins')}
                  >
                    Wins {sortField === 'wins' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-white"
                    onClick={() => handleSort('points')}
                  >
                    Total Pts {sortField === 'points' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-white"
                    onClick={() => handleSort('highest')}
                  >
                    High Score {sortField === 'highest' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-white hidden sm:table-cell"
                    onClick={() => handleSort('rows')}
                  >
                    Rows {sortField === 'rows' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-white hidden md:table-cell"
                    onClick={() => handleSort('games')}
                  >
                    Matches {sortField === 'games' && (sortAsc ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {sortedRankings.map((stat, idx) => {
                  const isFirst = idx === 0 && sortField === 'wins';
                  return (
                    <tr
                      key={stat.normalizedName}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-black">
                        {idx === 0 ? (
                          <span className="text-amber-400 text-sm">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-slate-300 text-sm">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600 text-sm">🥉</span>
                        ) : (
                          <span className="text-slate-500">#{idx + 1}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: stat.colorHex || '#6366f1' }}
                          />
                          <span className="truncate max-w-[140px] sm:max-w-[200px]">
                            {stat.displayName}
                          </span>
                          {isFirst && (
                            <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">
                              Leader
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-black text-amber-400 text-sm">
                        {stat.totalWins}
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-200">
                        {stat.totalPoints}
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-indigo-400">
                        {stat.highestScore}
                      </td>

                      <td className="py-3 px-4 text-center text-slate-400 hidden sm:table-cell">
                        {stat.totalRowsCompleted}
                      </td>

                      <td className="py-3 px-4 text-center text-slate-400 hidden md:table-cell">
                        {stat.totalGames}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Resetting Rankings */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearRankings}
        title="Reset Player Rankings?"
        message="This will permanently delete all accumulated player records, wins, and scores. This action cannot be undone."
        confirmLabel="Reset All Records"
        cancelLabel="Keep Records"
        variant="danger"
      />
    </div>
  );
};
