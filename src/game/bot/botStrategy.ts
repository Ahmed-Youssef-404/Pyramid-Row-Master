import { GameState, Player } from '../../types/game';
import { evaluateMove, MoveEvaluation } from './evaluateMove';

/**
 * Chooses the best cell for the bot to claim based on board state and difficulty level.
 */
export function chooseBotMove(gameState: GameState, botPlayer: Player): string | null {
  // 1. Gather all unclaimed cells
  const unclaimedCellIds = Object.keys(gameState.cells).filter(
    id => gameState.cells[id]?.ownerId === null
  );

  if (unclaimedCellIds.length === 0) {
    return null;
  }

  const difficulty = botPlayer.difficulty || 'medium';

  // 2. Evaluate all unclaimed cells
  const evaluations: MoveEvaluation[] = unclaimedCellIds.map(cellId =>
    evaluateMove(cellId, gameState, botPlayer.id, difficulty)
  );

  // Group moves that immediately score points
  const scoringMoves = evaluations.filter(e => e.immediatePoints > 0);
  // Sort scoring moves by points descending, then by combo count descending
  scoringMoves.sort((a, b) => {
    if (b.immediatePoints !== a.immediatePoints) {
      return b.immediatePoints - a.immediatePoints;
    }
    return b.completedLinesCount - a.completedLinesCount;
  });

  // ================= EASY DIFFICULTY =================
  if (difficulty === 'easy') {
    // 55% chance: Pick a completely random unclaimed circle
    // 45% chance: If there's an immediate scoring opportunity, pick it; otherwise random
    const wantsScoring = Math.random() < 0.45;
    if (wantsScoring && scoringMoves.length > 0) {
      // Pick one of the top scoring moves
      const topScorers = scoringMoves.filter(
        m => m.immediatePoints >= scoringMoves[0].immediatePoints - 1
      );
      return topScorers[Math.floor(Math.random() * topScorers.length)].cellId;
    }

    // Otherwise random move
    const randomIndex = Math.floor(Math.random() * unclaimedCellIds.length);
    return unclaimedCellIds[randomIndex];
  }

  // ================= MEDIUM DIFFICULTY =================
  if (difficulty === 'medium') {
    // If scoring moves exist, 92% of the time pick one of the best scoring moves
    if (scoringMoves.length > 0 && Math.random() < 0.92) {
      const bestScore = scoringMoves[0].immediatePoints;
      // Pick among moves with max or near-max score
      const candidateMoves = scoringMoves.filter(m => m.immediatePoints >= bestScore);
      return candidateMoves[Math.floor(Math.random() * candidateMoves.length)].cellId;
    }

    // If no immediate scoring move, sort all evaluations by tactical totalScore
    evaluations.sort((a, b) => b.totalScore - a.totalScore);

    // Pick among top 3 tactical moves to prevent rigid predictability
    const topCandidates = evaluations.slice(0, Math.min(3, evaluations.length));
    return topCandidates[Math.floor(Math.random() * topCandidates.length)].cellId;
  }

  // ================= HARD DIFFICULTY =================
  // 1. If any moves immediately score points, ALWAYS take one of the highest scoring moves!
  if (scoringMoves.length > 0) {
    const maxPoints = scoringMoves[0].immediatePoints;
    // Keep moves that match the highest score
    const bestScoringMoves = scoringMoves.filter(m => m.immediatePoints === maxPoints);

    // If multiple moves share the same highest score, pick the one with highest totalScore (e.g. combo or best positioning)
    bestScoringMoves.sort((a, b) => b.totalScore - a.totalScore);
    const topTier = bestScoringMoves.filter(m => m.totalScore >= bestScoringMoves[0].totalScore - 10);
    return topTier[Math.floor(Math.random() * topTier.length)].cellId;
  }

  // 2. If no immediate scoring moves exist, sort by deep tactical score
  evaluations.sort((a, b) => b.totalScore - a.totalScore);

  const bestScore = evaluations[0].totalScore;
  // Consider moves within 5 points of the best score
  const topEvaluations = evaluations.filter(e => e.totalScore >= bestScore - 5);

  return topEvaluations[Math.floor(Math.random() * topEvaluations.length)].cellId;
}
