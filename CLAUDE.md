# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

德州扑克小程序游戏，使用 Taro + React 开发前端，微信云开发（云函数 + 云数据库）作为后端。使用 pnpm workspaces 管理 monorepo。

## 常用命令

```bash
# 开发
pnpm dev              # 启动小程序开发服务器
pnpm dev:miniapp      # 同上

# 构建
pnpm build            # 构建所有包
pnpm build:miniapp    # 构建小程序

# 代码质量
pnpm lint             # 运行所有项目的 ESLint
pnpm typecheck        # 运行所有项目的类型检查

# 清理
pnpm clean            # 清理所有构建产物和 node_modules
```

## 项目架构

```
holdem-monorepo/
├── apps/
│   └── miniapp/                # Taro 小程序前端
│       └── src/
│           ├── pages/          # 页面
│           ├── components/     # 组件
│           │   ├── common/     # 通用组件
│           │   ├── game/       # 游戏组件
│           │   │   ├── canvas/ # Canvas 渲染（牌桌/扑克/筹码动画）
│           │   │   └── ui/     # 游戏 UI 组件（操作栏/弹窗）
│           │   └── room/       # 房间组件
│           ├── stores/         # Zustand 状态管理
│           ├── services/       # 云函数调用封装
│           ├── hooks/          # 自定义 Hooks
│           └── assets/         # 静态资源（扑克牌/筹码图片）
│
├── cloudfunctions/             # 微信云函数
│   ├── auth/                   # 认证（登录/注册）
│   ├── user/                   # 用户（签到/历史/统计）
│   ├── room/                   # 房间（创建/加入/入座）
│   ├── game/                   # 游戏（开始/操作/结算）
│   │   └── engine/             # 游戏引擎（牌组/牌型评估/底池计算）
│   └── shared/                 # 共享类型和工具
│
├── packages/
│   ├── shared-types/           # 共享 TypeScript 类型
│   ├── shared-utils/           # 共享工具函数
│   └── rules/                  # 游戏规则文档
│
└── demand/                     # 需求和技术文档
    ├── v1/                     # v1.0 技术方案（Fastify + Zeabur，已废弃）
    └── v1.1/                   # v1.1 技术方案（云开发 + Canvas 2D）
```

## 技术栈

- **前端**: Taro 4.x + React 18 + TypeScript + Canvas 2D
- **状态管理**: Zustand
- **后端**: 微信云函数 (Node.js + TypeScript)
- **数据库**: 微信云数据库 (MongoDB-like)
- **实时通信**: 云数据库 Watch（实时数据推送）

## 开发规范

- **包管理**: pnpm workspaces，内部包使用 `workspace:*` 协议
- **类型导入**: 使用 `import type { Player } from '@holdem/shared-types'`
- **云函数调用**: 通过 `wx.cloud.callFunction` 统一封装在 `services/` 目录

## 云函数接口

```
云函数: auth
  - login          # 微信授权登录/自动注册

云函数: user
  - checkin        # 每日签到
  - getStats       # 获取统计数据
  - getHistory     # 获取游戏历史

云函数: room
  - list           # 房间列表
  - create         # 创建房间
  - join           # 加入房间
  - leave          # 离开房间
  - sit            # 入座
  - stand          # 站起

云函数: game
  - start          # 开始游戏
  - action         # 执行操作（fold/check/call/raise/all_in）
  - ready          # 准备下一局
```

## 实时通信

使用云数据库 Watch 监听游戏状态变化：

```typescript
db.collection('games').doc(gameId).watch({
  onChange: (snapshot) => { /* 更新游戏状态 */ }
})
```

## 数据模型

扑克牌: `Card = "${Rank}${Suit}"` (如 `"As"` = 黑桃A，`"Kh"` = 红桃K)

```typescript
type Suit = 'h' | 'd' | 'c' | 's';  // hearts, diamonds, clubs, spades
type Rank = '2' | ... | 'A';
type PlayerStatus = 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'STANDING' | 'SEATED';
type GamePhase = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
```

## 设计系统

深色牌局主题:
- 背景色: 深黑 `#121214`
- 主色调: 金色 `#D4AF37`
- 牌桌绿: `#1A3D2E`
- 成功色: `#22C55E`
- 失败色: `#EF4444`

## 游戏渲染

游戏页面使用 Canvas 2D（type="2d" 同层渲染）绘制牌桌、扑克牌、筹码动画。
操作栏、弹窗等 UI 使用普通 Taro 组件，通过 z-index 覆盖在 Canvas 上方。

## 注意事项

- Node.js 版本要求: >= 22.0.0
- pnpm 版本要求: >= 9.0.0
- npm 源配置为 npmmirror（国内镜像）
- 游戏页面横屏，其他页面竖屏
- 云函数使用管理员权限绕过安全规则，客户端直接读取受安全规则限制
