import React, { useState } from 'react';
import { ArrowLeft, Play, Users, Check, AlertCircle, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { BotDifficulty, Player } from '../types/game';
import { PRESET_COLORS } from '../utils/colors';
import { getTotalCirclesForSize } from '../game/board';
import { DIFFICULTY_CONFIGS } from '../game/bot/difficulty';

interface SetupViewProps {
  onStartGame: (players: Player[], pyramidSize: number) => void;
  onCancel: () => void;
}

interface PlayerConfig {
  id: string;
  name: string;
  colorId: string;
}

const DEFAULT_HUMAN_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
const DEFAULT_BOT_NAMES = ['Nova 🤖', 'Orion 🤖', 'Atlas 🤖', 'Vega 🤖'];
const DEFAULT_COLOR_IDS = ['blue', 'red', 'green', 'purple'];
const PYRAMID_SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const SetupView: React.FC<SetupViewProps> = ({ onStartGame, onCancel }) => {
  const [gameMode, setGameMode] = useState<'local' | 'bots'>('local');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [botCount, setBotCount] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [pyramidSize, setPyramidSize] = useState<number>(7);

  const [playersConfig, setPlayersConfig] = useState<PlayerConfig[]>([
    { id: 'p1', name: 'Player 1', colorId: DEFAULT_COLOR_IDS[0] },
    { id: 'p2', name: 'Player 2', colorId: DEFAULT_COLOR_IDS[1] },
    { id: 'p3', name: 'Player 3', colorId: DEFAULT_COLOR_IDS[2] },
    { id: 'p4', name: 'Player 4', colorId: DEFAULT_COLOR_IDS[3] },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Switch between Local Multiplayer and Play with Bots
  const handleGameModeChange = (mode: 'local' | 'bots') => {
    setGameMode(mode);
    setErrorMessage(null);
    if (mode === 'local') {
      setBotCount(0);
      // Reset names to human defaults if previously filled with bot names
      setPlayersConfig(prev =>
        prev.map((p, idx) => ({
          ...p,
          name: DEFAULT_HUMAN_NAMES[idx] || `Player ${idx + 1}`,
        }))
      );
    } else {
      const nextBots = botCount > 0 ? Math.min(botCount, playerCount - 1) : 1;
      setBotCount(nextBots);
      syncPlayerNames(playerCount, nextBots);
    }
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    setErrorMessage(null);
    if (gameMode === 'bots') {
      const maxBots = count - 1;
      const nextBots = Math.min(botCount > 0 ? botCount : 1, maxBots);
      setBotCount(nextBots);
      syncPlayerNames(count, nextBots);
    } else {
      setBotCount(0);
    }
  };

  const handleBotCountChange = (count: number) => {
    setBotCount(count);
    setErrorMessage(null);
    if (count === 0) {
      setGameMode('local');
    } else {
      setGameMode('bots');
    }
    syncPlayerNames(playerCount, count);
  };

  // Helper to sync default names when bot count changes
  const syncPlayerNames = (totalPlayers: number, bots: number) => {
    const humanCount = totalPlayers - bots;
    setPlayersConfig(prev => {
      return prev.map((p, idx) => {
        const isBot = idx >= humanCount && idx < totalPlayers;
        if (isBot) {
          const botIdx = idx - humanCount;
          return {
            ...p,
            name: DEFAULT_BOT_NAMES[botIdx % DEFAULT_BOT_NAMES.length],
          };
        } else {
          // If previous name was a default bot name, replace with human name
          const wasBotName = DEFAULT_BOT_NAMES.includes(p.name);
          return {
            ...p,
            name: wasBotName ? DEFAULT_HUMAN_NAMES[idx] : p.name,
          };
        }
      });
    });
  };

  const handleNameChange = (index: number, name: string) => {
    setPlayersConfig(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name };
      return copy;
    });
    setErrorMessage(null);
  };

  const handleColorSelect = (playerIndex: number, selectedColorId: string) => {
    setPlayersConfig(prev => {
      const copy = [...prev];
      const existingOwnerIdx = copy.findIndex(
        (p, idx) => idx < playerCount && idx !== playerIndex && p.colorId === selectedColorId
      );

      if (existingOwnerIdx !== -1) {
        const oldColorId = copy[playerIndex].colorId;
        copy[existingOwnerIdx] = { ...copy[existingOwnerIdx], colorId: oldColorId };
      }

      copy[playerIndex] = { ...copy[playerIndex], colorId: selectedColorId };
      return copy;
    });
  };

  const handleStart = () => {
    const effectiveBotCount = gameMode === 'bots' ? botCount : 0;
    const humanCount = playerCount - effectiveBotCount;
    const activeConfigs = playersConfig.slice(0, playerCount);

    // Validate human names
    for (let i = 0; i < activeConfigs.length; i++) {
      if (!activeConfigs[i].name.trim()) {
        const isBot = i >= humanCount;
        setErrorMessage(
          isBot ? `Please enter a valid name for Bot ${i - humanCount + 1}` : `Please enter a valid name for Player ${i + 1}`
        );
        return;
      }
    }

    // Check unique names
    const names = new Set(activeConfigs.map(p => p.name.trim().toLowerCase()));
    if (names.size < activeConfigs.length) {
      setErrorMessage('Each player/bot must have a unique name.');
      return;
    }

    // Map to full Player objects
    const finalPlayers: Player[] = activeConfigs.map((p, idx) => {
      const isBot = idx >= humanCount;
      const colorOpt = PRESET_COLORS.find(c => c.id === p.colorId) || PRESET_COLORS[idx];
      return {
        id: p.id,
        name: p.name.trim(),
        colorId: colorOpt.id,
        colorHex: colorOpt.hex,
        colorBorder: colorOpt.ring,
        colorGlow: colorOpt.glow,
        colorBg: colorOpt.bgGradient,
        isBot,
        difficulty: isBot ? difficulty : undefined,
      };
    });

    onStartGame(finalPlayers, pyramidSize);
  };

  const totalCircles = getTotalCirclesForSize(pyramidSize);
  const effectiveBotCount = gameMode === 'bots' ? botCount : 0;
  const humanCount = playerCount - effectiveBotCount;
  const maxBotsAllowed = playerCount - 1;

  return (
    <div className="w-full flex-1 max-w-2xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </button>
        <h2 className="text-xl font-bold text-white">Game Setup</h2>
        <div className="w-16" />
      </div>

      <div className="space-y-6">
        {/* Error message if validation fails */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Game Mode Selector */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-200">Game Mode</span>
            <span className="text-xs text-slate-400">Choose who participates</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleGameModeChange('local')}
              className={`p-3.5 rounded-xl font-bold text-left transition-all duration-150 cursor-pointer border flex items-center gap-3 ${
                gameMode === 'local'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-400'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  gameMode === 'local' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">Local Multiplayer</div>
                <div className="text-[11px] font-normal text-slate-400 mt-0.5">All real people</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGameModeChange('bots')}
              className={`p-3.5 rounded-xl font-bold text-left transition-all duration-150 cursor-pointer border flex items-center gap-3 ${
                gameMode === 'bots'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-400'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  gameMode === 'bots' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">Play with Bots</div>
                <div className="text-[11px] font-normal text-slate-400 mt-0.5">Human vs AI bots</div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Total Number of Players */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Total Players</span>
            </div>
            <span className="text-xs text-slate-400">Total table seats</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[2, 3, 4].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handlePlayerCountChange(num)}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer flex flex-col items-center gap-1 ${
                  playerCount === num
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

        {/* 3. Number of Bots (Shown when Play with Bots is active or customizable) */}
        {gameMode === 'bots' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Number of AI Bots</span>
              </div>
              <span className="text-xs text-slate-400">
                {humanCount} Human{humanCount > 1 ? 's' : ''} + {effectiveBotCount} Bot
                {effectiveBotCount > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {Array.from({ length: maxBotsAllowed + 1 }, (_, i) => i).map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleBotCountChange(num)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer flex flex-col items-center gap-0.5 ${
                    effectiveBotCount === num
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-2 ring-cyan-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <span className="text-base">{num}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {num === 0 ? '0 (Off)' : `${num} Bot${num > 1 ? 's' : ''}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Bot Difficulty Selector (Shown if at least 1 bot is active) */}
        {effectiveBotCount > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Bot Difficulty</span>
              </div>
              <span className="text-xs text-slate-400">AI strategic decision model</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(['easy', 'medium', 'hard'] as BotDifficulty[]).map(lvl => {
                const isSelected = difficulty === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`p-3 rounded-xl font-bold text-left transition-all duration-150 cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    <div className="text-sm capitalize font-bold">{lvl}</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-1 line-clamp-2">
                      {DIFFICULTY_CONFIGS[lvl].description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Player Details & Colors */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Player Details & Colors</h3>
            <span className="text-xs text-slate-400">
              {humanCount} Human{humanCount > 1 ? 's' : ''}
              {effectiveBotCount > 0 && ` • ${effectiveBotCount} Bot${effectiveBotCount > 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="space-y-3.5">
            {playersConfig.slice(0, playerCount).map((player, idx) => {
              const isBot = idx >= humanCount;
              const selectedColor =
                PRESET_COLORS.find(c => c.id === player.colorId) || PRESET_COLORS[idx];

              return (
                <div
                  key={player.id}
                  className={`border rounded-xl p-3.5 space-y-3 transition-colors ${
                    isBot
                      ? 'bg-slate-800/60 border-indigo-500/30'
                      : 'bg-slate-800/40 border-slate-700/50'
                  }`}
                >
                  {/* Name Input + Identity Tag */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-md"
                      style={{ backgroundColor: selectedColor.hex }}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={18}
                        value={player.name}
                        onChange={e => handleNameChange(idx, e.target.value)}
                        placeholder={isBot ? `Bot ${idx - humanCount + 1}` : `Player ${idx + 1} Name`}
                        className="flex-1 bg-slate-900/90 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      />

                      {/* Type Badge */}
                      {isBot ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Bot className="w-3.5 h-3.5" />
                          <span>BOT</span>
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/40">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Human</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Color Palette Selector */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1.5">
                      Choose Color:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(color => {
                        const isChosenByMe = player.colorId === color.id;
                        const isChosenByOther = playersConfig
                          .slice(0, playerCount)
                          .some((p, i) => i !== idx && p.colorId === color.id);

                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => handleColorSelect(idx, color.id)}
                            title={`${color.name}${isChosenByOther ? ' (Will swap)' : ''}`}
                            className={`relative w-8 h-8 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center ${
                              isChosenByMe
                                ? 'scale-110 ring-2 ring-white shadow-lg'
                                : 'opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                            style={{
                              backgroundColor: color.hex,
                              boxShadow: isChosenByMe ? `0 0 10px ${color.hex}` : undefined,
                            }}
                          >
                            {isChosenByMe && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Pyramid Board Size */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Pyramid Board Size</h3>
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              {pyramidSize} Rows (Bottom Row)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-between">
            {PYRAMID_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setPyramidSize(size)}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  pyramidSize === size
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400 scale-105'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs text-slate-400">
            <span>
              <strong className="text-slate-200">{pyramidSize}</strong> circles in bottom row
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span>
              <strong className="text-amber-400">{totalCircles}</strong> total circles
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span>~{Math.round(totalCircles * 0.15)} min game</span>
          </div>
        </div>

        {/* 7. Setup Summary Card (Section 27) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            Match Summary
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Total Players</span>
              <strong className="text-white text-sm">{playerCount}</strong>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Composition</span>
              <strong className="text-white text-sm">
                {humanCount} Human{humanCount > 1 ? 's' : ''}, {effectiveBotCount} Bot{effectiveBotCount !== 1 ? 's' : ''}
              </strong>
            </div>
            {effectiveBotCount > 0 ? (
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[11px]">Difficulty</span>
                <strong className="text-amber-400 text-sm capitalize">{difficulty}</strong>
              </div>
            ) : (
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[11px]">Mode</span>
                <strong className="text-indigo-300 text-sm">Local Pass & Play</strong>
              </div>
            )}
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Pyramid</span>
              <strong className="text-white text-sm">{pyramidSize} Rows ({totalCircles} Circles)</strong>
            </div>
          </div>

          {/* Player roster preview */}
          <div className="pt-2 border-t border-white/5">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Player Turn Order:</div>
            <div className="flex flex-wrap gap-2">
              {playersConfig.slice(0, playerCount).map((p, idx) => {
                const isBot = idx >= humanCount;
                const col = PRESET_COLORS.find(c => c.id === p.colorId) || PRESET_COLORS[idx];
                return (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/10 text-xs text-white"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="font-semibold">{p.name || `P${idx + 1}`}</span>
                    {isBot ? (
                      <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/20 px-1 rounded">
                        🤖 Bot
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Human</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start Game Action */}
        <Button
          variant="accent"
          size="xl"
          className="w-full shadow-2xl"
          icon={<Play className="w-5 h-5 fill-current" />}
          onClick={handleStart}
        >
          Start Game
        </Button>
      </div>
    </div>
  );
};
