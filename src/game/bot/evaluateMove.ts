import { BotDifficulty, GameState, ScoringLine } from '../../types/game';
import { getLineIdsForCell } from '../lines';

export interface MoveEvaluation {
  cellId: string;
  immediatePoints: number;
  completedLinesCount: number;
  completedLines: ScoringLine[];
  hazardLinesCreated: number; // Lines left with exactly 1 unclaimed circle (easy score for next player)
  totalScore: number;
}

/**
 * Evaluates the strategic value of claiming a specific circle on the board.
 */
export function evaluateMove(
  cellId: string,
  gameState: GameState,
  botPlayerId: string,
  difficulty: BotDifficulty = 'medium'
): MoveEvaluation {
  const cell = gameState.cells[cellId];
  if (!cell || cell.ownerId !== null) {
    return {
      cellId,
      immediatePoints: 0,
      completedLinesCount: 0,
      completedLines: [],
      hazardLinesCreated: 0,
      totalScore: -Infinity,
    };
  }

  // Identify lines that pass through this cell
  const lineIds = getLineIdsForCell(cell.row, cell.col);
  const relevantLineIdSet = new Set([
    lineIds.horizontalId,
    lineIds.diagonalLeftId,
    lineIds.diagonalRightId,
  ]);

  const activeLines = gameState.scoringLines.filter(
    line => line.completedBy === null && line.cellIds.length >= 2 && relevantLineIdSet.has(line.id)
  );

  let immediatePoints = 0;
  const completedLines: ScoringLine[] = [];
  let hazardLinesCreated = 0;
  let futureProgressionPoints = 0;

  for (const line of activeLines) {
    // Check how many circles in this line are currently unclaimed
    const unclaimedCells = line.cellIds.filter(
      id => id !== cellId && gameState.cells[id]?.ownerId === null
    );

    if (unclaimedCells.length === 0) {
      // Claiming this cell completes this line!
      completedLines.push(line);
      immediatePoints += line.points;
    } else if (unclaimedCells.length === 1) {
      // If we claim this cell, exactly 1 circle will be left in this line!
      // The next player could immediately complete this line and take all points!
      hazardLinesCreated += line.points;
    } else {
      // 2 or more unclaimed circles remaining after our move
      // Safe progression toward line completion
      futureProgressionPoints += Math.max(1, line.points * 0.3);
    }
  }

  const completedLinesCount = completedLines.length;

  let totalScore = 0;

  if (difficulty === 'hard') {
    // Hard AI: Highly tactical, prioritizes immediate points & combos, avoids gifting lines to opponents
    const comboBonus = completedLinesCount > 1 ? completedLinesCount * 75 : 0;
    const immediateBonus = immediatePoints * 100;
    const hazardPenalty = hazardLinesCreated * 40;
    const multiLineIntersectionBonus = activeLines.length * 6;

    totalScore =
      immediateBonus +
      comboBonus +
      multiLineIntersectionBonus +
      futureProgressionPoints -
      hazardPenalty;
  } else if (difficulty === 'medium') {
    // Medium AI: Strong scoring focus, basic hazard awareness
    const comboBonus = completedLinesCount > 1 ? completedLinesCount * 40 : 0;
    const immediateBonus = immediatePoints * 80;
    const hazardPenalty = hazardLinesCreated * 15;
    const multiLineIntersectionBonus = activeLines.length * 4;

    totalScore =
      immediateBonus +
      comboBonus +
      multiLineIntersectionBonus +
      futureProgressionPoints * 0.5 -
      hazardPenalty;
  } else {
    // Easy AI: Modest weight on points, heavy randomness
    totalScore = immediatePoints * 30 + activeLines.length * 5;
  }

  return {
    cellId,
    immediatePoints,
    completedLinesCount,
    completedLines,
    hazardLinesCreated,
    totalScore,
  };
}
