import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse } from '@holdem/shared-types';
import { ActionType } from '@holdem/database';
import { gameService } from '../services/game.service';
import { roomService } from '../services/room.service';
import { authenticate } from '../middleware/auth';

interface GameActionBody {
  actionType: string;
  amount?: number;
}

export const gameRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取游戏状态
  fastify.get<{
    Params: { roomId: string };
    Reply: ApiResponse<unknown>;
  }>('/:roomId/state', async (request, reply) => {
    const room = await roomService.getRoom(request.params.roomId);

    if (!room) {
      return reply.code(404).send({
        success: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
      });
    }

    return {
      success: true,
      data: {
        roomId: room.id,
        phase: room.currentGame?.phase || 'waiting',
        pot: room.currentGame?.pot || 0,
        communityCards: room.currentGame?.communityCards || [],
        players: room.players,
        currentPlayerIndex: room.currentGame?.currentPlayerIndex || 0,
      },
    };
  });

  // 执行游戏动作（需要认证）
  fastify.post<{
    Params: { roomId: string };
    Body: GameActionBody;
    Reply: ApiResponse<{ success: boolean }>;
  }>('/:roomId/action', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = request.user as { id: string };
    const { actionType, amount } = request.body;

    // 获取当前房间的游戏
    const room = await roomService.getRoom(request.params.roomId);

    if (!room || !room.currentGame) {
      return reply.code(404).send({
        success: false,
        error: { code: 'GAME_NOT_FOUND', message: 'No active game in this room' },
      });
    }

    try {
      // 验证 actionType 是有效的枚举值
      const validActions = Object.values(ActionType);
      if (!validActions.includes(actionType as ActionType)) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_ACTION', message: 'Invalid action type' },
        });
      }

      await gameService.recordAction({
        gameId: room.currentGame.id,
        userId: payload.id,
        actionType: actionType as ActionType,
        amount,
      });

      return { success: true, data: { success: true } };
    } catch (err) {
      const error = err as Error;
      const errorMap: Record<string, { code: number; message: string }> = {
        GAME_NOT_FOUND: { code: 404, message: 'Game not found' },
        GAME_ENDED: { code: 400, message: 'Game has ended' },
        PLAYER_NOT_IN_GAME: { code: 403, message: 'Not in this game' },
      };

      const errorInfo = errorMap[error.message] || { code: 500, message: 'Action failed' };

      return reply.code(errorInfo.code).send({
        success: false,
        error: { code: error.message, message: errorInfo.message },
      });
    }
  });

  // 开始游戏（需要认证）
  fastify.post<{
    Params: { roomId: string };
    Reply: ApiResponse<{ gameId: string }>;
  }>('/:roomId/start', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const game = await gameService.startGame(request.params.roomId);

      return {
        success: true,
        data: { gameId: game.id },
      };
    } catch (err) {
      const error = err as Error;
      const errorMap: Record<string, { code: number; message: string }> = {
        ROOM_NOT_FOUND: { code: 404, message: 'Room not found' },
        NOT_ENOUGH_PLAYERS: { code: 400, message: 'Need at least 2 players to start' },
        GAME_IN_PROGRESS: { code: 400, message: 'A game is already in progress' },
      };

      const errorInfo = errorMap[error.message] || { code: 500, message: 'Failed to start game' };

      return reply.code(errorInfo.code).send({
        success: false,
        error: { code: error.message, message: errorInfo.message },
      });
    }
  });

  // 获取游戏详情
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<unknown>;
  }>('/detail/:id', async (request, reply) => {
    const game = await gameService.getGame(request.params.id);

    if (!game) {
      return reply.code(404).send({
        success: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Game not found' },
      });
    }

    return { success: true, data: game };
  });

  // 获取游戏动作历史
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<unknown>;
  }>('/detail/:id/actions', async (request, reply) => {
    const actions = await gameService.getGameActions(request.params.id);

    return { success: true, data: actions };
  });
};
