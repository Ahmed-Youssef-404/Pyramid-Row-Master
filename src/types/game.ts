export type LineType = 'horizontal' | 'diagonal-left' | 'diagonal-right';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type PlayerType = 'human' | 'bot';

export interface Player {
  id: string;
  name: string;
  colorId: string;
  colorHex: string;
  colorBorder: string;
  colorGlow: string;
  colorBg: string;
  isBot?: boolean;
  difficulty?: BotDifficulty;
}

export interface Cell {
  id: string;
  row: number;
  col: number;
  ownerId: string | null;
  claimedAtTurn: number | null;
}

export interface ScoringLine {
  id: string;
  type: LineType;
  label: string;
  cellIds: string[];
  points: number;
  completedBy: string | null;
  completedAtTurn: number | null;
}

export interface MoveResult {
  cellId: string;
  playerId: string;
  completedLines: ScoringLine[];
  pointsEarned: number;
  isGameOver: boolean;
  winnerId: string | null;
  isTie: boolean;
  tiedPlayerIds: string[];
}

export interface GameState {
  pyramidSize: number;
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  cells: Record<string, Cell>;
  scoringLines: ScoringLine[];
  scores: Record<string, number>;
  rowsCompletedCount: Record<string, number>;
  circlesClaimedCount: Record<string, number>;
  status: 'playing' | 'finished';
  winnerId: string | null;
  isTie: boolean;
  tiedPlayerIds: string[];
  startedAt: number;
  finishedAt: number | null;
  lastMove: {
    cellId: string;
    playerId: string;
    pointsEarned: number;
    linesCompleted: ScoringLine[];
  } | null;
}

export interface PlayerStats {
  normalizedName: string;
  displayName: string;
  colorHex: string;
  totalWins: number;
  totalGames: number;
  totalPoints: number;
  highestScore: number;
  totalRowsCompleted: number;
  totalCirclesClaimed: number;
  lastPlayedAt: number;
}

export type ThemeMode = 'cosmic' | 'classic';

export interface GameSettings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  theme: ThemeMode;
  confirmBeforeLeaving: boolean;
}
