// server.ts
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";

// src/utils/colors.ts
var PRESET_COLORS = [
  {
    id: "blue",
    name: "Electric Blue",
    hex: "#38bdf8",
    // Sky 400
    glow: "rgba(56, 189, 248, 0.65)",
    bgGradient: "from-sky-400 to-blue-600",
    ring: "ring-sky-400",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-300"
  },
  {
    id: "red",
    name: "Crimson Flame",
    hex: "#f43f5e",
    // Rose 500
    glow: "rgba(244, 63, 94, 0.65)",
    bgGradient: "from-rose-400 to-red-600",
    ring: "ring-rose-500",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300"
  },
  {
    id: "green",
    name: "Emerald Green",
    hex: "#10b981",
    // Emerald 500
    glow: "rgba(16, 185, 129, 0.65)",
    bgGradient: "from-emerald-400 to-teal-600",
    ring: "ring-emerald-400",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300"
  },
  {
    id: "purple",
    name: "Neon Violet",
    hex: "#a855f7",
    // Purple 500
    glow: "rgba(168, 85, 247, 0.65)",
    bgGradient: "from-purple-400 to-violet-600",
    ring: "ring-purple-400",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300"
  },
  {
    id: "orange",
    name: "Solar Orange",
    hex: "#f97316",
    // Orange 500
    glow: "rgba(249, 115, 22, 0.65)",
    bgGradient: "from-amber-400 to-orange-600",
    ring: "ring-orange-400",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-300"
  },
  {
    id: "pink",
    name: "Magenta Pulse",
    hex: "#ec4899",
    // Pink 500
    glow: "rgba(236, 72, 153, 0.65)",
    bgGradient: "from-pink-400 to-rose-600",
    ring: "ring-pink-400",
    badgeBg: "bg-pink-500/20",
    badgeText: "text-pink-300"
  },
  {
    id: "cyan",
    name: "Cyber Cyan",
    hex: "#06b6d4",
    // Cyan 500
    glow: "rgba(6, 182, 212, 0.65)",
    bgGradient: "from-cyan-400 to-teal-600",
    ring: "ring-cyan-400",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-300"
  },
  {
    id: "yellow",
    name: "Golden Spark",
    hex: "#eab308",
    // Yellow 500
    glow: "rgba(234, 179, 8, 0.65)",
    bgGradient: "from-yellow-300 to-amber-500",
    ring: "ring-yellow-400",
    badgeBg: "bg-yellow-500/20",
    badgeText: "text-yellow-300"
  }
];

// src/game/board.ts
function getCellId(row, col) {
  return `cell_${row}_${col}`;
}
function getTotalCirclesForSize(pyramidSize) {
  return pyramidSize * (pyramidSize + 1) / 2;
}
function generatePyramidCells(pyramidSize) {
  const cells = {};
  for (let r = 0; r < pyramidSize; r++) {
    for (let c = 0; c <= r; c++) {
      const id = getCellId(r, c);
      cells[id] = {
        id,
        row: r,
        col: c,
        ownerId: null,
        claimedAtTurn: null
      };
    }
  }
  return cells;
}

// src/game/lines.ts
function generateAllScoringLines(pyramidSize) {
  const lines = [];
  for (let r = 1; r < pyramidSize; r++) {
    const cellIds = [];
    for (let c = 0; c <= r; c++) {
      cellIds.push(getCellId(r, c));
    }
    const points = r + 1;
    lines.push({
      id: `h_${r}`,
      type: "horizontal",
      label: `Horizontal Row ${r + 1} (${points} pts)`,
      cellIds,
      points,
      completedBy: null,
      completedAtTurn: null
    });
  }
  for (let c = 0; c < pyramidSize - 1; c++) {
    const cellIds = [];
    for (let r = c; r < pyramidSize; r++) {
      cellIds.push(getCellId(r, c));
    }
    const points = pyramidSize - c;
    lines.push({
      id: `dl_${c}`,
      type: "diagonal-left",
      label: `Diagonal \u2199 (${points} pts)`,
      cellIds,
      points,
      completedBy: null,
      completedAtTurn: null
    });
  }
  for (let k = 0; k < pyramidSize - 1; k++) {
    const cellIds = [];
    for (let c = 0; c < pyramidSize - k; c++) {
      const r = k + c;
      cellIds.push(getCellId(r, c));
    }
    const points = pyramidSize - k;
    lines.push({
      id: `dr_${k}`,
      type: "diagonal-right",
      label: `Diagonal \u2198 (${points} pts)`,
      cellIds,
      points,
      completedBy: null,
      completedAtTurn: null
    });
  }
  return lines;
}
function getLineIdsForCell(row, col) {
  return {
    horizontalId: `h_${row}`,
    diagonalLeftId: `dl_${col}`,
    diagonalRightId: `dr_${row - col}`
  };
}

