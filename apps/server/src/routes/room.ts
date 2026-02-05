import type { FastifyPluginAsync } from 'fastify';
import type {
  Room,
  CreateRoomRequest,
  JoinRoomRequest,
  ApiResponse,
  PaginatedResponse,
} from '@holdem/shared-types';
import { RoomStatus } from '@holdem/database';
import { roomService } from '../services/room.service';
import { authenticate } from '../middleware/auth';

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取房间列表
  fastify.get<{
    Querystring: { page?: string; pageSize?: string; status?: string };
    Reply: ApiResponse<PaginatedResponse<Room>>;
  }>('/', async (request) => {
    const page = parseInt(request.query.page || '1', 10);
    const pageSize = parseInt(request.query.pageSize || '10', 10);
    const status = request.query.status as RoomStatus | undefined;

    const result = await roomService.getRooms({ page, pageSize, status });

    return {
      success: true,
      data: result,
    };
  });

  // 获取房间详情
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<unknown>;
  }>('/:id', async (request, reply) => {
    const room = await roomService.getRoom(request.params.id);

    if (!room) {
      return reply.code(404).send({
        success: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
      });
    }

    return { success: true, data: room };
  });

  // 创建房间（需要认证）
  fastify.post<{
    Body: CreateRoomRequest;
    Reply: ApiResponse<{ roomId: string }>;
  }>('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { name, smallBlind, bigBlind, maxPlayers, minBuyIn, maxBuyIn } = request.body;

    // 验证输入
    if (!name || !smallBlind || !bigBlind) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Name, smallBlind and bigBlind are required' },
      });
    }

    try {
      const room = await roomService.createRoom({
        name,
        smallBlind,
        bigBlind,
        maxPlayers,
        minBuyIn,
        maxBuyIn,
      });

      return reply.code(201).send({
        success: true,
        data: { roomId: room.id },
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: { code: 'CREATE_FAILED', message: 'Failed to create room' },
      });
    }
  });

  // 加入房间（需要认证）
  fastify.post<{
    Params: { id: string };
    Body: JoinRoomRequest;
    Reply: ApiResponse<{ success: boolean; seatIndex: number }>;
  }>('/:id/join', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = request.user as { id: string };
    const { buyIn, seatIndex } = request.body;

    try {
      const result = await roomService.joinRoom({
        roomId: request.params.id,
        userId: payload.id,
        buyIn,
        seatIndex,
      });

      return { success: true, data: result };
    } catch (err) {
      const error = err as Error;
      const errorMap: Record<string, { code: number; message: string }> = {
        ROOM_NOT_FOUND: { code: 404, message: 'Room not found' },
        ROOM_FULL: { code: 400, message: 'Room is full' },
        ALREADY_IN_ROOM: { code: 400, message: 'Already in this room' },
        BUY_IN_TOO_LOW: { code: 400, message: 'Buy-in amount too low' },
        BUY_IN_TOO_HIGH: { code: 400, message: 'Buy-in amount too high' },
        INSUFFICIENT_CHIPS: { code: 400, message: 'Insufficient chips' },
        NO_AVAILABLE_SEAT: { code: 400, message: 'No available seat' },
      };

      const errorInfo = errorMap[error.message] || { code: 500, message: 'Failed to join room' };

      return reply.code(errorInfo.code).send({
        success: false,
        error: { code: error.message, message: errorInfo.message },
      });
    }
  });

  // 离开房间（需要认证）
  fastify.post<{
    Params: { id: string };
    Reply: ApiResponse<{ success: boolean; returnedChips: number }>;
  }>('/:id/leave', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = request.user as { id: string };

    try {
      const result = await roomService.leaveRoom(request.params.id, payload.id);
      return { success: true, data: result };
    } catch (err) {
      const error = err as Error;

      if (error.message === 'NOT_IN_ROOM') {
        return reply.code(400).send({
          success: false,
          error: { code: 'NOT_IN_ROOM', message: 'Not in this room' },
        });
      }

      return reply.code(500).send({
        success: false,
        error: { code: 'LEAVE_FAILED', message: 'Failed to leave room' },
      });
    }
  });
};
