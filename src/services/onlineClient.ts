import { io, Socket } from 'socket.io-client';
import { GameState, MoveResult } from '../types/game';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  MoveResponse,
  ReconnectPayload,
  RoomResponse,
  RoomState,
} from '../types/online';

const SESSION_STORAGE_KEY = 'pyramid_online_session_v1';

export interface StoredSession {
  roomId: string;
  playerId: string;
  playerName: string;
  colorId: string;
  lastActive: number;
}

export function saveOnlineSession(session: Omit<StoredSession, 'lastActive'>): void {
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ ...session, lastActive: Date.now() })
    );
  } catch {
    // sessionStorage unavailable or quota exceeded
  }
}

export function getOnlineSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearOnlineSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

class OnlineClient {
  private socket: Socket | null = null;
  private isConnecting = false;

  public getSocket(): Socket {
    if (!this.socket) {
      // Connect to same origin / host
      this.socket = io({
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
      });
    }
    return this.socket;
  }

  public connect(): Promise<Socket> {
    const socket = this.getSocket();
    if (socket.connected) {
      return Promise.resolve(socket);
    }

    return new Promise((resolve, reject) => {
      if (socket.connected) {
        resolve(socket);
        return;
      }

      const onConnect = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
        resolve(socket);
      };

      const onError = (err: Error) => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
        reject(err);
      };

      socket.on('connect', onConnect);
      socket.on('connect_error', onError);

      socket.connect();
    });
  }

  public createRoom(payload: CreateRoomPayload): Promise<RoomResponse> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('room:create', payload, (res: RoomResponse) => {
        if (res.success && res.room && res.playerId) {
          saveOnlineSession({
            roomId: res.room.roomId,
            playerId: res.playerId,
            playerName: payload.playerName,
            colorId: payload.colorId,
          });
        }
        resolve(res);
      });
    });
  }

  public joinRoom(payload: JoinRoomPayload): Promise<RoomResponse> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('room:join', payload, (res: RoomResponse) => {
        if (res.success && res.room && res.playerId) {
          saveOnlineSession({
            roomId: res.room.roomId,
            playerId: res.playerId,
            playerName: payload.playerName,
            colorId: payload.colorId,
          });
        }
        resolve(res);
      });
    });
  }

  public reconnect(payload: ReconnectPayload): Promise<RoomResponse> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('room:reconnect', payload, (res: RoomResponse) => {
        resolve(res);
      });
    });
  }

  public startGame(roomId: string, playerId: string): Promise<RoomResponse> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('room:start_game', { roomId, playerId }, (res: RoomResponse) => {
        resolve(res);
      });
    });
  }

  public makeMove(roomId: string, playerId: string, cellId: string): Promise<MoveResponse> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('game:make_move', { roomId, playerId, cellId }, (res: MoveResponse) => {
        resolve(res);
      });
    });
  }

  public restartGame(roomId: string, playerId: string): Promise<RoomResponse> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('game:restart', { roomId, playerId }, (res: RoomResponse) => {
        resolve(res);
      });
    });
  }

  public leaveRoom(): void {
    const socket = this.getSocket();
    socket.emit('room:leave');
    clearOnlineSession();
  }
}

export const onlineClient = new OnlineClient();
