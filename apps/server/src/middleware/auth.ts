import type { FastifyRequest, FastifyReply } from 'fastify';

// JWT payload 类型
export interface JwtPayload {
  id: string;
  email: string;
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization Bearer token
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 验证 JWT token
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
}

/**
 * 可选认证中间件
 * 如果有 token 则验证，否则继续
 */
export async function optionalAuth(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    // 忽略错误，用户未登录也可以继续
  }
}
