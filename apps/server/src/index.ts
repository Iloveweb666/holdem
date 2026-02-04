import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

import { roomRoutes } from './routes/room.js';
import { gameRoutes } from './routes/game.js';
import { playerRoutes } from './routes/player.js';
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

await fastify.register(websocket);

// 注册路由
await fastify.register(roomRoutes, { prefix: '/api/rooms' });
await fastify.register(gameRoutes, { prefix: '/api/game' });
await fastify.register(playerRoutes, { prefix: '/api/players' });

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
