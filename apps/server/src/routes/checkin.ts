import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse } from '@holdem/shared-types';
import {
  checkinService,
  type CheckinResult,
  type CheckinStatus,
} from '../services/checkin.service';
import { authenticate } from '../middleware/auth';

export const checkinRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取签到状态
  fastify.get<{
    Reply: ApiResponse<CheckinStatus>;
  }>('/status', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const payload = request.user as { id: string };
      const status = await checkinService.getStatus(payload.id);

      return {
        success: true,
        data: status,
      };
    } catch (err) {
      const error = err as Error;

      if (error.message === 'USER_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get checkin status',
        },
      });
    }
  });

  // 执行签到
  fastify.post<{
    Reply: ApiResponse<CheckinResult>;
  }>('/', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const payload = request.user as { id: string };
      const result = await checkinService.checkin(payload.id);

      return {
        success: true,
        data: result,
      };
    } catch (err) {
      const error = err as Error;

      if (error.message === 'USER_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (error.message === 'ALREADY_CHECKED_IN') {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'ALREADY_CHECKED_IN',
            message: 'You have already checked in today',
          },
        });
      }

      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Checkin failed',
        },
      });
    }
  });
};
