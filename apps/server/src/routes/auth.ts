import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse } from '@holdem/shared-types';
import { authService, type AuthUser } from '../services/auth.service';
import { authenticate } from '../middleware/auth';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // 注册
  fastify.post<{
    Body: RegisterBody;
    Reply: ApiResponse<AuthResponse>;
  }>('/register', async (request, reply) => {
    try {
      const { email, password, name } = request.body;

      // 验证输入
      if (!email || !password || !name) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Email, password and name are required',
          },
        });
      }

      if (password.length < 6) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 6 characters',
          },
        });
      }

      const user = await authService.register({ email, password, name });

      // 生成 JWT token
      const token = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: '7d' }
      );

      return reply.code(201).send({
        success: true,
        data: { user, token },
      });
    } catch (err) {
      const error = err as Error;

      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email is already registered',
          },
        });
      }

      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
        },
      });
    }
  });

  // 登录
  fastify.post<{
    Body: LoginBody;
    Reply: ApiResponse<AuthResponse>;
  }>('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Email and password are required',
          },
        });
      }

      const user = await authService.login({ email, password });

      // 生成 JWT token
      const token = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: '7d' }
      );

      return {
        success: true,
        data: { user, token },
      };
    } catch (err) {
      const error = err as Error;

      if (error.message === 'INVALID_CREDENTIALS') {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }

      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
        },
      });
    }
  });

  // 获取当前用户信息
  fastify.get<{
    Reply: ApiResponse<AuthUser>;
  }>('/me', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const payload = request.user as { id: string };
      const user = await authService.getUserById(payload.id);

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      return { success: true, data: user };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user info',
        },
      });
    }
  });
};
