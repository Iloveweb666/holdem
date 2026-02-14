# 后端技术方案 - Fastify 服务

> 版本：v1.0
> 更新日期：2026-02-11

---

## 1. 技术选型

### 1.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Fastify | 5.x | Web 框架 |
| TypeScript | 5.x | 类型安全 |
| Node.js | 22.x | 运行时 |

### 1.2 核心插件

| 插件 | 版本 | 用途 |
|------|------|------|
| @fastify/cors | 10.x | 跨域处理 |
| @fastify/jwt | 9.x | JWT 认证 |
| @fastify/websocket | 11.x | WebSocket 支持 |
| @fastify/rate-limit | 10.x | 请求频率限制 |
| @fastify/helmet | 12.x | 安全头 |

### 1.3 数据库

| 技术 | 版本 | 用途 |
|------|------|------|
| Prisma | 6.x | ORM |
| PostgreSQL | 16.x | 数据库 |

### 1.4 认证

| 技术 | 版本 | 用途 |
|------|------|------|
| bcryptjs | 2.x | 密码哈希 |
| jsonwebtoken | - | JWT 生成/验证 |

### 1.5 工具库

| 技术 | 用途 |
|------|------|
| pino-pretty | 日志格式化 |
| zod | 请求验证 |
| dayjs | 日期处理 |

---

## 2. 项目结构

```
apps/server/
├── src/
│   ├── index.ts                 # 应用入口
│   │
│   ├── config/                  # 配置
│   │   ├── index.ts
│   │   ├── env.ts               # 环境变量
│   │   └── constants.ts         # 常量
│   │
│   ├── routes/                  # API 路由
│   │   ├── index.ts             # 路由注册
│   │   ├── auth.ts              # 认证路由
│   │   ├── user.ts              # 用户路由
│   │   ├── room.ts              # 房间路由
│   │   └── game.ts              # 游戏路由
│   │
│   ├── services/                # 业务逻辑层
│   │   ├── auth.service.ts      # 认证服务
│   │   ├── user.service.ts      # 用户服务
│   │   ├── room.service.ts      # 房间服务
│   │   ├── game.service.ts      # 游戏服务
│   │   └── checkin.service.ts   # 签到服务
│   │
│   ├── middleware/              # 中间件
│   │   ├── auth.ts              # 认证中间件
│   │   └── error.ts             # 错误处理
│   │
│   ├── websocket/               # WebSocket 处理
│   │   ├── index.ts             # 入口
│   │   ├── handlers/            # 消息处理器
│   │   │   ├── room.handler.ts
│   │   │   └── game.handler.ts
│   │   └── managers/            # 连接管理
│   │       ├── connection.ts
│   │       └── room.ts
│   │
│   ├── game/                    # 游戏核心逻辑
│   │   ├── engine.ts            # 游戏引擎
│   │   ├── deck.ts              # 牌组
│   │   ├── hand-evaluator.ts    # 牌型评估
│   │   └── pot-calculator.ts    # 底池计算
│   │
│   ├── schemas/                 # Zod 验证 Schema
│   │   ├── auth.schema.ts
│   │   ├── room.schema.ts
│   │   └── game.schema.ts
│   │
│   ├── types/                   # 类型定义
│   │   ├── fastify.d.ts         # Fastify 扩展
│   │   └── index.ts
│   │
│   └── utils/                   # 工具函数
│       ├── crypto.ts            # 加密工具
│       └── response.ts          # 响应格式化
│
├── package.json
├── tsconfig.json
└── eslint.config.js
```

---

## 3. API 设计

### 3.1 认证模块 (/api/auth)

#### 3.1.1 微信登录

```
POST /api/auth/wechat-login

Request:
{
  "code": "微信登录 code"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cuid_xxx",
    "name": "用户昵称",
    "avatar": "https://...",
    "chips": 10000
  }
}
```

**业务流程**：
1. 接收微信小程序 `wx.login()` 返回的 code
2. 调用微信 `code2Session` 接口获取 openid
3. 根据 openid 查找或创建用户
4. 生成 JWT 返回

#### 3.1.2 获取当前用户

```
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "id": "cuid_xxx",
  "name": "用户昵称",
  "avatar": "https://...",
  "chips": 10000,
  "createdAt": "2026-02-11T00:00:00Z"
}
```

### 3.2 用户模块 (/api/users)

#### 3.2.1 获取用户统计

```
GET /api/users/:id/stats
Authorization: Bearer <token>

Response:
{
  "totalGames": 100,
  "wins": 45,
  "winRate": 0.45,
  "totalWinnings": 50000,
  "totalLosses": 30000
}
```

#### 3.2.2 每日签到

