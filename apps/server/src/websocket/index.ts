import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket, RawData } from 'ws';
import type { WsMessage, GameAction } from '@holdem/shared-types';
import { roomService } from '../services/room.service.js';

interface Client {
  ws: WebSocket;
  playerId: string;
  roomId: string;
  lastHeartbeat: number;
}

const clients = new Map<string, Client>();
const roomClients = new Map<string, Set<string>>();

export const websocketHandler: FastifyPluginAsync = async (fastify) => {
  fastify.get('/game/:roomId', { websocket: true }, (socket, request) => {
    const { roomId } = request.params as { roomId: string };
    const playerId = (request.query as { playerId?: string }).playerId || `guest_${Date.now()}`;

    // 注册客户端
    const clientId = `${roomId}:${playerId}`;
    clients.set(clientId, {
      ws: socket,
      playerId,
      roomId,
      lastHeartbeat: Date.now(),
    });

    if (!roomClients.has(roomId)) {
      roomClients.set(roomId, new Set());
    }
    roomClients.get(roomId)!.add(clientId);

    // 广播玩家加入
    broadcastToRoom(
      roomId,
      {
        type: 'PLAYER_JOINED',
        payload: { playerId },
        timestamp: Date.now(),
      },
      clientId
    );

    // 消息处理
    socket.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        handleMessage(clientId, message);
      } catch (err) {
        console.error('Invalid message format:', err);
      }
    });

    // 连接关闭
    socket.on('close', async () => {
      clients.delete(clientId);
      roomClients.get(roomId)?.delete(clientId);

      // 调用离开房间服务，更新数据库
      try {
        await roomService.leaveRoom(roomId, playerId);
        console.log(`Player ${playerId} left room ${roomId} via WebSocket disconnect`);
      } catch (err) {
        // 玩家可能已经通过 API 离开，忽略错误
        console.log(`Player ${playerId} was not in room ${roomId} (already left)`);
      }

      broadcastToRoom(roomId, {
        type: 'PLAYER_LEFT',
        payload: { playerId },
        timestamp: Date.now(),
      });

      if (roomClients.get(roomId)?.size === 0) {
        roomClients.delete(roomId);
      }
    });

    // 心跳响应
    socket.on('pong', () => {
      const client = clients.get(clientId);
      if (client) {
        client.lastHeartbeat = Date.now();
      }
    });
  });
};

function handleMessage(clientId: string, message: WsMessage) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'GAME_ACTION':
      handleGameAction(client, message.payload as GameAction);
      break;
    case 'HEARTBEAT':
      client.lastHeartbeat = Date.now();
      sendToClient(clientId, { type: 'HEARTBEAT', payload: { pong: true }, timestamp: Date.now() });
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
}

function handleGameAction(client: Client, action: GameAction) {
  // 游戏逻辑处理（此处简化）
  broadcastToRoom(client.roomId, {
    type: 'GAME_ACTION',
    payload: {
      playerId: client.playerId,
      action,
    },
    timestamp: Date.now(),
  });
}

function broadcastToRoom(roomId: string, message: WsMessage, excludeClientId?: string) {
  const clientIds = roomClients.get(roomId);
  if (!clientIds) return;

  const data = JSON.stringify(message);
  for (const clientId of clientIds) {
    if (clientId === excludeClientId) continue;
    const client = clients.get(clientId);
    if (client?.ws.readyState === 1) {
      // WebSocket.OPEN
      client.ws.send(data);
    }
  }
}

function sendToClient(clientId: string, message: WsMessage) {
  const client = clients.get(clientId);
  if (client?.ws.readyState === 1) {
    client.ws.send(JSON.stringify(message));
  }
}

// 心跳检测定时器
setInterval(() => {
  const now = Date.now();
  for (const [clientId, client] of clients) {
    if (now - client.lastHeartbeat > 30000) {
      client.ws.terminate();
      clients.delete(clientId);
      roomClients.get(client.roomId)?.delete(clientId);
    } else {
      client.ws.ping();
    }
  }
}, 10000);
