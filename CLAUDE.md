# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

德州扑克游戏 Monorepo，包含移动端 Web 客户端和 Fastify 后端服务。使用 pnpm workspaces 管理，支持 Docker 容器化部署。

## 常用命令

```bash
# 开发
pnpm dev              # 并行启动前后端开发服务器
pnpm dev:web          # 仅启动前端 (http://localhost:5173)
pnpm dev:server       # 仅启动后端 (http://localhost:3000)

# 构建
pnpm build            # 构建所有包和应用
pnpm build:web        # 仅构建前端
pnpm build:server     # 仅构建后端

# 代码质量
pnpm lint             # 运行所有项目的 ESLint
pnpm typecheck        # 运行所有项目的类型检查

# Docker
pnpm docker:build     # 构建 Docker 镜像
pnpm docker:up        # 启动容器
pnpm docker:down      # 停止容器
```

## 项目架构

```
holdem-monorepo/
├── apps/
│   ├── web/                    # React 前端应用
│   │   ├── src/
│   │   │   ├── components/     # UI 组件
│   │   │   │   ├── ui/         # shadcn/ui 组件库
│   │   │   │   ├── PlayerSeat.tsx
│   │   │   │   ├── PlayingCard.tsx
│   │   │   │   └── RoomCard.tsx
│   │   │   ├── pages/          # 页面组件
│   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   └── lib/            # 工具函数
│   │   └── vite.config.ts
│   │
│   └── server/                 # Fastify 后端服务
│       └── src/
│           ├── routes/         # API 路由 (room, game, player)
│           ├── websocket/      # WebSocket 处理
│           └── index.ts        # 服务入口
│
├── packages/
│   ├── shared-types/           # 共享 TypeScript 类型
│   │   └── src/
│   │       ├── poker.ts        # 扑克相关类型 (Player, Room, Card)
│   │       └── api.ts          # API 请求/响应类型
│   │
│   └── shared-utils/           # 共享工具函数
│
└── docker/                     # Docker 部署配置
    ├── docker-compose.yml
    ├── Dockerfile.web
    ├── Dockerfile.server
    └── nginx/nginx.conf
```

## 开发规范

- **包管理**: pnpm workspaces，内部包使用 `workspace:*` 协议
- **类型导入**: 使用 `import type { Player } from '@holdem/shared-types'`
- **前端路径别名**: `@/` 指向 `apps/web/src/`
- **样式**: Tailwind CSS v4，使用 `cn()` 合并条件类名
- **组件库**: shadcn/ui "new-york" 风格，图标使用 lucide-react

## API 端点

```
GET  /api/rooms           # 房间列表
GET  /api/rooms/:id       # 房间详情
POST /api/rooms           # 创建房间
POST /api/rooms/:id/join  # 加入房间
POST /api/rooms/:id/leave # 离开房间

GET  /api/game/:roomId/state   # 游戏状态
POST /api/game/:roomId/action  # 执行动作
POST /api/game/:roomId/start   # 开始游戏

WS   /ws/game/:roomId     # WebSocket 实时通信
GET  /health              # 健康检查
```

## 数据模型

扑克牌: `Card = "${Rank}${Suit}"` (如 `"As"` = 黑桃A，`"Kh"` = 红桃K)

```typescript
type Suit = 'h' | 'd' | 'c' | 's';  // hearts, diamonds, clubs, spades
type Rank = '2' | ... | 'A';
type PlayerStatus = 'active' | 'folded' | 'all-in' | 'waiting';
type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
```

## 设计系统

深色赌场主题（定义在 `apps/web/src/index.css`）:
- 背景色: 深黑 `rgb(18, 18, 20)`
- 主色调: 金色 `rgb(212, 175, 55)`
- 强调色: 扑克绿 `rgb(53, 101, 77)`

## 注意事项

- Node.js 版本要求: >= 22.0.0
- pnpm 版本要求: >= 9.0.0
- TypeScript 严格模式已禁用（前端）
- npm 源配置为 npmmirror（国内镜像）