```
POST /api/users/checkin
Authorization: Bearer <token>

Response:
{
  "success": true,
  "reward": 1000,
  "consecutiveDays": 3,
  "nextReward": 1500
}
```

**签到规则**：
- 每日 0 点重置
- 连续签到奖励递增
- 断签重置连续天数

#### 3.2.3 获取游戏历史

```
GET /api/users/:id/history
Authorization: Bearer <token>

Query:
  - page: number (默认 1)
  - limit: number (默认 20)
  - result?: 'win' | 'lose'

Response:
{
  "data": [
    {
      "id": "game_xxx",
      "roomName": "欢乐德扑",
      "result": "win",
      "chipsChange": 2500,
      "playedAt": "2026-02-11T20:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 3.3 房间模块 (/api/rooms)

#### 3.3.1 获取房间列表

```
GET /api/rooms

Query:
  - search?: string (房间名/房间号)
  - status?: 'waiting' | 'playing'
  - page: number (默认 1)
  - limit: number (默认 20)

Response:
{
  "data": [
    {
      "id": "room_xxx",
      "name": "房间 #1234",
      "smallBlind": 10,
      "bigBlind": 20,
      "minBuyIn": 1000,
      "maxBuyIn": 5000,
      "maxPlayers": 8,
      "currentPlayers": 4,
      "status": "waiting"
    }
  ],
  "pagination": { ... }
}
```

#### 3.3.2 创建房间

```
POST /api/rooms
Authorization: Bearer <token>

Request:
{
  "name": "我的房间",
  "bigBlind": 20,
  "minBuyIn": 1000,
  "maxBuyIn": 5000
}

Response:
{
  "id": "room_xxx",
  "name": "我的房间",
  "smallBlind": 10,
  "bigBlind": 20,
  "minBuyIn": 1000,
  "maxBuyIn": 5000,
  "maxPlayers": 8,
  "status": "waiting",
  "createdAt": "2026-02-11T00:00:00Z"
}
```

#### 3.3.3 加入房间

```
POST /api/rooms/:id/join
Authorization: Bearer <token>

Request:
{
  "buyIn": 2000
}

Response:
{
  "success": true,
  "room": { ... },
  "seat": null  // 站立状态
}
```

#### 3.3.4 入座

```
POST /api/rooms/:id/sit
Authorization: Bearer <token>

Request:
{
  "seatIndex": 3
}

Response:
{
  "success": true,
  "seatIndex": 3
}
```

#### 3.3.5 离开房间

```
POST /api/rooms/:id/leave
Authorization: Bearer <token>

Response:
{
  "success": true,
  "chipsReturned": 2500
}
```

### 3.4 游戏模块 (/api/game)

#### 3.4.1 开始游戏

```
POST /api/game/:roomId/start
Authorization: Bearer <token>

Response:
{
  "success": true,
  "gameId": "game_xxx"
}
```

**限制**：仅房主可操作，至少 2 人入座

#### 3.4.2 执行操作

```
POST /api/game/:roomId/action
Authorization: Bearer <token>

Request:
{
  "action": "raise",
  "amount": 100
}

// action 类型：fold | check | call | raise | all_in

Response:
{
  "success": true
}
```

#### 3.4.3 准备下一局

```
POST /api/game/:roomId/ready
Authorization: Bearer <token>

Request:
{
  "ready": true
}

Response:
{
  "success": true
}
```

---

## 4. WebSocket 设计

### 4.1 连接建立

```
URL: wss://api.holdem.example.com/ws/game/:roomId
Query: token=<jwt_token>

// 连接成功后发送
{
  "type": "connected",
  "payload": {
    "userId": "user_xxx",
    "roomId": "room_xxx"
  }
}
```

### 4.2 消息格式

```typescript
interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
}
```

### 4.3 客户端 → 服务端事件

| 事件类型 | Payload | 说明 |
|----------|---------|------|
| `ping` | `{}` | 心跳检测 |
| `room:sit` | `{ seatIndex: number }` | 入座 |
| `room:stand` | `{}` | 站起 |
| `game:action` | `{ action: string, amount?: number }` | 游戏操作 |
| `game:ready` | `{ ready: boolean }` | 准备下一局 |

### 4.4 服务端 → 客户端事件

| 事件类型 | Payload | 说明 |
|----------|---------|------|
| `pong` | `{}` | 心跳响应 |
| `room:update` | `Room` | 房间状态更新 |
| `room:player_join` | `{ player: Player }` | 玩家加入 |
| `room:player_leave` | `{ playerId: string }` | 玩家离开 |
| `room:player_sit` | `{ playerId, seatIndex }` | 玩家入座 |
| `room:player_stand` | `{ playerId }` | 玩家站起 |
| `game:start` | `GameState` | 游戏开始 |
| `game:deal` | `{ cards: Card[] }` | 发私牌（仅发给本人） |
| `game:turn` | `{ playerId, timeout }` | 轮到某玩家 |
| `game:action` | `{ playerId, action, amount }` | 玩家操作 |
| `game:phase` | `{ phase, communityCards }` | 阶段变化 |
| `game:end` | `{ winners, results }` | 游戏结束 |
| `game:ready_status` | `{ readyPlayers }` | 准备状态更新 |
| `error` | `{ code, message }` | 错误消息 |

### 4.5 WebSocket 连接管理

```typescript
// websocket/managers/connection.ts
class ConnectionManager {
  // 用户ID -> WebSocket连接
  private connections = new Map<string, WebSocket>()

