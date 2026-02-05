# 构建阶段
FROM node:22-alpine AS builder

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/database/package.json ./packages/database/
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 生成 Prisma Client
RUN pnpm --filter @holdem/database db:generate

# 构建所有包
RUN pnpm --filter @holdem/shared-types build
RUN pnpm --filter @holdem/shared-utils build
RUN pnpm --filter @holdem/database build
RUN pnpm --filter @holdem/web build
RUN pnpm --filter @holdem/server build

# 生产阶段
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# 复制必要文件
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps

# 安装 serve 用于前端静态服务
RUN npm install -g serve

# 默认端口
ENV PORT=3000

# 启动脚本 - 通过 APP_TYPE 环境变量决定启动哪个服务
# APP_TYPE=server 启动后端，否则启动前端
CMD if [ "$APP_TYPE" = "server" ]; then \
      cd /app/apps/server && node dist/index.js; \
    else \
      serve /app/apps/web/dist -s -l $PORT; \
    fi
