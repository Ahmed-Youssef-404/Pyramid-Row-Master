import { Cell } from '../types/game';

export function getCellId(row: number, col: number): string {
  return `cell_${row}_${col}`;
}

export function parseCellId(id: string): { row: number; col: number } {
  const parts = id.split('_');
  return {
    row: parseInt(parts[1], 10),
    col: parseInt(parts[2], 10),
  };
}

export function getTotalCirclesForSize(pyramidSize: number): number {
  return (pyramidSize * (pyramidSize + 1)) / 2;
}

export function generatePyramidCells(pyramidSize: number): Record<string, Cell> {
  const cells: Record<string, Cell> = {};

  for (let r = 0; r < pyramidSize; r++) {
    for (let c = 0; c <= r; c++) {
      const id = getCellId(r, c);
      cells[id] = {
        id,
        row: r,
        col: c,
        ownerId: null,
        claimedAtTurn: null,
      };
    }
  }

  return cells;
}
