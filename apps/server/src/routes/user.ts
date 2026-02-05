import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, PaginatedResponse } from '@holdem/shared-types';
import { userService, type UserPublicInfo, type UserStatistics, type UpdateUserInput } from '../services/user.service';
import { authenticate } from '../middleware/auth';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取用户公开信息
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<UserPublicInfo>;
  }>('/:id', async (request, reply) => {
    const user = await userService.getUser(request.params.id);

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return { success: true, data: user };
  });

  // 获取用户统计数据
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<UserStatistics>;
  }>('/:id/stats', async (request, reply) => {
    const stats = await userService.getUserStatistics(request.params.id);

    if (!stats) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return { success: true, data: stats };
  });

  // 更新用户信息（需要认证）
  fastify.patch<{
    Params: { id: string };
    Body: UpdateUserInput;
    Reply: ApiResponse<UserPublicInfo>;
  }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = request.user as { id: string };

    // 只能更新自己的信息
    if (payload.id !== request.params.id) {
      return reply.code(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot update other users' },
      });
    }

    try {
      const user = await userService.updateUser(request.params.id, request.body);
      return { success: true, data: user };
    } catch {
      return reply.code(500).send({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update user' },
      });
    }
  });

  // 获取用户对局历史
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: string; pageSize?: string };
    Reply: ApiResponse<PaginatedResponse<unknown>>;
  }>('/:id/games', async (request, reply) => {
    const page = parseInt(request.query.page || '1', 10);
    const pageSize = parseInt(request.query.pageSize || '10', 10);

    try {
      const games = await userService.getUserGames(request.params.id, { page, pageSize });
      return { success: true, data: games };
    } catch {
      return reply.code(500).send({
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch game history' },
      });
    }
  });
};
