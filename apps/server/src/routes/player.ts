import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, Player } from '@holdem/shared-types';
import { generateId } from '@holdem/shared-utils';

// 模拟玩家数据存储
const players = new Map<string, Player>();

export const playerRoutes: FastifyPluginAsync = async (fastify) => {
  // 创建/注册玩家
  fastify.post<{
    Body: { name: string; avatar?: string };
    Reply: ApiResponse<Player>;
  }>('/', async (request, reply) => {
    const { name, avatar } = request.body;

    const playerId = generateId('player');
    const player: Player = {
      id: playerId,
      name,
      avatar,
      chips: 10000, // 初始筹码
    };

    players.set(playerId, player);

    return reply.code(201).send({
      success: true,
      data: player,
    });
  });

  // 获取玩家信息
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<Player>;
  }>('/:id', async (request, reply) => {
    const player = players.get(request.params.id);

    if (!player) {
      return reply.code(404).send({
        success: false,
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' },
      });
    }

    return { success: true, data: player };
  });

  // 更新玩家信息
  fastify.patch<{
    Params: { id: string };
    Body: Partial<Pick<Player, 'name' | 'avatar'>>;
    Reply: ApiResponse<Player>;
  }>('/:id', async (request, reply) => {
    const player = players.get(request.params.id);

    if (!player) {
      return reply.code(404).send({
        success: false,
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' },
      });
    }

    const { name, avatar } = request.body;
    if (name) player.name = name;
    if (avatar) player.avatar = avatar;

    return { success: true, data: player };
  });
};
