import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse } from '@holdem/shared-types';
import { authenticate } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface UploadResponse {
  url: string;
}

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // 上传头像
  fastify.post<{
    Reply: ApiResponse<UploadResponse>;
  }>('/avatar', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const payload = request.user as { id: string };
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
        });
      }

      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only JPEG, PNG, GIF and WebP images are allowed',
          },
        });
      }

      // 生成文件名
      const ext = path.extname(data.filename) || '.jpg';
      const filename = `${payload.id}_${Date.now()}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      // 保存文件
      await pipeline(data.file, fs.createWriteStream(filepath));

      // 返回可访问的 URL
      const url = `/uploads/avatars/${filename}`;

      return {
        success: true,
        data: { url },
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload file',
        },
      });
    }
  });
};
