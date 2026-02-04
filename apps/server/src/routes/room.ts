import type { FastifyPluginAsync } from 'fastify';
import type {
  Room,
  RoomDetail,
  CreateRoomRequest,
  JoinRoomRequest,
  ApiResponse,
  PaginatedResponse,
  GamePhase,
} from '@holdem/shared-types';
import { generateId } from '@holdem/shared-utils';

// 模拟数据存储（实际应用中使用数据库）
const rooms = new Map<string, RoomDetail>();

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取房间列表
  fastify.get<{
    Querystring: { page?: string; pageSize?: string; status?: string };
    Reply: ApiResponse<PaginatedResponse<Room>>;
  }>('/', async (request) => {
    const page = parseInt(request.query.page || '1', 10);
    const pageSize = parseInt(request.query.pageSize || '10', 10);
    const status = request.query.status;

    let roomList = Array.from(rooms.values()).map(
      ({ players, communityCards, currentPhase, currentPlayerIndex, dealerIndex, createdAt, ...room }) => room
    );

    if (status) {
      roomList = roomList.filter((r) => r.status === status);
    }

    const total = roomList.length;
    const items = roomList.slice((page - 1) * pageSize, page * pageSize);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
  });

  // 获取房间详情
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<RoomDetail>;
  }>('/:id', async (request, reply) => {
    const room = rooms.get(request.params.id);

    if (!room) {
      return reply.code(404).send({
        success: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
      });
    }

    return { success: true, data: room };
  });

  // 创建房间
  fastify.post<{
    Body: CreateRoomRequest;
    Reply: ApiResponse<{ roomId: string }>;
  }>('/', async (request, reply) => {
    const { name, smallBlind, bigBlind, maxPlayers, minBuyIn, maxBuyIn } = request.body;

    const roomId = generateId('room');

    const newRoom: RoomDetail = {
      id: roomId,
      name,
      smallBlind,
      bigBlind,
      maxPlayers,
      minBuyIn,
      maxBuyIn,
      playersCount: 0,
      status: 'waiting',
      players: [],
      communityCards: [],
      pot: 0,
      currentPhase: 'preflop' as GamePhase,
      currentPlayerIndex: 0,
      dealerIndex: 0,
      createdAt: Date.now(),
    };

    rooms.set(roomId, newRoom);

    return reply.code(201).send({
      success: true,
      data: { roomId },
    });
  });

  // 加入房间
  fastify.post<{
    Params: { id: string };
    Body: JoinRoomRequest;
    Reply: ApiResponse<{ success: boolean }>;
  }>('/:id/join', async (request, reply) => {
    const room = rooms.get(request.params.id);

    if (!room) {
      return reply.code(404).send({
        success: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
      });
    }

    if (room.playersCount >= room.maxPlayers) {
      return reply.code(400).send({
        success: false,
        error: { code: 'ROOM_FULL', message: 'Room is full' },
      });
    }

    const { playerId, buyIn, seatIndex } = request.body;

    room.players.push({
      id: playerId,
      name: `Player_${playerId.slice(-4)}`,
      chips: buyIn,
      status: 'waiting',
      seatIndex: seatIndex ?? room.players.length,
    });
    room.playersCount++;

    return { success: true, data: { success: true } };
  });

  // 离开房间
  fastify.post<{
    Params: { id: string };
    Body: { playerId: string };
    Reply: ApiResponse<{ success: boolean }>;
  }>('/:id/leave', async (request, reply) => {
    const room = rooms.get(request.params.id);

    if (!room) {
      return reply.code(404).send({
        success: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
      });
    }

    const playerIndex = room.players.findIndex((p) => p.id === request.body.playerId);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      room.playersCount--;
    }

    return { success: true, data: { success: true } };
  });
};
