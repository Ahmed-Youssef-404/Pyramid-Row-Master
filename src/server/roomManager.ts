import { Server as SocketIOServer } from 'socket.io';
import { BotDifficulty, GameState, MoveResult } from '../types/game';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  MoveResponse,
  OnlinePlayer,
  ReconnectPayload,
  RoomResponse,
  RoomState,
} from '../types/online';
import { PRESET_COLORS } from '../utils/colors';
import { createNewGame, executeMove } from '../game/gameLogic';
import { chooseBotMove } from '../game/bot/botStrategy';
import { getBotThinkingDelay } from '../game/bot/difficulty';

// Alphabet without easily confused characters (0, O, 1, I)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const BOT_NAMES = ['NovaBot', 'CosmoBot', 'AstroBot', 'OrionBot'];
const GRACE_PERIOD_MS = 30000; // 30 seconds reconnect grace period

function generateRandomCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

export class RoomManager {
  private io: SocketIOServer | null = null;
  private rooms = new Map<string, RoomState>();
  // Map socketId -> { roomId, playerId }
  private socketMap = new Map<string, { roomId: string; playerId: string }>();
  // Reconnect timers keyed by "roomId:playerId"
  private disconnectTimers = new Map<string, NodeJS.Timeout>();
  // Bot move timers keyed by "roomId"
  private botMoveTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    // Periodic cleanup of stale rooms (older than 3 hours or finished & inactive for 45 mins)
    setInterval(() => {
      this.cleanupStaleRooms();
    }, 10 * 60 * 1000);
  }

  public setIO(io: SocketIOServer) {
    this.io = io;
  }

  private generateUniqueRoomId(): string {
    let code: string;
    let attempts = 0;
    do {
      code = generateRandomCode(6);
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);
    return code;
  }

  private getColorConfig(colorId: string, fallbackIdx = 0) {
    return PRESET_COLORS.find(c => c.id === colorId) || PRESET_COLORS[fallbackIdx % PRESET_COLORS.length];
  }

  private getUnusedColor(usedColorIds: Set<string>): typeof PRESET_COLORS[0] {
    const available = PRESET_COLORS.filter(c => !usedColorIds.has(c.id));
    if (available.length > 0) {
      return available[0];
    }
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }

  public createRoom(payload: CreateRoomPayload, socketId: string): RoomResponse {
    const rawName = (payload.playerName || '').trim();
    if (!rawName || rawName.length > 18) {
      return { success: false, error: 'Please enter a valid player name (1-18 characters).' };
    }

    const targetCount = payload.targetPlayersCount;
    if (targetCount !== 2 && targetCount !== 3 && targetCount !== 4) {
      return { success: false, error: 'Room size must be 2, 3, or 4 players.' };
    }

    const maxBots = targetCount - 1; // At least one player must be human!
    const requestedBots = Math.max(0, Math.min(maxBots, Number(payload.botCount) || 0));
    const botDifficulty: BotDifficulty = payload.botDifficulty || 'medium';

    const pyramidSize = payload.pyramidSize && payload.pyramidSize >= 5 && payload.pyramidSize <= 15
      ? payload.pyramidSize
      : 7;

    const roomId = this.generateUniqueRoomId();
    const playerId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const colorOpt = this.getColorConfig(payload.colorId, 0);

    const hostPlayer: OnlinePlayer = {
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
      status: 'online',
      isAiControlled: false,
      isAiTakenOver: false,
      joinedAt: Date.now(),
    };

    const players: OnlinePlayer[] = [hostPlayer];
    const usedColorIds = new Set<string>([colorOpt.id]);

    // Create configured online AI bots
    for (let i = 0; i < requestedBots; i++) {
      const botColor = this.getUnusedColor(usedColorIds);
      usedColorIds.add(botColor.id);
      const botName = BOT_NAMES[i % BOT_NAMES.length];

      const botPlayer: OnlinePlayer = {
        id: `bot_${Math.random().toString(36).substring(2, 9)}`,
        name: `${botName} 🤖`,
        colorId: botColor.id,
        colorHex: botColor.hex,
        colorBorder: botColor.ring,
        colorGlow: botColor.glow,
        colorBg: botColor.bgGradient,
        isBot: true,
        difficulty: botDifficulty,
        socketId: '',
        isHost: false,
        isConnected: true,
        status: 'ai_controlled',
        isAiControlled: true,
        isAiTakenOver: false,
        joinedAt: Date.now(),
      };
      players.push(botPlayer);
    }

    const room: RoomState = {
      roomId,
      targetPlayersCount: targetCount,
      botCount: requestedBots,
      botDifficulty,
      pyramidSize,
      status: 'waiting',
      hostPlayerId: playerId,
      players,
      gameState: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.socketMap.set(socketId, { roomId, playerId });

    return {
      success: true,
      room,
      playerId,
    };
  }

  public joinRoom(payload: JoinRoomPayload, socketId: string): RoomResponse {
    const normalizedRoomId = (payload.roomId || '').trim().toUpperCase();
    if (!normalizedRoomId || normalizedRoomId.length !== 6) {
      return { success: false, error: 'Invalid room code format (must be 6 letters/digits).' };
    }

    const room = this.rooms.get(normalizedRoomId);
    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Game has already started in this room.' };
    }

    if (room.players.length >= room.targetPlayersCount) {
      return { success: false, error: 'Room is already full.' };
    }

    const rawName = (payload.playerName || '').trim();
    if (!rawName || rawName.length > 18) {
      return { success: false, error: 'Please enter a valid player name (1-18 characters).' };
    }

    // Check if color is already chosen by another player (human or bot)
    const isColorTaken = room.players.some(p => p.colorId === payload.colorId);
    if (isColorTaken) {
      return { success: false, error: 'That color is already taken by another player.' };
    }

    const playerId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const colorOpt = this.getColorConfig(payload.colorId, room.players.length);

    const newPlayer: OnlinePlayer = {
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
      status: 'online',
      isAiControlled: false,
      isAiTakenOver: false,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);
    room.lastActivityAt = Date.now();
    this.socketMap.set(socketId, { roomId: normalizedRoomId, playerId });

    return {
      success: true,
      room,
      playerId,
    };
  }

  public reconnectPlayer(payload: ReconnectPayload, socketId: string): RoomResponse {
    const normalizedRoomId = (payload.roomId || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedRoomId);
    if (!room) {
      return { success: false, error: 'Room no longer exists.' };
    }

    const player = room.players.find(p => p.id === payload.playerId);
    if (!player) {
      return { success: false, error: 'Player identity not found in this room.' };
    }

    // Clear any disconnect grace timer for this player
    const timerKey = `${normalizedRoomId}:${player.id}`;
    const timer = this.disconnectTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(timerKey);
    }

    // Rebind socket
    player.socketId = socketId;
    this.socketMap.set(socketId, { roomId: normalizedRoomId, playerId: player.id });
    room.lastActivityAt = Date.now();

    // Check if AI takeover has ALREADY occurred
    if (player.isAiTakenOver || player.isAiControlled) {
      // Reconnected as a spectator to prevent state/turn desync
      return {
        success: true,
        room,
        playerId: player.id,
        isSpectator: true,
        message: 'You disconnected earlier. 🤖 AI is currently controlling your player. You can watch the rest of this match.',
      };
    }

    // Returned BEFORE AI takeover during grace period: full control regained!
    player.isConnected = true;
    player.status = 'online';
    player.disconnectExpiry = null;

    // Broadcast reconnection
    this.io?.to(normalizedRoomId).emit('room:player_reconnected', {
      playerId: player.id,
      playerName: player.name,
    });
    this.io?.to(normalizedRoomId).emit('room:updated', room);

    return {
      success: true,
      room,
      playerId: player.id,
      isSpectator: false,
    };
  }

  public startGame(roomId: string, playerId: string): RoomResponse {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }

    if (room.hostPlayerId !== playerId) {
      return { success: false, error: 'Only the room host can start the game.' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Game is already in progress or completed.' };
    }

    if (room.players.length !== room.targetPlayersCount) {
      const missingCount = room.targetPlayersCount - room.players.length;
      return {
        success: false,
        error: `Waiting for ${missingCount} more player(s) to join.`,
      };
    }

    // Initialize authoritative game state using existing pure game engine
    const initialGameState = createNewGame(room.players, room.pyramidSize);
    room.gameState = initialGameState;
    room.status = 'playing';
    room.lastActivityAt = Date.now();

    // If first turn is an AI/Bot, schedule it!
    this.scheduleBotMoveIfNeeded(roomId);

    return {
      success: true,
      room,
    };
  }

  public makeMove(roomId: string, playerId: string, cellId: string): MoveResponse {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) {
      return { success: false, error: 'Active game not found.' };
    }

    if (room.status !== 'playing' || room.gameState.status !== 'playing') {
      return { success: false, error: 'Game is not currently active.' };
    }

    // 1. TURN VALIDATION: Ensure only the current player can make a move
    const currentTurnPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!currentTurnPlayer || currentTurnPlayer.id !== playerId) {
      return {
        success: false,
        error: `It is not your turn. Waiting for ${currentTurnPlayer?.name || 'current player'}.`,
      };
    }

    // Reject human move if this seat is AI controlled
    const onlinePlayer = room.players.find(p => p.id === playerId);
    if (onlinePlayer?.isAiControlled || onlinePlayer?.isBot) {
      return {
        success: false,
        error: 'This player seat is currently controlled by AI.',
      };
    }

    // 2. CELL VALIDATION
    const targetCell = room.gameState.cells[cellId];
    if (!targetCell) {
      return { success: false, error: 'Invalid circle ID.' };
    }
    if (targetCell.ownerId !== null) {
      return { success: false, error: 'This circle has already been claimed.' };
    }

    // 3. EXECUTE MOVE using pure authoritative game logic
    const moveOutcome = executeMove(room.gameState, cellId);
    if (!moveOutcome) {
      return { success: false, error: 'Move rejected by game rules.' };
    }

    const { nextState, result } = moveOutcome;
    room.gameState = nextState;
    room.lastActivityAt = Date.now();

    if (result.isGameOver) {
      room.status = 'finished';
    } else {
      // Check if next turn is Bot/AI
      this.scheduleBotMoveIfNeeded(roomId);
    }

    return {
      success: true,
      room,
      result,
    };
  }

  public scheduleBotMoveIfNeeded(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing' || !room.gameState) return;

    // Clear any previous timer for this room
    if (this.botMoveTimers.has(roomId)) {
      clearTimeout(this.botMoveTimers.get(roomId)!);
      this.botMoveTimers.delete(roomId);
    }

    const currentTurnPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!currentTurnPlayer) return;

    const onlinePlayer = room.players.find(p => p.id === currentTurnPlayer.id);
    const isAi = currentTurnPlayer.isBot || onlinePlayer?.isAiControlled || onlinePlayer?.isBot;

    if (!isAi) {
      // Current player is an active human - wait for their move
      return;
    }

    const difficulty: BotDifficulty = onlinePlayer?.difficulty || currentTurnPlayer.difficulty || room.botDifficulty || 'medium';
    const delayMs = getBotThinkingDelay(difficulty);

    // Notify clients that AI is thinking
    this.io?.to(roomId).emit('game:ai_thinking', {
      roomId,
      playerId: currentTurnPlayer.id,
      playerName: onlinePlayer?.name || currentTurnPlayer.name,
    });

    const timer = setTimeout(() => {
      this.botMoveTimers.delete(roomId);
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom || currentRoom.status !== 'playing' || !currentRoom.gameState) return;

      const turnPlayer = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
      if (!turnPlayer || turnPlayer.id !== currentTurnPlayer.id) return;

      // Authoritative bot move selection using existing pure bot engine
      const chosenCellId = chooseBotMove(currentRoom.gameState, turnPlayer);
      if (!chosenCellId) return;

      const moveOutcome = executeMove(currentRoom.gameState, chosenCellId);
      if (!moveOutcome) return;

      currentRoom.gameState = moveOutcome.nextState;
      currentRoom.lastActivityAt = Date.now();

      if (moveOutcome.result.isGameOver) {
        currentRoom.status = 'finished';
      }

      // Broadcast move to all connected players
      this.io?.to(roomId).emit('game:move_made', {
        gameState: currentRoom.gameState,
        moveResult: moveOutcome.result,
      });
      this.io?.to(roomId).emit('room:updated', currentRoom);

      // If game continues, check if next player is ALSO bot/AI!
      if (!moveOutcome.result.isGameOver) {
        this.scheduleBotMoveIfNeeded(roomId);
      }
    }, delayMs);

    this.botMoveTimers.set(roomId, timer);
  }

  public triggerAiTakeover(
    roomId: string,
    playerId: string,
    reason: 'disconnect_timeout' | 'explicit_leave'
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear disconnect timer if active
    const timerKey = `${roomId}:${playerId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey)!);
      this.disconnectTimers.delete(timerKey);
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.isAiControlled) return;

    // Preserve original human name for results/stats
    if (!player.originalHumanName) {
      player.originalHumanName = player.name;
    }

    player.name = `${player.originalHumanName} 🤖`;
    player.isBot = true;
    player.isAiControlled = true;
    player.isAiTakenOver = true;
    player.status = 'ai_controlled';
    player.difficulty = room.botDifficulty || 'medium';
    player.disconnectExpiry = null;
    player.isConnected = false;

    // Update in gameState.players if game is active
    if (room.gameState) {
      const gsPlayer = room.gameState.players.find(p => p.id === playerId);
      if (gsPlayer) {
        gsPlayer.isBot = true;
        gsPlayer.difficulty = player.difficulty;
        gsPlayer.name = player.name;
      }
    }

    // If this player was host, migrate host privileges to another connected human
    if (player.isHost) {
      this.migrateHostIfNeeded(room);
    }

    room.lastActivityAt = Date.now();

    // Broadcast AI takeover event
    this.io?.to(roomId).emit('room:ai_takeover', {
      roomId,
      playerId: player.id,
      playerName: player.name,
      originalHumanName: player.originalHumanName,
      reason,
    });
    this.io?.to(roomId).emit('room:updated', room);

    // If it is currently this player's turn, immediately schedule the AI move!
    if (room.status === 'playing' && room.gameState) {
      const currentTurnPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
      if (currentTurnPlayer && currentTurnPlayer.id === playerId) {
        this.scheduleBotMoveIfNeeded(roomId);
      }
    }
  }

  private migrateHostIfNeeded(room: RoomState) {
    const currentHost = room.players.find(p => p.id === room.hostPlayerId);
    // Only migrate if current host is disconnected or AI controlled
    if (currentHost && currentHost.isConnected && !currentHost.isAiControlled && !currentHost.isBot) {
      return;
    }

    // Find first connected human player
    const nextHuman = room.players.find(
      p => p.id !== room.hostPlayerId && p.isConnected && !p.isAiControlled && !p.isBot
    );

    if (nextHuman) {
      if (currentHost) currentHost.isHost = false;
      nextHuman.isHost = true;
      room.hostPlayerId = nextHuman.id;
      this.io?.to(room.roomId).emit('room:host_changed', {
        newHostId: nextHuman.id,
        newHostName: nextHuman.name,
      });
    }
  }

  public restartGame(roomId: string, playerId: string): RoomResponse {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }

    if (room.hostPlayerId !== playerId) {
      return { success: false, error: 'Only the host can start a rematch.' };
    }

    // Cancel any active bot timers
    if (this.botMoveTimers.has(roomId)) {
      clearTimeout(this.botMoveTimers.get(roomId)!);
      this.botMoveTimers.delete(roomId);
    }

    // Restart game with current room players
    const freshGame = createNewGame(room.players, room.pyramidSize);
    room.gameState = freshGame;
    room.status = 'playing';
    room.lastActivityAt = Date.now();

    // If first turn is Bot/AI, schedule bot move!
    this.scheduleBotMoveIfNeeded(roomId);

    return {
      success: true,
      room,
    };
  }

  public leaveRoom(socketId: string): { room: RoomState | null; playerId?: string; shouldNotify: boolean } {
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

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { room, shouldNotify: false };
    }

    if (room.status === 'waiting') {
      // In lobby: remove player completely
      const wasHost = room.hostPlayerId === playerId;
      room.players.splice(playerIndex, 1);

      // Check remaining human players
      const remainingHumans = room.players.filter(p => !p.isBot);
      if (remainingHumans.length === 0) {
        // Destroy room if no humans left in waiting lobby
        this.rooms.delete(roomId);
        return { room: null, playerId, shouldNotify: false };
      }

      if (wasHost) {
        const nextHost = remainingHumans[0];
        nextHost.isHost = true;
        room.hostPlayerId = nextHost.id;
        this.io?.to(roomId).emit('room:host_changed', {
          newHostId: nextHost.id,
          newHostName: nextHost.name,
        });
      }

      room.lastActivityAt = Date.now();
      return { room, playerId, shouldNotify: true };
    } else {
      // In-game: explicit leave -> trigger immediate AI takeover
      this.triggerAiTakeover(roomId, playerId, 'explicit_leave');
      return { room, playerId, shouldNotify: true };
    }
  }

  public handleSocketDisconnect(socketId: string): {
    room: RoomState | null;
    player: OnlinePlayer | null;
  } {
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

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return { room, player: null };
    }

    player.isConnected = false;
    room.lastActivityAt = Date.now();

    if (room.status === 'waiting') {
      player.status = 'disconnected';
      // In waiting mode, set a 60s timer to remove player if they don't reconnect
      const timerKey = `${roomId}:${player.id}`;
      const timer = setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom && currentRoom.status === 'waiting') {
          const idx = currentRoom.players.findIndex(p => p.id === player.id && !p.isConnected);
          if (idx !== -1) {
            currentRoom.players.splice(idx, 1);
            const remainingHumans = currentRoom.players.filter(p => !p.isBot);
            if (remainingHumans.length === 0) {
              this.rooms.delete(roomId);
            } else if (currentRoom.hostPlayerId === player.id) {
              remainingHumans[0].isHost = true;
              currentRoom.hostPlayerId = remainingHumans[0].id;
              this.io?.to(roomId).emit('room:host_changed', {
                newHostId: remainingHumans[0].id,
                newHostName: remainingHumans[0].name,
              });
            }
            this.io?.to(roomId).emit('room:updated', currentRoom);
          }
        }
        this.disconnectTimers.delete(timerKey);
      }, 60000);

      this.disconnectTimers.set(timerKey, timer);
      return { room, player };
    } else {
      // In-game: if player is already AI controlled or bot, nothing more to do
      if (player.isAiControlled || player.isBot) {
        return { room, player };
      }

      // Human player disconnected in-game: enter 30s grace period!
      player.status = 'reconnecting';
      player.disconnectExpiry = Date.now() + GRACE_PERIOD_MS;

      const timerKey = `${roomId}:${player.id}`;
      if (this.disconnectTimers.has(timerKey)) {
        clearTimeout(this.disconnectTimers.get(timerKey)!);
      }

      const timer = setTimeout(() => {
        this.triggerAiTakeover(roomId, player.id, 'disconnect_timeout');
      }, GRACE_PERIOD_MS);

      this.disconnectTimers.set(timerKey, timer);

      return { room, player };
    }
  }

  public getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId.trim().toUpperCase());
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }

  private cleanupStaleRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      const idleTime = now - room.lastActivityAt;
      const allHumansDisconnected = room.players
        .filter(p => !p.isBot && !p.isAiControlled)
        .every(p => !p.isConnected);

      // Clean up if all humans disconnected for 15+ minutes
      if (allHumansDisconnected && idleTime > 15 * 60 * 1000) {
        if (this.botMoveTimers.has(roomId)) {
          clearTimeout(this.botMoveTimers.get(roomId)!);
          this.botMoveTimers.delete(roomId);
        }
        this.rooms.delete(roomId);
        continue;
      }

      // Clean up finished rooms after 45 minutes
      if (room.status === 'finished' && idleTime > 45 * 60 * 1000) {
        if (this.botMoveTimers.has(roomId)) {
          clearTimeout(this.botMoveTimers.get(roomId)!);
          this.botMoveTimers.delete(roomId);
        }
        this.rooms.delete(roomId);
        continue;
      }

      // Absolute max room lifetime 3 hours
      if (now - room.createdAt > 3 * 60 * 60 * 1000) {
        if (this.botMoveTimers.has(roomId)) {
          clearTimeout(this.botMoveTimers.get(roomId)!);
          this.botMoveTimers.delete(roomId);
        }
        this.rooms.delete(roomId);
      }
    }
  }
}
