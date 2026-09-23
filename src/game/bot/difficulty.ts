import { BotDifficulty } from '../../types/game';

export interface DifficultyConfig {
  minDelayMs: number;
  maxDelayMs: number;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<BotDifficulty, DifficultyConfig> = {
  easy: {
    minDelayMs: 550,
    maxDelayMs: 900,
    description: 'Casual moves with occasional strategic plays',
  },
  medium: {
    minDelayMs: 750,
    maxDelayMs: 1200,
    description: 'Balanced tactics, active scoring, and basic blocking',
  },
  hard: {
    minDelayMs: 950,
    maxDelayMs: 1500,
    description: 'Calculates multi-line combos, opponent denials, and traps',
  },
};

/**
 * Returns a natural, slightly randomized thinking delay in milliseconds.
 */
export function getBotThinkingDelay(difficulty: BotDifficulty = 'medium'): number {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.medium;
  const range = config.maxDelayMs - config.minDelayMs;
  return Math.floor(config.minDelayMs + Math.random() * range);
}
