import { ScoringLine } from '../types/game';
import { getCellId } from './board';

/**
 * Generates all valid scoring lines for a pyramid board of size N.
 * In an equilateral triangular pyramid, there are exactly three directions of lines:
 * 1. Horizontal rows (parallel to base): N lines of length 1, 2, ..., N
 * 2. Diagonal down-left (parallel to left edge): N lines of length N, N-1, ..., 1
 * 3. Diagonal down-right (parallel to right edge): N lines of length N, N-1, ..., 1
 *
 * Total lines = 3 * N
 * Every cell belongs to exactly 1 line of each direction.
 */
export function generateAllScoringLines(pyramidSize: number): ScoringLine[] {
  const lines: ScoringLine[] = [];

  // 1. Horizontal lines (skip r = 0 because single-circle top row is not a scoring line; min length is 2)
  for (let r = 1; r < pyramidSize; r++) {
    const cellIds: string[] = [];
    for (let c = 0; c <= r; c++) {
      cellIds.push(getCellId(r, c));
    }
    const points = r + 1;
    lines.push({
      id: `h_${r}`,
      type: 'horizontal',
      label: `Horizontal Row ${r + 1} (${points} pts)`,
      cellIds,
      points,
      completedBy: null,
      completedAtTurn: null,
    });
  }

  // 2. Diagonal down-left lines (skip c = pyramidSize - 1 because it has only 1 circle; min length is 2)
  for (let c = 0; c < pyramidSize - 1; c++) {
    const cellIds: string[] = [];
    for (let r = c; r < pyramidSize; r++) {
      cellIds.push(getCellId(r, c));
    }
    const points = pyramidSize - c;
    lines.push({
      id: `dl_${c}`,
      type: 'diagonal-left',
      label: `Diagonal ↙ (${points} pts)`,
      cellIds,
      points,
      completedBy: null,
      completedAtTurn: null,
    });
  }

  // 3. Diagonal down-right lines (skip k = pyramidSize - 1 because it has only 1 circle; min length is 2)
  for (let k = 0; k < pyramidSize - 1; k++) {
    const cellIds: string[] = [];
    for (let c = 0; c < pyramidSize - k; c++) {
      const r = k + c;
      cellIds.push(getCellId(r, c));
    }
    const points = pyramidSize - k;
    lines.push({
      id: `dr_${k}`,
      type: 'diagonal-right',
      label: `Diagonal ↘ (${points} pts)`,
      cellIds,
      points,
      completedBy: null,
      completedAtTurn: null,
    });
  }

  return lines;
}

/**
 * Returns the 3 line IDs that pass through the cell (row, col)
 */
export function getLineIdsForCell(row: number, col: number): {
  horizontalId: string;
  diagonalLeftId: string;
  diagonalRightId: string;
} {
  return {
    horizontalId: `h_${row}`,
    diagonalLeftId: `dl_${col}`,
    diagonalRightId: `dr_${row - col}`,
  };
}
