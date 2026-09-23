import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cell, GameState, Player, ScoringLine } from '../../types/game';
import { getCellId } from '../../game/board';
import { sounds } from '../../game/sound';

interface PyramidBoardProps {
  gameState: GameState;
  onClaimCell: (cellId: string) => void;
  disabled?: boolean;
}

export const PyramidBoard: React.FC<PyramidBoardProps> = ({
  gameState,
  onClaimCell,
  disabled = false,
}) => {
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);

  const { pyramidSize, cells, players, currentPlayerIndex, scoringLines, lastMove } =
    gameState;
  const currentPlayer = players[currentPlayerIndex];

  // Player lookup map
  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach(p => map.set(p.id, p));
    return map;
  }, [players]);

  // Geometric scale calculations
  const {
    spacing,
    dy,
    circleRadius,
    touchTargetRadius,
    width,
    height,
    paddingTop,
  } = useMemo(() => {
    // Dynamic spacing tuned to pyramidSize
    const sp = Math.max(36, Math.min(64, 580 / (pyramidSize + 0.8)));
    const deltaY = sp * 0.866025; // Equilateral height
    const rad = Math.max(12, Math.min(22, sp * 0.38));
    const touchRad = Math.max(22, sp * 0.48);

    const totalW = (pyramidSize - 1) * sp + rad * 2 + 80;
    const totalH = (pyramidSize - 1) * deltaY + rad * 2 + 80;
    const padY = 40 + rad;

    return {
      spacing: sp,
      dy: deltaY,
      circleRadius: rad,
      touchTargetRadius: touchRad,
      width: totalW,
      height: totalH,
      paddingTop: padY,
    };
  }, [pyramidSize]);

  // Position resolver for (row, col)
  const getCellCenter = (row: number, col: number) => {
    const cx = width / 2 + (col - row / 2) * spacing;
    const cy = paddingTop + row * dy;
    return { cx, cy };
  };

  // Completed lines geometry for glowing connections
  const completedLinesData = useMemo(() => {
    return scoringLines
      .filter(line => line.completedBy !== null)
      .map(line => {
        const player = line.completedBy ? playerMap.get(line.completedBy) : null;
        const colorHex = player ? player.colorHex : '#6366f1';
        const isRecent =
          lastMove?.linesCompleted?.some(recentLine => recentLine.id === line.id) ?? false;

        // Determine start and end points for the line
        let startR = 0,
          startC = 0,
          endR = 0,
          endC = 0;

        if (line.type === 'horizontal') {
          const r = parseInt(line.id.replace('h_', ''), 10);
          startR = r;
          startC = 0;
          endR = r;
          endC = r;
        } else if (line.type === 'diagonal-left') {
          const c = parseInt(line.id.replace('dl_', ''), 10);
          startR = c;
          startC = c;
          endR = pyramidSize - 1;
          endC = c;
        } else if (line.type === 'diagonal-right') {
          const k = parseInt(line.id.replace('dr_', ''), 10);
          startR = k;
          startC = 0;
          endR = pyramidSize - 1;
          endC = pyramidSize - 1 - k;
        }

        const p1 = getCellCenter(startR, startC);
        const p2 = getCellCenter(endR, endC);

        return {
          id: line.id,
          type: line.type,
          x1: p1.cx,
          y1: p1.cy,
          x2: p2.cx,
          y2: p2.cy,
          colorHex,
          isRecent,
          points: line.points,
        };
      });
  }, [scoringLines, playerMap, lastMove, pyramidSize, width, paddingTop, spacing, dy]);

  const handleCellClick = (cell: Cell) => {
    if (disabled || gameState.status !== 'playing' || cell.ownerId !== null) {
      return;
    }
    onClaimCell(cell.id);
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none py-2">
      {/* Floating score / multi-row celebration banner */}
      <AnimatePresence>
        {lastMove && lastMove.pointsEarned > 0 && (
          <motion.div
            key={`score-${lastMove.cellId}-${lastMove.pointsEarned}-${gameState.turnNumber}`}
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -45, scale: 0.9 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute top-2 z-20 pointer-events-none flex flex-col items-center"
          >
            <div
              className="px-5 py-2.5 rounded-2xl font-black tracking-wider text-white shadow-2xl flex items-center gap-3 backdrop-blur-md border border-white/30"
              style={{
                backgroundColor: playerMap.get(lastMove.playerId)?.colorHex || '#6366f1',
                boxShadow: `0 10px 30px ${
                  playerMap.get(lastMove.playerId)?.colorHex || '#6366f1'
                }80`,
              }}
            >
              <span className="text-2xl font-black">+{lastMove.pointsEarned} POINTS</span>
              <span className="text-xs uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-lg font-bold">
                {lastMove.linesCompleted.length > 1
                  ? `${lastMove.linesCompleted.length} LINES COMPLETED`
                  : 'LINE COMPLETED'}
              </span>
            </div>

            {/* Breakdown for multiple completed lines */}
            {lastMove.linesCompleted.length > 1 && (
              <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 text-[11px] font-bold text-white drop-shadow">
                {lastMove.linesCompleted.map(l => (
                  <span
                    key={l.id}
                    className="bg-black/60 px-2 py-0.5 rounded-md border border-white/20 backdrop-blur-sm"
                  >
                    {l.type === 'horizontal' ? 'Horizontal' : 'Diagonal'} +{l.points}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Board Canvas */}
      <div className="w-full max-w-[680px] max-h-[64vh] flex items-center justify-center overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto drop-shadow-xl overflow-visible"
          style={{ maxHeight: '62vh' }}
        >
          <defs>
            {/* Ambient drop shadow filter */}
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
            </filter>

            {/* Glowing lines filter with userSpaceOnUse so horizontal (zero delta-Y) lines glow identically to diagonals */}
            <filter
              id="neon-glow"
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={width}
              height={height}
            >
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
 
            {/* Radial gradient for unclaimed cells */}
            <radialGradient id="unclaimed-grad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Background Grid Guide / Subtle Triangle Outline */}
          <polygon
            points={`${width / 2},${paddingTop - circleRadius} ${
              width / 2 - ((pyramidSize - 1) / 2) * spacing - circleRadius
            },${paddingTop + (pyramidSize - 1) * dy + circleRadius} ${
              width / 2 + ((pyramidSize - 1) / 2) * spacing + circleRadius
            },${paddingTop + (pyramidSize - 1) * dy + circleRadius}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Completed Scoring Lines Overlay: identical player-colored styling and glow for horizontal and diagonal lines */}
          <g className="completed-lines">
            {completedLinesData.map(line => (
              <g key={line.id} className="transition-opacity duration-300">
                {/* 1. Wide diffuse glow aura in player's color */}
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.colorHex}
                  strokeWidth={line.isRecent ? 12 : 8}
                  strokeOpacity={line.isRecent ? 0.7 : 0.45}
                  strokeLinecap="round"
                  filter="url(#neon-glow)"
                  style={{
                    filter: `drop-shadow(0 0 ${line.isRecent ? 8 : 4}px ${line.colorHex})`,
                  }}
                />
                {/* 2. Intense mid stroke in player's color */}
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.colorHex}
                  strokeWidth={line.isRecent ? 6 : 4}
                  strokeOpacity={line.isRecent ? 0.9 : 0.75}
                  strokeLinecap="round"
                />
                {/* 3. Crisp core stroke in player's color */}
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.colorHex}
                  strokeWidth={line.isRecent ? 3 : 2}
                  strokeOpacity={1}
                  strokeLinecap="round"
                />
              </g>
            ))}
          </g>

          {/* Interactive Pyramid Circles */}
          <g className="pyramid-cells">
            {Object.values(cells).map(cell => {
              const { cx, cy } = getCellCenter(cell.row, cell.col);
              const isClaimed = cell.ownerId !== null;
              const owner = isClaimed ? playerMap.get(cell.ownerId!) : null;
              const isHovered = hoveredCellId === cell.id;
              const isLastMove = lastMove?.cellId === cell.id;

              return (
                <g
                  key={cell.id}
                  id={cell.id}
                  transform={`translate(${cx}, ${cy})`}
                  tabIndex={!isClaimed && !disabled ? 0 : -1}
                  role="button"
                  aria-label={`Row ${cell.row + 1}, Circle ${cell.col + 1}${
                    isClaimed ? `, Claimed by ${owner?.name}` : ', Unclaimed'
                  }`}
                  aria-disabled={isClaimed || disabled}
                  onClick={() => handleCellClick(cell)}
                  onMouseEnter={() => !isClaimed && setHoveredCellId(cell.id)}
                  onMouseLeave={() => setHoveredCellId(null)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isClaimed) {
                      e.preventDefault();
                      handleCellClick(cell);
                    }
                  }}
                  className={`outline-none ${
                    !isClaimed && !disabled ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Invisible generous touch target (at least 44px) */}
                  <circle
                    cx={0}
                    cy={0}
                    r={touchTargetRadius}
                    fill="transparent"
                  />

                  {/* Centered Scale Animation on Claim (1 -> 1.12 -> 1, 200ms) */}
                  <motion.g
                    key={isClaimed ? `claimed-${cell.claimedAtTurn}` : 'unclaimed'}
                    animate={isLastMove ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ transformOrigin: '0px 0px' }}
                  >
                    {/* Cell outer ring / shadow */}
                    <circle
                      cx={0}
                      cy={0}
                      r={circleRadius + 1}
                      fill="none"
                      stroke={
                        isClaimed
                          ? owner?.colorHex || '#6366f1'
                          : isHovered
                          ? currentPlayer?.colorHex || '#94a3b8'
                          : 'rgba(255, 255, 255, 0.12)'
                      }
                      strokeWidth={isClaimed ? 2.5 : isHovered ? 2 : 1}
                      opacity={isHovered ? 0.9 : 0.75}
                    />

                    {/* Main Circle Body */}
                    <circle
                      cx={0}
                      cy={0}
                      r={circleRadius}
                      fill={
                        isClaimed
                          ? owner?.colorHex || '#6366f1'
                          : isHovered
                          ? `${currentPlayer?.colorHex}40`
                          : 'url(#unclaimed-grad)'
                      }
                      className="transition-colors duration-200"
                      filter={isClaimed || isHovered ? 'url(#glow-filter)' : undefined}
                    />

                    {/* Specular highlight gloss */}
                    {isClaimed && (
                      <ellipse
                        cx={-circleRadius * 0.25}
                        cy={-circleRadius * 0.3}
                        rx={circleRadius * 0.45}
                        ry={circleRadius * 0.28}
                        fill="rgba(255, 255, 255, 0.45)"
                      />
                    )}

                    {/* Inner glyph / Dot indicator for colorblind accessibility & aesthetic */}
                    {isClaimed ? (
                      <text
                        x={0}
                        y={circleRadius * 0.34}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={Math.max(10, circleRadius * 0.75)}
                        fontWeight="bold"
                        className="pointer-events-none select-none font-sans"
                      >
                        {owner?.name ? owner.name.charAt(0).toUpperCase() : '•'}
                      </text>
                    ) : (
                      <circle
                        cx={0}
                        cy={0}
                        r={Math.max(2, circleRadius * 0.18)}
                        fill={
                          isHovered
                            ? currentPlayer?.colorHex || '#ffffff'
                            : 'rgba(255, 255, 255, 0.2)'
                        }
                      />
                    )}
                  </motion.g>

                  {/* Last Move Ring Indicator */}
                  {isLastMove && (
                    <circle
                      cx={0}
                      cy={0}
                      r={circleRadius + 5}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      className="animate-spin pointer-events-none"
                      style={{ transformOrigin: '0px 0px', animationDuration: '4s' }}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