  // 房间ID -> 用户ID集合
  private rooms = new Map<string, Set<string>>()

  // 添加连接
  addConnection(userId: string, roomId: string, ws: WebSocket): void

  // 移除连接
  removeConnection(userId: string): void

  // 向房间广播
  broadcastToRoom(roomId: string, message: WebSocketMessage): void

  // 向特定用户发送
  sendToUser(userId: string, message: WebSocketMessage): void
}
```

---

## 5. 游戏引擎设计

### 5.1 游戏状态机

```
            ┌─────────────────────────────────────────────┐
            │                                             │
            ▼                                             │
   ┌─────────────┐                                       │
   │   WAITING   │◄──────────────────────────────────────┤
   └──────┬──────┘                                       │
          │ start()                                      │
          ▼                                              │
   ┌─────────────┐                                       │
   │   PREFLOP   │──┐                                    │
   └──────┬──────┘  │                                    │
          │         │                                    │
          ▼         │ 只剩1人 / All-in                   │
   ┌─────────────┐  │                                    │
   │    FLOP     │──┤                                    │
   └──────┬──────┘  │                                    │
          │         │                                    │
          ▼         ▼                                    │
   ┌─────────────┐  ┌─────────────┐     结算            │
   │    TURN     │──►│  SHOWDOWN   │─────────────────────┘
   └──────┬──────┘  └─────────────┘
          │         ▲
          ▼         │
   ┌─────────────┐  │
   │    RIVER    │──┘
   └─────────────┘
```

### 5.2 牌组管理 (Deck)

```typescript
class Deck {
  private cards: Card[]

  constructor() {
    this.reset()
  }

  // 重置并洗牌
  reset(): void {
    this.cards = []
    const suits: Suit[] = ['h', 'd', 'c', 's']
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(`${rank}${suit}` as Card)
      }
    }
    this.shuffle()
  }

  // Fisher-Yates 洗牌
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  // 发牌
  deal(count: number = 1): Card[] {
    return this.cards.splice(0, count)
  }
}
```

### 5.3 牌型评估 (HandEvaluator)

```typescript
interface HandResult {
  rank: HandRank
  name: string
  cards: Card[]  // 最佳5张牌
  score: number  // 用于比较大小
}

enum HandRank {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

class HandEvaluator {
  // 从7张牌中选出最佳5张
  evaluate(holeCards: Card[], communityCards: Card[]): HandResult

  // 比较两手牌
  compare(hand1: HandResult, hand2: HandResult): -1 | 0 | 1
}
```

### 5.4 底池计算 (PotCalculator)

```typescript
interface Pot {
  amount: number
  eligiblePlayers: string[]  // 有资格赢取此底池的玩家
}

class PotCalculator {
  // 计算底池（处理边池）
  calculate(bets: Map<string, number>, foldedPlayers: Set<string>): Pot[]

  // 分配奖池
  distribute(pots: Pot[], winners: Map<string, HandResult>): Map<string, number>
}
```

---

## 6. 认证与安全

### 6.1 JWT 配置

```typescript
// config/index.ts
export const jwtConfig = {
  secret: process.env.JWT_SECRET!,
  expiresIn: '7d',
}

// JWT Payload
interface JWTPayload {
  sub: string      // 用户ID
  openid: string   // 微信OpenID
  iat: number      // 签发时间
  exp: number      // 过期时间
}
```

### 6.2 微信登录流程

```typescript
// services/auth.service.ts
class AuthService {
  async wechatLogin(code: string): Promise<{ token: string; user: User }> {
    // 1. 调用微信接口获取 session
    const session = await this.getWechatSession(code)

    // 2. 根据 openid 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { openid: session.openid }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          openid: session.openid,
          name: `玩家${randomId()}`,
          chips: 10000,
          statistics: { create: {} }
        }
      })
    }

    // 3. 生成 JWT
    const token = this.generateToken(user)

    return { token, user }
  }

  private async getWechatSession(code: string) {
    const url = `https://api.weixin.qq.com/sns/jscode2session`
    const params = {
      appid: process.env.WX_APPID,
      secret: process.env.WX_SECRET,
      js_code: code,
      grant_type: 'authorization_code'
    }
    // 调用微信API...
  }
}
```

### 6.3 请求频率限制

```typescript
// index.ts
await fastify.register(rateLimit, {
  max: 100,           // 每分钟最多100个请求
  timeWindow: '1 minute',
  allowList: ['127.0.0.1'],
  keyGenerator: (request) => request.user?.id || request.ip,
})

