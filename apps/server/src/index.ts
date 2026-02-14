import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';

import { authRoutes } from './routes/auth.js';
import { roomRoutes } from './routes/room.js';
import { gameRoutes } from './routes/game.js';
import { userRoutes } from './routes/user.js';
import { checkinRoutes } from './routes/checkin.js';
import { uploadRoutes } from './routes/upload.js';
import { websocketHandler } from './websocket/index.js';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// 注册插件
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});

// JWT 插件
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'holdem-dev-secret-change-in-production',
});

// 添加 JWT 验证装饰器
fastify.decorate('authenticate', async function (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

await fastify.register(websocket);

// 文件上传插件
await fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// 静态文件服务（用于访问上传的文件）
await fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
});

// 注册路由
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(roomRoutes, { prefix: '/api/rooms' });
await fastify.register(gameRoutes, { prefix: '/api/game' });
await fastify.register(userRoutes, { prefix: '/api/users' });
await fastify.register(checkinRoutes, { prefix: '/api/checkin' });
await fastify.register(uploadRoutes, { prefix: '/api/upload' });

// WebSocket 处理
await fastify.register(websocketHandler, { prefix: '/ws' });

// 健康检查
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// 启动服务器
const start = async () => {
  try {
    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000', 10);

    await fastify.listen({ host, port });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
