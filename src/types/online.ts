import { BotDifficulty, GameState, MoveResult, Player } from './game';

export type PlayerPresenceStatus =
  | 'online'
  | 'reconnecting'
  | 'disconnected'
  | 'left'
  | 'ai_controlled'
  | 'spectating';

export interface OnlinePlayer extends Player {
  socketId: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: number;
  status: PlayerPresenceStatus;
  isAiControlled: boolean;
  isAiTakenOver?: boolean;
  originalHumanName?: string;
  disconnectExpiry?: number | null;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomState {
  roomId: string;
  targetPlayersCount: number;
  botCount: number;
  botDifficulty: BotDifficulty;
  pyramidSize: number;
  status: RoomStatus;
  hostPlayerId: string;
  players: OnlinePlayer[];
  gameState: GameState | null;
  createdAt: number;
  lastActivityAt: number;
}

export interface CreateRoomPayload {
  playerName: string;
  colorId: string;
  targetPlayersCount: number;
  botCount?: number;
  botDifficulty?: BotDifficulty;
  pyramidSize?: number;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  colorId: string;
}

export interface ReconnectPayload {
  roomId: string;
  playerId: string;
}

export interface MakeMovePayload {
  roomId: string;
  playerId: string;
  cellId: string;
}

export interface RoomResponse {
  success: boolean;
  error?: string;
  room?: RoomState;
  playerId?: string;
  isSpectator?: boolean;
  message?: string;
}

export interface MoveResponse {
  success: boolean;
  error?: string;
  room?: RoomState;
  result?: MoveResult;
}
