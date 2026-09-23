import { GameSettings, GameState, PlayerStats } from '../types/game';

const ACTIVE_GAME_KEY = 'pyramid_row_master_active_game_v1';
const SETTINGS_KEY = 'pyramid_row_master_settings_v1';
const RANKINGS_KEY = 'pyramid_row_master_rankings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  animationsEnabled: true,
  theme: 'cosmic',
  confirmBeforeLeaving: true,
};

// Safe wrapper for localStorage access
function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// ================= Active Game =================

export function saveActiveGame(state: GameState): void {
  if (!isStorageAvailable()) return;
  try {
    if (state.status === 'finished') {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    } else {
      localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.warn('Failed to save active game to localStorage', e);
  }
}

export function loadActiveGame(): GameState | null {
  if (!isStorageAvailable()) return null;
  try {
    const data = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as GameState;
    // Validate core properties to guard against corrupted storage
    if (
      parsed &&
      Array.isArray(parsed.players) &&
      parsed.players.length >= 2 &&
      typeof parsed.pyramidSize === 'number' &&
      parsed.cells &&
      parsed.status === 'playing'
    ) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.warn('Failed to parse active game from localStorage', e);
    return null;
  }
}

export function clearActiveGame(): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch {
    // Ignored
  }
}

// ================= Settings =================

export function loadSettings(): GameSettings {
  if (!isStorageAvailable()) return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignored
  }
}

// ================= Rankings =================

export function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

export function loadRankings(): PlayerStats[] {
  if (!isStorageAvailable()) return [];
  try {
    const data = localStorage.getItem(RANKINGS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveRankings(rankings: PlayerStats[]): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(RANKINGS_KEY, JSON.stringify(rankings));
  } catch {
    // Ignored
  }
}

export function clearRankings(): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(RANKINGS_KEY);
  } catch {
    // Ignored
  }
}

export function clearAllGameData(): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY);
    localStorage.removeItem(RANKINGS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // Ignored
  }
}

export function recordGameResults(gameState: GameState): void {
  if (gameState.status !== 'finished') return;

  const currentRankings = loadRankings();
  const statsMap = new Map<string, PlayerStats>();

  currentRankings.forEach(stat => {
    statsMap.set(stat.normalizedName, stat);
  });

  const now = Date.now();

  gameState.players.forEach(player => {
    // Bots are excluded from persistent player rankings (Section 24)
    if (player.isBot) return;

    const norm = normalizePlayerName(player.name);
    const existing = statsMap.get(norm);
    const score = gameState.scores[player.id] || 0;
    const rows = gameState.rowsCompletedCount[player.id] || 0;
    const circles = gameState.circlesClaimedCount[player.id] || 0;
    const isWin = !gameState.isTie && gameState.winnerId === player.id;

    if (existing) {
      existing.displayName = player.name; // Keep latest display casing
      existing.colorHex = player.colorHex;
      existing.totalWins += isWin ? 1 : 0;
      existing.totalGames += 1;
      existing.totalPoints += score;
      existing.highestScore = Math.max(existing.highestScore, score);
      existing.totalRowsCompleted += rows;
      existing.totalCirclesClaimed += circles;
      existing.lastPlayedAt = now;
    } else {
      statsMap.set(norm, {
        normalizedName: norm,
        displayName: player.name,
        colorHex: player.colorHex,
        totalWins: isWin ? 1 : 0,
        totalGames: 1,
        totalPoints: score,
        highestScore: score,
        totalRowsCompleted: rows,
        totalCirclesClaimed: circles,
        lastPlayedAt: now,
      });
    }
  });

  saveRankings(Array.from(statsMap.values()));
}