// src/game/gameLogic.ts
function createNewGame(players, pyramidSize) {
  const cells = generatePyramidCells(pyramidSize);
  const scoringLines = generateAllScoringLines(pyramidSize);
  const scores = {};
  const rowsCompletedCount = {};
  const circlesClaimedCount = {};
  players.forEach((p) => {
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
    status: "playing",
    winnerId: null,
    isTie: false,
    tiedPlayerIds: [],
    startedAt: Date.now(),
    finishedAt: null,
    lastMove: null
  };
}
function executeMove(state, cellId) {
  if (state.status !== "playing") {
    return null;
  }
  const targetCell = state.cells[cellId];
  if (!targetCell || targetCell.ownerId !== null) {
    return null;
  }
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) {
    return null;
  }
  const nextCells = {
    ...state.cells,
    [cellId]: {
      ...targetCell,
      ownerId: currentPlayer.id,
      claimedAtTurn: state.turnNumber
    }
  };
  const lineIds = getLineIdsForCell(targetCell.row, targetCell.col);
  const candidateIds = /* @__PURE__ */ new Set([lineIds.horizontalId, lineIds.diagonalLeftId, lineIds.diagonalRightId]);
  const newlyCompletedLines = [];
  let pointsEarned = 0;
  const nextScoringLines = state.scoringLines.map((line) => {
    if (line.completedBy !== null || !candidateIds.has(line.id) || line.cellIds.length < 2) {
      return line;
    }
    const isComplete = line.cellIds.every((cId) => {
      const c = nextCells[cId];
      return c && c.ownerId !== null;
    });
    if (isComplete) {
      const completedLine = {
        ...line,
        completedBy: currentPlayer.id,
        completedAtTurn: state.turnNumber
      };
      newlyCompletedLines.push(completedLine);
      pointsEarned += line.points;
      return completedLine;
    }
    return line;
  });
  const nextScores = {
    ...state.scores,
    [currentPlayer.id]: (state.scores[currentPlayer.id] || 0) + pointsEarned
  };
  const nextRowsCompletedCount = {
    ...state.rowsCompletedCount,
    [currentPlayer.id]: (state.rowsCompletedCount[currentPlayer.id] || 0) + newlyCompletedLines.length
  };
  const nextCirclesClaimedCount = {
    ...state.circlesClaimedCount,
    [currentPlayer.id]: (state.circlesClaimedCount[currentPlayer.id] || 0) + 1
  };
  const totalCircles = getTotalCirclesForSize(state.pyramidSize);
  const totalClaimed = Object.values(nextCells).filter((c) => c.ownerId !== null).length;
  const isGameOver = totalClaimed >= totalCircles;
  let winnerId = null;
  let isTie = false;
  let tiedPlayerIds = [];
  if (isGameOver) {
    let maxScore = -1;
    state.players.forEach((p) => {
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
  const nextPlayerIndex = isGameOver ? state.currentPlayerIndex : (state.currentPlayerIndex + 1) % state.players.length;
  const nextTurnNumber = isGameOver ? state.turnNumber : state.turnNumber + 1;
  const nextState = {
    ...state,
    cells: nextCells,
    scoringLines: nextScoringLines,
    scores: nextScores,
    rowsCompletedCount: nextRowsCompletedCount,
    circlesClaimedCount: nextCirclesClaimedCount,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: nextTurnNumber,
    status: isGameOver ? "finished" : "playing",
    winnerId,
    isTie,
    tiedPlayerIds,
    finishedAt: isGameOver ? Date.now() : null,
    lastMove: {
      cellId,
      playerId: currentPlayer.id,
      pointsEarned,
      linesCompleted: newlyCompletedLines
    }
  };
  const result = {
    cellId,
    playerId: currentPlayer.id,
    completedLines: newlyCompletedLines,
    pointsEarned,
    isGameOver,
    winnerId,
    isTie,
    tiedPlayerIds
  };
  return { nextState, result };
}

// src/game/bot/evaluateMove.ts
function evaluateMove(cellId, gameState, botPlayerId, difficulty = "medium") {
  const cell = gameState.cells[cellId];
  if (!cell || cell.ownerId !== null) {
    return {
      cellId,
      immediatePoints: 0,
      completedLinesCount: 0,
      completedLines: [],
      hazardLinesCreated: 0,
      totalScore: -Infinity
    };
  }
  const lineIds = getLineIdsForCell(cell.row, cell.col);
  const relevantLineIdSet = /* @__PURE__ */ new Set([
    lineIds.horizontalId,
    lineIds.diagonalLeftId,
    lineIds.diagonalRightId
  ]);
  const activeLines = gameState.scoringLines.filter(
    (line) => line.completedBy === null && line.cellIds.length >= 2 && relevantLineIdSet.has(line.id)
  );
  let immediatePoints = 0;
  const completedLines = [];
  let hazardLinesCreated = 0;
  let futureProgressionPoints = 0;
  for (const line of activeLines) {
    const unclaimedCells = line.cellIds.filter(
      (id) => id !== cellId && gameState.cells[id]?.ownerId === null
    );
    if (unclaimedCells.length === 0) {
      completedLines.push(line);
      immediatePoints += line.points;
    } else if (unclaimedCells.length === 1) {
      hazardLinesCreated += line.points;
    } else {
      futureProgressionPoints += Math.max(1, line.points * 0.3);
    }
  }
  const completedLinesCount = completedLines.length;
  let totalScore = 0;
  if (difficulty === "hard") {
    const comboBonus = completedLinesCount > 1 ? completedLinesCount * 75 : 0;
    const immediateBonus = immediatePoints * 100;
    const hazardPenalty = hazardLinesCreated * 40;
    const multiLineIntersectionBonus = activeLines.length * 6;
    totalScore = immediateBonus + comboBonus + multiLineIntersectionBonus + futureProgressionPoints - hazardPenalty;
  } else if (difficulty === "medium") {
    const comboBonus = completedLinesCount > 1 ? completedLinesCount * 40 : 0;
    const immediateBonus = immediatePoints * 80;
    const hazardPenalty = hazardLinesCreated * 15;
    const multiLineIntersectionBonus = activeLines.length * 4;
    totalScore = immediateBonus + comboBonus + multiLineIntersectionBonus + futureProgressionPoints * 0.5 - hazardPenalty;
  } else {
    totalScore = immediatePoints * 30 + activeLines.length * 5;
  }
  return {
    cellId,
    immediatePoints,
    completedLinesCount,
    completedLines,
    hazardLinesCreated,
    totalScore
  };
}

// src/game/bot/botStrategy.ts
function chooseBotMove(gameState, botPlayer) {
  const unclaimedCellIds = Object.keys(gameState.cells).filter(
    (id) => gameState.cells[id]?.ownerId === null
  );
  if (unclaimedCellIds.length === 0) {
    return null;
  }
  const difficulty = botPlayer.difficulty || "medium";
  const evaluations = unclaimedCellIds.map(
    (cellId) => evaluateMove(cellId, gameState, botPlayer.id, difficulty)
  );
  const scoringMoves = evaluations.filter((e) => e.immediatePoints > 0);
  scoringMoves.sort((a, b) => {
    if (b.immediatePoints !== a.immediatePoints) {
      return b.immediatePoints - a.immediatePoints;
    }
    return b.completedLinesCount - a.completedLinesCount;
  });
  if (difficulty === "easy") {
    const wantsScoring = Math.random() < 0.45;
    if (wantsScoring && scoringMoves.length > 0) {
      const topScorers = scoringMoves.filter(
        (m) => m.immediatePoints >= scoringMoves[0].immediatePoints - 1
      );
      return topScorers[Math.floor(Math.random() * topScorers.length)].cellId;
    }
    const randomIndex = Math.floor(Math.random() * unclaimedCellIds.length);
    return unclaimedCellIds[randomIndex];
  }
  if (difficulty === "medium") {
    if (scoringMoves.length > 0 && Math.random() < 0.92) {
      const bestScore2 = scoringMoves[0].immediatePoints;
      const candidateMoves = scoringMoves.filter((m) => m.immediatePoints >= bestScore2);
      return candidateMoves[Math.floor(Math.random() * candidateMoves.length)].cellId;
    }
    evaluations.sort((a, b) => b.totalScore - a.totalScore);
    const topCandidates = evaluations.slice(0, Math.min(3, evaluations.length));
    return topCandidates[Math.floor(Math.random() * topCandidates.length)].cellId;
  }
  if (scoringMoves.length > 0) {
    const maxPoints = scoringMoves[0].immediatePoints;
    const bestScoringMoves = scoringMoves.filter((m) => m.immediatePoints === maxPoints);
    bestScoringMoves.sort((a, b) => b.totalScore - a.totalScore);
    const topTier = bestScoringMoves.filter((m) => m.totalScore >= bestScoringMoves[0].totalScore - 10);
    return topTier[Math.floor(Math.random() * topTier.length)].cellId;
  }
  evaluations.sort((a, b) => b.totalScore - a.totalScore);
  const bestScore = evaluations[0].totalScore;
  const topEvaluations = evaluations.filter((e) => e.totalScore >= bestScore - 5);
  return topEvaluations[Math.floor(Math.random() * topEvaluations.length)].cellId;
}

// src/game/bot/difficulty.ts
var DIFFICULTY_CONFIGS = {
  easy: {
    minDelayMs: 550,
    maxDelayMs: 900,
    description: "Casual moves with occasional strategic plays"
  },
  medium: {
    minDelayMs: 750,
    maxDelayMs: 1200,
    description: "Balanced tactics, active scoring, and basic blocking"
  },
  hard: {
    minDelayMs: 950,
    maxDelayMs: 1500,
    description: "Calculates multi-line combos, opponent denials, and traps"
  }
};
function getBotThinkingDelay(difficulty = "medium") {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.medium;
  const range = config.maxDelayMs - config.minDelayMs;
  return Math.floor(config.minDelayMs + Math.random() * range);
}

// src/server/roomManager.ts
var CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
var BOT_NAMES = ["NovaBot", "CosmoBot", "AstroBot", "OrionBot"];
var GRACE_PERIOD_MS = 3e4;
function generateRandomCode(length = 6) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}
var RoomManager = class {
  constructor() {
    this.io = null;
    this.rooms = /* @__PURE__ */ new Map();
    // Map socketId -> { roomId, playerId }
    this.socketMap = /* @__PURE__ */ new Map();
    // Reconnect timers keyed by "roomId:playerId"
    this.disconnectTimers = /* @__PURE__ */ new Map();
    // Bot move timers keyed by "roomId"
    this.botMoveTimers = /* @__PURE__ */ new Map();
    setInterval(() => {
      this.cleanupStaleRooms();
    }, 10 * 60 * 1e3);
  }
  setIO(io) {
    this.io = io;
  }
  generateUniqueRoomId() {
    let code;
    let attempts = 0;
    do {
      code = generateRandomCode(6);
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);
    return code;
  }
  getColorConfig(colorId, fallbackIdx = 0) {
    return PRESET_COLORS.find((c) => c.id === colorId) || PRESET_COLORS[fallbackIdx % PRESET_COLORS.length];
  }
  getUnusedColor(usedColorIds) {
    const available = PRESET_COLORS.filter((c) => !usedColorIds.has(c.id));
    if (available.length > 0) {
      return available[0];
    }
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }
  createRoom(payload, socketId) {
    const rawName = (payload.playerName || "").trim();
    if (!rawName || rawName.length > 18) {
      return { success: false, error: "Please enter a valid player name (1-18 characters)." };
    }
    const targetCount = payload.targetPlayersCount;
    if (targetCount !== 2 && targetCount !== 3 && targetCount !== 4) {
      return { success: false, error: "Room size must be 2, 3, or 4 players." };
    }
    const maxBots = targetCount - 1;
    const requestedBots = Math.max(0, Math.min(maxBots, Number(payload.botCount) || 0));
    const botDifficulty = payload.botDifficulty || "medium";
    const pyramidSize = payload.pyramidSize && payload.pyramidSize >= 5 && payload.pyramidSize <= 15 ? payload.pyramidSize : 7;
    const roomId = this.generateUniqueRoomId();
    const playerId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const colorOpt = this.getColorConfig(payload.colorId, 0);
    const hostPlayer = {
      id: playerId,
      name: rawName,
      colorId: colorOpt.id,
      colorHex: colorOpt.hex,
      colorBorder: colorOpt.ring,
      colorGlow: colorOpt.glow,
      colorBg: colorOpt.bgGradient,
      isBot: false,
      socketId,
      isHost: true,
      isConnected: true,
      status: "online",
      isAiControlled: false,
      isAiTakenOver: false,
      joinedAt: Date.now()
    };
    const players = [hostPlayer];
    const usedColorIds = /* @__PURE__ */ new Set([colorOpt.id]);
    for (let i = 0; i < requestedBots; i++) {
      const botColor = this.getUnusedColor(usedColorIds);
      usedColorIds.add(botColor.id);
      const botName = BOT_NAMES[i % BOT_NAMES.length];
      const botPlayer = {
        id: `bot_${Math.random().toString(36).substring(2, 9)}`,
        name: `${botName} \u{1F916}`,
        colorId: botColor.id,
        colorHex: botColor.hex,
        colorBorder: botColor.ring,
        colorGlow: botColor.glow,
        colorBg: botColor.bgGradient,
        isBot: true,
        difficulty: botDifficulty,
        socketId: "",
        isHost: false,
        isConnected: true,
        status: "ai_controlled",
        isAiControlled: true,
        isAiTakenOver: false,
        joinedAt: Date.now()
      };
      players.push(botPlayer);
    }
    const room = {
      roomId,
      targetPlayersCount: targetCount,
      botCount: requestedBots,
      botDifficulty,
      pyramidSize,
      status: "waiting",
      hostPlayerId: playerId,
      players,
      gameState: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    };
    this.rooms.set(roomId, room);
    this.socketMap.set(socketId, { roomId, playerId });
    return {
      success: true,
      room,
      playerId
    };
  }
  joinRoom(payload, socketId) {
    const normalizedRoomId = (payload.roomId || "").trim().toUpperCase();
    if (!normalizedRoomId || normalizedRoomId.length !== 6) {
      return { success: false, error: "Invalid room code format (must be 6 letters/digits)." };
    }
    const room = this.rooms.get(normalizedRoomId);
    if (!room) {
      return { success: false, error: "Room not found. Check the code and try again." };
    }
    if (room.status !== "waiting") {
      return { success: false, error: "Game has already started in this room." };
    }
    if (room.players.length >= room.targetPlayersCount) {
      return { success: false, error: "Room is already full." };
    }
    const rawName = (payload.playerName || "").trim();
    if (!rawName || rawName.length > 18) {
      return { success: false, error: "Please enter a valid player name (1-18 characters)." };
    }
    const isColorTaken = room.players.some((p) => p.colorId === payload.colorId);
    if (isColorTaken) {
      return { success: false, error: "That color is already taken by another player." };
    }
    const playerId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const colorOpt = this.getColorConfig(payload.colorId, room.players.length);
    const newPlayer = {
      id: playerId,
      name: rawName,
      colorId: colorOpt.id,
      colorHex: colorOpt.hex,
      colorBorder: colorOpt.ring,
      colorGlow: colorOpt.glow,
      colorBg: colorOpt.bgGradient,
      isBot: false,
      socketId,
      isHost: false,
      isConnected: true,
      status: "online",
      isAiControlled: false,
      isAiTakenOver: false,
      joinedAt: Date.now()
    };
    room.players.push(newPlayer);
    room.lastActivityAt = Date.now();
    this.socketMap.set(socketId, { roomId: normalizedRoomId, playerId });
    return {
      success: true,
      room,
      playerId
    };
  }
  reconnectPlayer(payload, socketId) {
    const normalizedRoomId = (payload.roomId || "").trim().toUpperCase();
    const room = this.rooms.get(normalizedRoomId);
    if (!room) {
      return { success: false, error: "Room no longer exists." };
    }
    const player = room.players.find((p) => p.id === payload.playerId);
    if (!player) {
      return { success: false, error: "Player identity not found in this room." };
    }
    const timerKey = `${normalizedRoomId}:${player.id}`;
    const timer = this.disconnectTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(timerKey);
    }
    player.socketId = socketId;
    this.socketMap.set(socketId, { roomId: normalizedRoomId, playerId: player.id });
    room.lastActivityAt = Date.now();
    if (player.isAiTakenOver || player.isAiControlled) {
      return {
        success: true,
        room,
        playerId: player.id,
        isSpectator: true,
        message: "You disconnected earlier. \u{1F916} AI is currently controlling your player. You can watch the rest of this match."
      };
    }
    player.isConnected = true;
    player.status = "online";
    player.disconnectExpiry = null;
    this.io?.to(normalizedRoomId).emit("room:player_reconnected", {
      playerId: player.id,
      playerName: player.name
    });
    this.io?.to(normalizedRoomId).emit("room:updated", room);
    return {
      success: true,
      room,
      playerId: player.id,
      isSpectator: false
    };
  }
  startGame(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: "Room not found." };
    }
    if (room.hostPlayerId !== playerId) {
      return { success: false, error: "Only the room host can start the game." };
    }
    if (room.status !== "waiting") {
      return { success: false, error: "Game is already in progress or completed." };
    }
    if (room.players.length !== room.targetPlayersCount) {
      const missingCount = room.targetPlayersCount - room.players.length;
      return {
        success: false,
        error: `Waiting for ${missingCount} more player(s) to join.`
      };
    }
    const initialGameState = createNewGame(room.players, room.pyramidSize);
    room.gameState = initialGameState;
    room.status = "playing";
    room.lastActivityAt = Date.now();
    this.scheduleBotMoveIfNeeded(roomId);
    return {
      success: true,
      room
    };
  }
  makeMove(roomId, playerId, cellId) {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) {
      return { success: false, error: "Active game not found." };
    }
    if (room.status !== "playing" || room.gameState.status !== "playing") {
      return { success: false, error: "Game is not currently active." };
    }
    const currentTurnPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!currentTurnPlayer || currentTurnPlayer.id !== playerId) {
      return {
        success: false,
        error: `It is not your turn. Waiting for ${currentTurnPlayer?.name || "current player"}.`
      };
    }
    const onlinePlayer = room.players.find((p) => p.id === playerId);
    if (onlinePlayer?.isAiControlled || onlinePlayer?.isBot) {
      return {
        success: false,
        error: "This player seat is currently controlled by AI."
      };
    }
    const targetCell = room.gameState.cells[cellId];
    if (!targetCell) {
      return { success: false, error: "Invalid circle ID." };
    }
    if (targetCell.ownerId !== null) {
      return { success: false, error: "This circle has already been claimed." };
    }
    const moveOutcome = executeMove(room.gameState, cellId);
    if (!moveOutcome) {
      return { success: false, error: "Move rejected by game rules." };
    }
    const { nextState, result } = moveOutcome;
    room.gameState = nextState;
    room.lastActivityAt = Date.now();
    if (result.isGameOver) {
      room.status = "finished";
    } else {
      this.scheduleBotMoveIfNeeded(roomId);
    }
    return {
      success: true,
      room,
      result
    };
  }
  scheduleBotMoveIfNeeded(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "playing" || !room.gameState) return;
    if (this.botMoveTimers.has(roomId)) {
      clearTimeout(this.botMoveTimers.get(roomId));
      this.botMoveTimers.delete(roomId);
    }
    const currentTurnPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!currentTurnPlayer) return;
    const onlinePlayer = room.players.find((p) => p.id === currentTurnPlayer.id);
    const isAi = currentTurnPlayer.isBot || onlinePlayer?.isAiControlled || onlinePlayer?.isBot;
    if (!isAi) {
      return;
    }
    const difficulty = onlinePlayer?.difficulty || currentTurnPlayer.difficulty || room.botDifficulty || "medium";
    const delayMs = getBotThinkingDelay(difficulty);
    this.io?.to(roomId).emit("game:ai_thinking", {
      roomId,
      playerId: currentTurnPlayer.id,
      playerName: onlinePlayer?.name || currentTurnPlayer.name
    });
    const timer = setTimeout(() => {
      this.botMoveTimers.delete(roomId);
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom || currentRoom.status !== "playing" || !currentRoom.gameState) return;
      const turnPlayer = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
      if (!turnPlayer || turnPlayer.id !== currentTurnPlayer.id) return;
      const chosenCellId = chooseBotMove(currentRoom.gameState, turnPlayer);
      if (!chosenCellId) return;
      const moveOutcome = executeMove(currentRoom.gameState, chosenCellId);
      if (!moveOutcome) return;
      currentRoom.gameState = moveOutcome.nextState;
      currentRoom.lastActivityAt = Date.now();
      if (moveOutcome.result.isGameOver) {
        currentRoom.status = "finished";
      }
      this.io?.to(roomId).emit("game:move_made", {
        gameState: currentRoom.gameState,
        moveResult: moveOutcome.result
      });
      this.io?.to(roomId).emit("room:updated", currentRoom);
      if (!moveOutcome.result.isGameOver) {
        this.scheduleBotMoveIfNeeded(roomId);
      }
    }, delayMs);
    this.botMoveTimers.set(roomId, timer);
  }
  triggerAiTakeover(roomId, playerId, reason) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const timerKey = `${roomId}:${playerId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey));
      this.disconnectTimers.delete(timerKey);
    }
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isAiControlled) return;
    if (!player.originalHumanName) {
      player.originalHumanName = player.name;
    }
    player.name = `${player.originalHumanName} \u{1F916}`;
    player.isBot = true;
    player.isAiControlled = true;
    player.isAiTakenOver = true;
    player.status = "ai_controlled";
    player.difficulty = room.botDifficulty || "medium";
    player.disconnectExpiry = null;
    player.isConnected = false;
    if (room.gameState) {
      const gsPlayer = room.gameState.players.find((p) => p.id === playerId);
      if (gsPlayer) {
        gsPlayer.isBot = true;
        gsPlayer.difficulty = player.difficulty;
        gsPlayer.name = player.name;
      }
    }
    if (player.isHost) {
      this.migrateHostIfNeeded(room);
    }
    room.lastActivityAt = Date.now();
    this.io?.to(roomId).emit("room:ai_takeover", {
      roomId,
      playerId: player.id,
      playerName: player.name,
      originalHumanName: player.originalHumanName,
      reason
    });
    this.io?.to(roomId).emit("room:updated", room);
    if (room.status === "playing" && room.gameState) {
      const currentTurnPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
      if (currentTurnPlayer && currentTurnPlayer.id === playerId) {
        this.scheduleBotMoveIfNeeded(roomId);
      }
    }
  }
  migrateHostIfNeeded(room) {
    const currentHost = room.players.find((p) => p.id === room.hostPlayerId);
    if (currentHost && currentHost.isConnected && !currentHost.isAiControlled && !currentHost.isBot) {
      return;
    }
    const nextHuman = room.players.find(
      (p) => p.id !== room.hostPlayerId && p.isConnected && !p.isAiControlled && !p.isBot
    );
    if (nextHuman) {
      if (currentHost) currentHost.isHost = false;
      nextHuman.isHost = true;
      room.hostPlayerId = nextHuman.id;
      this.io?.to(room.roomId).emit("room:host_changed", {
        newHostId: nextHuman.id,
        newHostName: nextHuman.name
      });
    }
  }
  restartGame(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: "Room not found." };
    }
    if (room.hostPlayerId !== playerId) {
      return { success: false, error: "Only the host can start a rematch." };
    }
    if (this.botMoveTimers.has(roomId)) {
      clearTimeout(this.botMoveTimers.get(roomId));
      this.botMoveTimers.delete(roomId);
    }
    const freshGame = createNewGame(room.players, room.pyramidSize);
    room.gameState = freshGame;
    room.status = "playing";
    room.lastActivityAt = Date.now();
    this.scheduleBotMoveIfNeeded(roomId);
    return {
      success: true,
      room
    };
  }
  leaveRoom(socketId) {
    const mapping = this.socketMap.get(socketId);
    if (!mapping) {
      return { room: null, shouldNotify: false };
    }
    this.socketMap.delete(socketId);
    const { roomId, playerId } = mapping;
    const room = this.rooms.get(roomId);
    if (!room) {
      return { room: null, shouldNotify: false };
    }
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return { room, shouldNotify: false };
    }
    if (room.status === "waiting") {
      const wasHost = room.hostPlayerId === playerId;
      room.players.splice(playerIndex, 1);
      const remainingHumans = room.players.filter((p) => !p.isBot);
      if (remainingHumans.length === 0) {
        this.rooms.delete(roomId);
        return { room: null, playerId, shouldNotify: false };
      }
      if (wasHost) {
        const nextHost = remainingHumans[0];
        nextHost.isHost = true;
        room.hostPlayerId = nextHost.id;
        this.io?.to(roomId).emit("room:host_changed", {
          newHostId: nextHost.id,
          newHostName: nextHost.name
        });
      }
      room.lastActivityAt = Date.now();
      return { room, playerId, shouldNotify: true };
    } else {
      this.triggerAiTakeover(roomId, playerId, "explicit_leave");
      return { room, playerId, shouldNotify: true };
    }
  }
  handleSocketDisconnect(socketId) {
    const mapping = this.socketMap.get(socketId);
    if (!mapping) {
      return { room: null, player: null };
    }
    this.socketMap.delete(socketId);
    const { roomId, playerId } = mapping;
    const room = this.rooms.get(roomId);
    if (!room) {
      return { room: null, player: null };
    }
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      return { room, player: null };
    }
    player.isConnected = false;
    room.lastActivityAt = Date.now();
    if (room.status === "waiting") {
      player.status = "disconnected";
      const timerKey = `${roomId}:${player.id}`;
      const timer = setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom && currentRoom.status === "waiting") {
          const idx = currentRoom.players.findIndex((p) => p.id === player.id && !p.isConnected);
          if (idx !== -1) {
            currentRoom.players.splice(idx, 1);
            const remainingHumans = currentRoom.players.filter((p) => !p.isBot);
            if (remainingHumans.length === 0) {
              this.rooms.delete(roomId);
            } else if (currentRoom.hostPlayerId === player.id) {
              remainingHumans[0].isHost = true;
              currentRoom.hostPlayerId = remainingHumans[0].id;
              this.io?.to(roomId).emit("room:host_changed", {
                newHostId: remainingHumans[0].id,
                newHostName: remainingHumans[0].name
              });
            }
            this.io?.to(roomId).emit("room:updated", currentRoom);
          }
        }
        this.disconnectTimers.delete(timerKey);
      }, 6e4);
      this.disconnectTimers.set(timerKey, timer);
      return { room, player };
    } else {
      if (player.isAiControlled || player.isBot) {
        return { room, player };
      }
      player.status = "reconnecting";
      player.disconnectExpiry = Date.now() + GRACE_PERIOD_MS;
      const timerKey = `${roomId}:${player.id}`;
      if (this.disconnectTimers.has(timerKey)) {
        clearTimeout(this.disconnectTimers.get(timerKey));
      }
      const timer = setTimeout(() => {
        this.triggerAiTakeover(roomId, player.id, "disconnect_timeout");
      }, GRACE_PERIOD_MS);
      this.disconnectTimers.set(timerKey, timer);
      return { room, player };
    }
  }
  getRoom(roomId) {
    return this.rooms.get(roomId.trim().toUpperCase());
  }
  getActiveRoomCount() {
    return this.rooms.size;
  }
  cleanupStaleRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      const idleTime = now - room.lastActivityAt;
      const allHumansDisconnected = room.players.filter((p) => !p.isBot && !p.isAiControlled).every((p) => !p.isConnected);
      if (allHumansDisconnected && idleTime > 15 * 60 * 1e3) {
        if (this.botMoveTimers.has(roomId)) {
          clearTimeout(this.botMoveTimers.get(roomId));
          this.botMoveTimers.delete(roomId);
        }
        this.rooms.delete(roomId);
        continue;
      }
      if (room.status === "finished" && idleTime > 45 * 60 * 1e3) {
        if (this.botMoveTimers.has(roomId)) {
          clearTimeout(this.botMoveTimers.get(roomId));
          this.botMoveTimers.delete(roomId);
        }
        this.rooms.delete(roomId);
        continue;
      }
      if (now - room.createdAt > 3 * 60 * 60 * 1e3) {
        if (this.botMoveTimers.has(roomId)) {
          clearTimeout(this.botMoveTimers.get(roomId));
          this.botMoveTimers.delete(roomId);
        }
        this.rooms.delete(roomId);
      }
    }
  }
};

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function main() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
  });
  const roomManager = new RoomManager();
  roomManager.setIO(io);
  io.on("connection", (socket) => {
    socket.on("room:create", (payload, callback) => {
      try {
        const result = roomManager.createRoom(payload, socket.id);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (callback) callback(result);
          io.to(result.room.roomId).emit("room:updated", result.room);
        } else {
          if (callback) callback(result);
        }
      } catch (err) {
        if (callback) callback({ success: false, error: err?.message || "Server error" });
      }
    });
    socket.on("room:join", (payload, callback) => {
      try {
        const result = roomManager.joinRoom(payload, socket.id);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (callback) callback(result);
          io.to(result.room.roomId).emit("room:updated", result.room);
        } else {
          if (callback) callback(result);
        }
      } catch (err) {
        if (callback) callback({ success: false, error: err?.message || "Server error" });
      }
    });
    socket.on("room:reconnect", (payload, callback) => {
      try {
        const result = roomManager.reconnectPlayer(payload, socket.id);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (callback) callback(result);
          io.to(result.room.roomId).emit("room:updated", result.room);
          socket.to(result.room.roomId).emit("room:player_reconnected", {
            playerId: payload.playerId
          });
        } else {
          if (callback) callback(result);
        }
      } catch (err) {
        if (callback) callback({ success: false, error: err?.message || "Server error" });
      }
    });
    socket.on("room:start_game", (payload, callback) => {
      try {
        const result = roomManager.startGame(payload.roomId, payload.playerId);
        if (callback) callback(result);
        if (result.success && result.room) {
          io.to(result.room.roomId).emit("room:updated", result.room);
        }
      } catch (err) {
        if (callback) callback({ success: false, error: err?.message || "Server error" });
      }
    });
    socket.on("game:make_move", (payload, callback) => {
      try {
        const result = roomManager.makeMove(payload.roomId, payload.playerId, payload.cellId);
        if (callback) callback(result);
        if (result.success && result.room && result.result) {
          io.to(result.room.roomId).emit("game:move_made", {
            gameState: result.room.gameState,
            moveResult: result.result
          });
          io.to(result.room.roomId).emit("room:updated", result.room);
        }
      } catch (err) {
        if (callback) callback({ success: false, error: err?.message || "Server error" });
      }
    });
    socket.on("game:restart", (payload, callback) => {
      try {
        const result = roomManager.restartGame(payload.roomId, payload.playerId);
        if (callback) callback(result);
        if (result.success && result.room) {
          io.to(result.room.roomId).emit("room:updated", result.room);
        }
      } catch (err) {
        if (callback) callback({ success: false, error: err?.message || "Server error" });
      }
    });
    socket.on("room:leave", (_data, callback) => {
      try {
        const { room, playerId, shouldNotify } = roomManager.leaveRoom(socket.id);
        if (room && shouldNotify) {
          socket.leave(room.roomId);
          io.to(room.roomId).emit("room:updated", room);
        }
        if (callback) callback();
      } catch {
        if (callback) callback();
      }
    });
    socket.on("disconnect", () => {
      try {
        const { room, player } = roomManager.handleSocketDisconnect(socket.id);
        if (room && player) {
          io.to(room.roomId).emit("room:updated", room);
          io.to(room.roomId).emit("room:player_disconnected", {
            playerId: player.id,
            playerName: player.name
          });
        }
      } catch {
      }
    });
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      activeRooms: roomManager.getActiveRoomCount(),
      timestamp: Date.now()
    });
  });
  const distPath = path.resolve(__dirname, "dist");
  const hasDist = fs.existsSync(path.resolve(distPath, "index.html"));
  const isBundled = __filename.endsWith("server.js");
  const isProd = isBundled || process.env.NODE_ENV === "production" || process.env.NODE_ENV !== "development" && hasDist;
  const PORT = Number(process.env.PORT) || 3e3;
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  server.on("error", (err) => {
    console.error("Fatal HTTP server error:", err);
    process.exit(1);
  });
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Pyramid Row Master Server listening on port ${PORT} [${isProd ? "PROD" : "DEV"}]`);
  });
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received. Gracefully closing HTTP and WebSocket server...");
    server.close(() => {
      console.log("Server stopped.");
      process.exit(0);
    });
  });
}
main().catch((err) => {
  console.error("Fatal server startup error:", err);
  process.exit(1);
});
