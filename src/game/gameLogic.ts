import { Cell, GameState, MoveResult, Player, ScoringLine } from '../types/game';
import { generatePyramidCells, getTotalCirclesForSize } from './board';
import { generateAllScoringLines, getLineIdsForCell } from './lines';

export function createNewGame(players: Player[], pyramidSize: number): GameState {
  const cells = generatePyramidCells(pyramidSize);
  const scoringLines = generateAllScoringLines(pyramidSize);

  const scores: Record<string, number> = {};
  const rowsCompletedCount: Record<string, number> = {};
  const circlesClaimedCount: Record<string, number> = {};

  players.forEach(p => {
    scores[p.id] = 0;
    rowsCompletedCount[p.id] = 0;
    circlesClaimedCount[p.id] = 0;
  });

  return {
    pyramidSize,
    players,
    currentPlayerIndex: 0,
    turnNumber: 1,
    cells,
    scoringLines,
    scores,
    rowsCompletedCount,
    circlesClaimedCount,
    status: 'playing',
    winnerId: null,
    isTie: false,
    tiedPlayerIds: [],
    startedAt: Date.now(),
    finishedAt: null,
    lastMove: null,
  };
}

export function executeMove(
  state: GameState,
  cellId: string
): { nextState: GameState; result: MoveResult } | null {
  // Safety checks
  if (state.status !== 'playing') {
    return null;
  }

  const targetCell = state.cells[cellId];
  if (!targetCell || targetCell.ownerId !== null) {
    return null; // Already claimed or invalid
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) {
    return null;
  }

  // 1. Clone cells & claim
  const nextCells: Record<string, Cell> = {
    ...state.cells,
    [cellId]: {
      ...targetCell,
      ownerId: currentPlayer.id,
      claimedAtTurn: state.turnNumber,
    },
  };

  // 2. Identify candidate lines for this cell
  const lineIds = getLineIdsForCell(targetCell.row, targetCell.col);
  const candidateIds = new Set([lineIds.horizontalId, lineIds.diagonalLeftId, lineIds.diagonalRightId]);

  const newlyCompletedLines: ScoringLine[] = [];
  let pointsEarned = 0;

  // 3. Check line completions (only lines not previously completed and with at least 2 circles)
  const nextScoringLines = state.scoringLines.map(line => {
    if (line.completedBy !== null || !candidateIds.has(line.id) || line.cellIds.length < 2) {
      return line;
    }

    // Check if every circle in this line is claimed by ANY player
    const isComplete = line.cellIds.every(cId => {
      const c = nextCells[cId];
      return c && c.ownerId !== null;
    });

    if (isComplete) {
      const completedLine: ScoringLine = {
        ...line,
        completedBy: currentPlayer.id,
        completedAtTurn: state.turnNumber,
      };
      newlyCompletedLines.push(completedLine);
      pointsEarned += line.points;
      return completedLine;
    }

    return line;
  });

  // 4. Update scores & stats
  const nextScores: Record<string, number> = {
    ...state.scores,
    [currentPlayer.id]: (state.scores[currentPlayer.id] || 0) + pointsEarned,
  };

  const nextRowsCompletedCount: Record<string, number> = {
    ...state.rowsCompletedCount,
    [currentPlayer.id]:
      (state.rowsCompletedCount[currentPlayer.id] || 0) + newlyCompletedLines.length,
  };

  const nextCirclesClaimedCount: Record<string, number> = {
    ...state.circlesClaimedCount,
    [currentPlayer.id]: (state.circlesClaimedCount[currentPlayer.id] || 0) + 1,
  };

  // 5. Check if game is over (all cells claimed)
  const totalCircles = getTotalCirclesForSize(state.pyramidSize);
  const totalClaimed = Object.values(nextCells).filter(c => c.ownerId !== null).length;
  const isGameOver = totalClaimed >= totalCircles;

  let winnerId: string | null = null;
  let isTie = false;
  let tiedPlayerIds: string[] = [];

  if (isGameOver) {
    let maxScore = -1;
    state.players.forEach(p => {
      const score = nextScores[p.id] ?? 0;
      if (score > maxScore) {
        maxScore = score;
        tiedPlayerIds = [p.id];
      } else if (score === maxScore) {
        tiedPlayerIds.push(p.id);
      }
    });

    if (tiedPlayerIds.length === 1) {
      winnerId = tiedPlayerIds[0];
      isTie = false;
    } else {
      winnerId = null;
      isTie = true;
    }
  }

  // 6. Next turn
  const nextPlayerIndex = isGameOver
    ? state.currentPlayerIndex
    : (state.currentPlayerIndex + 1) % state.players.length;

  const nextTurnNumber = isGameOver ? state.turnNumber : state.turnNumber + 1;

  const nextState: GameState = {
    ...state,
    cells: nextCells,
    scoringLines: nextScoringLines,
    scores: nextScores,
    rowsCompletedCount: nextRowsCompletedCount,
    circlesClaimedCount: nextCirclesClaimedCount,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: nextTurnNumber,
    status: isGameOver ? 'finished' : 'playing',
    winnerId,
    isTie,
    tiedPlayerIds,
    finishedAt: isGameOver ? Date.now() : null,
    lastMove: {
      cellId,
      playerId: currentPlayer.id,
      pointsEarned,
      linesCompleted: newlyCompletedLines,
    },
  };

  const result: MoveResult = {
    cellId,
    playerId: currentPlayer.id,
    completedLines: newlyCompletedLines,
    pointsEarned,
    isGameOver,
    winnerId,
    isTie,
    tiedPlayerIds,
  };

  return { nextState, result };
}
