import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from './src/server/roomManager.ts';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  MakeMovePayload,
  ReconnectPayload,
} from './src/types/online.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = express();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  const roomManager = new RoomManager();
  roomManager.setIO(io);

  // Socket.IO Real-time event handling
  io.on('connection', (socket: Socket) => {
    // 1. Create Room
    socket.on('room:create', (payload: CreateRoomPayload, callback?: (res: any) => void) => {
      try {
        const result = roomManager.createRoom(payload, socket.id);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (callback) callback(result);
          io.to(result.room.roomId).emit('room:updated', result.room);
        } else {
          if (callback) callback(result);
        }
      } catch (err: any) {
        if (callback) callback({ success: false, error: err?.message || 'Server error' });
      }
    });

    // 2. Join Room
    socket.on('room:join', (payload: JoinRoomPayload, callback?: (res: any) => void) => {
      try {
        const result = roomManager.joinRoom(payload, socket.id);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (callback) callback(result);
          io.to(result.room.roomId).emit('room:updated', result.room);
        } else {
          if (callback) callback(result);
        }
      } catch (err: any) {
        if (callback) callback({ success: false, error: err?.message || 'Server error' });
      }
    });

    // 3. Reconnect to Room
    socket.on('room:reconnect', (payload: ReconnectPayload, callback?: (res: any) => void) => {
      try {
        const result = roomManager.reconnectPlayer(payload, socket.id);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (callback) callback(result);
          io.to(result.room.roomId).emit('room:updated', result.room);
          socket.to(result.room.roomId).emit('room:player_reconnected', {
            playerId: payload.playerId,
          });
        } else {
          if (callback) callback(result);
        }
      } catch (err: any) {
        if (callback) callback({ success: false, error: err?.message || 'Server error' });
      }
    });

    // 4. Start Game (Host only)
    socket.on('room:start_game', (payload: { roomId: string; playerId: string }, callback?: (res: any) => void) => {
      try {
        const result = roomManager.startGame(payload.roomId, payload.playerId);
        if (callback) callback(result);
        if (result.success && result.room) {
          io.to(result.room.roomId).emit('room:updated', result.room);
        }
      } catch (err: any) {
        if (callback) callback({ success: false, error: err?.message || 'Server error' });
      }
    });

    // 5. Authoritative Move Execution
    socket.on('game:make_move', (payload: MakeMovePayload, callback?: (res: any) => void) => {
      try {
        const result = roomManager.makeMove(payload.roomId, payload.playerId, payload.cellId);
        if (callback) callback(result);

        if (result.success && result.room && result.result) {
          // Broadcast authoritative move outcome and state update to all players
          io.to(result.room.roomId).emit('game:move_made', {
            gameState: result.room.gameState,
            moveResult: result.result,
          });
          io.to(result.room.roomId).emit('room:updated', result.room);
        }
      } catch (err: any) {
        if (callback) callback({ success: false, error: err?.message || 'Server error' });
      }
    });

    // 6. Restart Match / Rematch
    socket.on('game:restart', (payload: { roomId: string; playerId: string }, callback?: (res: any) => void) => {
      try {
        const result = roomManager.restartGame(payload.roomId, payload.playerId);
        if (callback) callback(result);
        if (result.success && result.room) {
          io.to(result.room.roomId).emit('room:updated', result.room);
        }
      } catch (err: any) {
        if (callback) callback({ success: false, error: err?.message || 'Server error' });
      }
    });

    // 7. Explicit Leave
    socket.on('room:leave', (_data: any, callback?: () => void) => {
      try {
        const { room, playerId, shouldNotify } = roomManager.leaveRoom(socket.id);
        if (room && shouldNotify) {
          socket.leave(room.roomId);
          io.to(room.roomId).emit('room:updated', room);
        }
        if (callback) callback();
      } catch {
        if (callback) callback();
      }
    });

    // 8. Disconnect Handling
    socket.on('disconnect', () => {
      try {
        const { room, player } = roomManager.handleSocketDisconnect(socket.id);
        if (room && player) {
          io.to(room.roomId).emit('room:updated', room);
          io.to(room.roomId).emit('room:player_disconnected', {
            playerId: player.id,
            playerName: player.name,
          });
        }
      } catch {
        // Disconnect cleanup error safely suppressed
      }
    });
  });

  // Health and stats API
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      activeRooms: roomManager.getActiveRoomCount(),
      timestamp: Date.now(),
    });
  });

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isBundled = __filename.endsWith('server.js');
  const isProd = isBundled || process.env.NODE_ENV === 'production' || (process.env.NODE_ENV !== 'development' && hasDist);
  const PORT = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    console.error('Fatal HTTP server error:', err);
    process.exit(1);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Pyramid Row Master Server listening on port ${PORT} [${isProd ? 'PROD' : 'DEV'}]`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Gracefully closing HTTP and WebSocket server...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