// 特定路由的限制
fastify.post('/api/game/:roomId/action', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '10 seconds'
    }
  }
}, handler)
```

---

## 7. 错误处理

### 7.1 错误码定义

```typescript
// utils/errors.ts
export enum ErrorCode {
  // 认证错误 (1xxx)
  UNAUTHORIZED = 1001,
  TOKEN_EXPIRED = 1002,
  INVALID_TOKEN = 1003,

  // 用户错误 (2xxx)
  USER_NOT_FOUND = 2001,
  INSUFFICIENT_CHIPS = 2002,
  ALREADY_CHECKED_IN = 2003,

  // 房间错误 (3xxx)
  ROOM_NOT_FOUND = 3001,
  ROOM_FULL = 3002,
  NOT_IN_ROOM = 3003,
  SEAT_TAKEN = 3004,
  INVALID_BUY_IN = 3005,

  // 游戏错误 (4xxx)
  GAME_NOT_STARTED = 4001,
  NOT_YOUR_TURN = 4002,
  INVALID_ACTION = 4003,
  INVALID_AMOUNT = 4004,
  GAME_ALREADY_STARTED = 4005,
}
```

### 7.2 统一错误响应

```typescript
// utils/response.ts
interface ErrorResponse {
  success: false
  error: {
    code: number
    message: string
    details?: any
  }
}

export function createError(code: ErrorCode, message?: string): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message: message || getDefaultMessage(code)
    }
  }
}
```

---

## 8. 数据库操作优化

### 8.1 常用查询优化

```typescript
// 获取房间列表（包含玩家数量）
const rooms = await prisma.room.findMany({
  where: { status: 'WAITING' },
  include: {
    _count: {
      select: { players: true }
    }
  },
  orderBy: { createdAt: 'desc' }
})

// 获取游戏详情（关联查询）
const game = await prisma.game.findUnique({
  where: { id: gameId },
  include: {
    room: {
      include: {
        players: {
          include: { user: true }
        }
      }
    },
    actions: {
      orderBy: { createdAt: 'asc' }
    }
  }
})
```

### 8.2 事务处理

```typescript
// 游戏结算（需要原子操作）
await prisma.$transaction(async (tx) => {
  // 1. 更新游戏状态
  await tx.game.update({
    where: { id: gameId },
    data: { endedAt: new Date() }
  })

  // 2. 更新赢家筹码
  for (const [userId, chips] of winners) {
    await tx.user.update({
      where: { id: userId },
      data: { chips: { increment: chips } }
    })
  }

  // 3. 更新统计
  await tx.userStatistics.updateMany({
    where: { userId: { in: Array.from(winners.keys()) } },
    data: {
      wins: { increment: 1 },
      totalWinnings: { increment: winAmount }
    }
  })

  // 4. 创建结果记录
  await tx.gameResult.create({
    data: { gameId, winners: JSON.stringify(results) }
  })
})
```

---

## 9. 环境变量

```env
# 服务器
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# 数据库
DATABASE_URL=postgresql://user:password@host:5432/holdem

# JWT
JWT_SECRET=your-super-secret-key

# 微信小程序
WX_APPID=your-appid
WX_SECRET=your-secret

# CORS
CORS_ORIGIN=https://your-miniapp-domain.com
```

---

## 10. 部署注意事项

### 10.1 健康检查

```typescript
// 深度健康检查
fastify.get('/health/ready', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ready', database: 'connected' }
  } catch (error) {
    throw { statusCode: 503, message: 'Database unavailable' }
  }
})
```

### 10.2 优雅关闭

```typescript
// 处理进程信号
const signals = ['SIGINT', 'SIGTERM']
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down...`)

    // 关闭 WebSocket 连接
    connectionManager.closeAll()

    // 关闭数据库连接
    await prisma.$disconnect()

    // 关闭服务器
    await fastify.close()

    process.exit(0)
  })
})
```

---

## 11. 待办事项

- [ ] 实现微信登录集成
- [ ] 完善游戏引擎核心逻辑
- [ ] 实现牌型评估算法
- [ ] 实现边池计算
- [ ] 添加签到功能
- [ ] WebSocket 断线重连处理
- [ ] 添加请求日志中间件
- [ ] 性能优化与压力测试
