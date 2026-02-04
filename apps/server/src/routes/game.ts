import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, GameState, GameActionRequest } from '@holdem/shared-types';

export const gameRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取游戏状态
  fastify.get<{
    Params: { roomId: string };
    Reply: ApiResponse<GameState>;
  }>('/:roomId/state', async (request, reply) => {
    const { roomId } = request.params;

    // TODO: 从实际数据存储获取游戏状态
    const gameState: GameState = {
      roomId,
      phase: 'preflop',
      pot: 0,
      communityCards: [],
      players: [],
      currentPlayerIndex: 0,
      minRaise: 0,
      actions: [],
    };

    return { success: true, data: gameState };
  });

  // 执行游戏动作
  fastify.post<{
    Params: { roomId: string };
    Body: GameActionRequest;
    Reply: ApiResponse<{ success: boolean }>;
  }>('/:roomId/action', async (request, reply) => {
    const { roomId } = request.params;
    const { action } = request.body;

    // TODO: 实现游戏逻辑
    console.log(`Game action in room ${roomId}:`, action);

    return { success: true, data: { success: true } };
  });

  // 开始游戏
  fastify.post<{
    Params: { roomId: string };
    Reply: ApiResponse<{ success: boolean }>;
  }>('/:roomId/start', async (request, reply) => {
    const { roomId } = request.params;

    // TODO: 实现开始游戏逻辑
    console.log(`Starting game in room ${roomId}`);

    return { success: true, data: { success: true } };
  });
};
