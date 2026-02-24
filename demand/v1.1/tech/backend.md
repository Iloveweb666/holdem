# 后端技术方案 - 微信云开发

> 版本：v1.1
> 更新日期：2026-02-24

---

## 1. 技术选型

### 1.1 微信云开发

| 能力 | 说明 |
|------|------|
| 云函数 | Serverless 函数，处理业务逻辑 |
| 云数据库 | MongoDB-like 文档数据库 |
| 云存储 | 文件存储（头像、游戏资源） |
| 云调用 | 免鉴权调用微信开放能力 |

### 1.2 开发语言

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.x | 类型安全 |
| Node.js | 18.x | 云函数运行时 |

### 1.3 选型理由

**对比 v1.0 (Fastify + Zeabur)**：

| 对比项 | Fastify + Zeabur | 微信云开发 |
|--------|------------------|------------|
| 运维成本 | 需要关注服务器 | 完全免运维 |
| 域名备案 | 需要 | 不需要 |
| 实时通信 | 自建 WebSocket | 数据库 Watch |
| 费用 | ~$10/月起 | 按量计费，朋友局基本免费 |
| 扩展性 | 高 | 中等（绑定微信生态） |
| 开发效率 | 中 | 高（与小程序无缝集成） |

---

## 2. 云函数架构

### 2.1 云函数目录结构

```
cloudfunctions/
├── auth/                        # 认证云函数
│   ├── index.ts                 # 入口
│   ├── handlers/
│   │   ├── login.ts             # 登录处理
│   │   └── getUser.ts           # 获取用户信息
│   ├── package.json
│   └── tsconfig.json
│
├── user/                        # 用户云函数
│   ├── index.ts
│   ├── handlers/
│   │   ├── getStats.ts          # 获取统计
│   │   ├── checkin.ts           # 签到
│   │   ├── getHistory.ts        # 获取历史
│   │   └── updateProfile.ts     # 更新资料
│   ├── package.json
│   └── tsconfig.json
│
├── room/                        # 房间云函数
│   ├── index.ts
│   ├── handlers/
│   │   ├── list.ts              # 房间列表
│   │   ├── create.ts            # 创建房间
│   │   ├── join.ts              # 加入房间
│   │   ├── leave.ts             # 离开房间
│   │   ├── sit.ts               # 入座
│   │   └── stand.ts             # 站起
│   ├── package.json
│   └── tsconfig.json
│
├── game/                        # 游戏云函数
│   ├── index.ts
│   ├── handlers/
│   │   ├── start.ts             # 开始游戏
│   │   ├── action.ts            # 执行操作
│   │   └── ready.ts             # 准备下一局
│   ├── engine/                  # 游戏引擎
│   │   ├── GameEngine.ts        # 游戏引擎主类
│   │   ├── Deck.ts              # 牌组
│   │   ├── HandEvaluator.ts     # 牌型评估
│   │   └── PotCalculator.ts     # 底池计算
│   ├── package.json
│   └── tsconfig.json
│
└── shared/                      # 共享代码（非云函数）
    ├── types/                   # 类型定义
    │   ├── index.ts
    │   ├── user.ts
    │   ├── room.ts
    │   └── game.ts
    ├── utils/                   # 工具函数
    │   ├── response.ts          # 响应格式化
    │   └── validation.ts        # 数据校验
    └── constants/               # 常量
        └── index.ts
```

### 2.2 云函数入口模式

```typescript
// cloudfunctions/room/index.ts
import cloud from 'wx-server-sdk'
import { listRooms } from './handlers/list'
import { createRoom } from './handlers/create'
import { joinRoom } from './handlers/join'
import { leaveRoom } from './handlers/leave'
import { sitDown } from './handlers/sit'
import { standUp } from './handlers/stand'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const handlers: Record<string, Function> = {
  list: listRooms,
  create: createRoom,
  join: joinRoom,
  leave: leaveRoom,
  sit: sitDown,
  stand: standUp,
}

export async function main(event: any, context: any) {
  const { action, ...data } = event
  const { OPENID } = cloud.getWXContext()

  const handler = handlers[action]
  if (!handler) {
    return { error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` } }
  }

  try {
    const result = await handler({ ...data, openid: OPENID }, context)
    return { data: result }
  } catch (error: any) {
    console.error(`[${action}] Error:`, error)
    return {
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
    }
  }
}
```

---

## 3. API 设计

### 3.1 认证模块 (auth)

#### 3.1.1 登录/自动注册

```typescript
// 云函数: auth
// Action: login

// 请求
{
  action: 'login',
  userInfo?: {
    nickName: string,
    avatarUrl: string
  }
}

// 响应
{
  data: {
    user: {
      _id: string,
      openid: string,
      name: string,
      avatar: string,
      chips: number,
      createdAt: Date
    },
    isNewUser: boolean
  }
}
```

**实现逻辑**：

```typescript
// cloudfunctions/auth/handlers/login.ts
import cloud from 'wx-server-sdk'

const db = cloud.database()

export async function login(params: { openid: string; userInfo?: any }) {
  const { openid, userInfo } = params

  // 查找用户
  const userResult = await db.collection('users')
    .where({ openid })
    .get()

  if (userResult.data.length > 0) {
    // 已有用户，更新登录时间
    const user = userResult.data[0]
    await db.collection('users').doc(user._id).update({
      data: {
        lastLoginAt: db.serverDate(),
        // 如果提供了新的用户信息，也更新
        ...(userInfo && {
          name: userInfo.nickName,
          avatar: userInfo.avatarUrl,
        }),
      },
    })
    return { user, isNewUser: false }
  }

  // 新用户注册
  const newUser = {
    openid,
    name: userInfo?.nickName || `玩家${generateId()}`,
    avatar: userInfo?.avatarUrl || '',
    chips: 10000,  // 初始筹码
    consecutiveCheckins: 0,
    lastCheckinDate: null,
    createdAt: db.serverDate(),
    lastLoginAt: db.serverDate(),
  }

  const result = await db.collection('users').add({ data: newUser })

  // 创建统计记录
  await db.collection('user_statistics').add({
    data: {
      userId: result._id,
      totalGames: 0,
      wins: 0,
      totalWinnings: 0,
      totalLosses: 0,
      createdAt: db.serverDate(),
    },
  })

  return {
    user: { _id: result._id, ...newUser },
    isNewUser: true,
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
```

### 3.2 用户模块 (user)

#### 3.2.1 每日签到

```typescript
// 云函数: user
// Action: checkin

// 请求
{ action: 'checkin' }

// 响应
{
  data: {
    success: true,
    reward: 1000,
    consecutiveDays: 3,
    totalChips: 13000
  }
}
```

**实现逻辑**：

```typescript
// cloudfunctions/user/handlers/checkin.ts
import cloud from 'wx-server-sdk'

const db = cloud.database()
const _ = db.command

// 签到奖励（第1-7天）
const REWARDS = [1000, 1200, 1500, 1800, 2000, 2500, 3000]

export async function checkin(params: { openid: string }) {
  const { openid } = params

  // 获取用户
  const userResult = await db.collection('users')
    .where({ openid })
    .get()

  if (userResult.data.length === 0) {
    throw { code: 'USER_NOT_FOUND', message: '用户不存在' }
  }

  const user = userResult.data[0]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 检查今日是否已签到
  if (user.lastCheckinDate) {
    const lastCheckin = new Date(user.lastCheckinDate)
    lastCheckin.setHours(0, 0, 0, 0)

    if (lastCheckin.getTime() >= today.getTime()) {
      throw { code: 'ALREADY_CHECKED_IN', message: '今日已签到' }
    }
  }

  // 计算连续签到天数
  let consecutiveDays = 1
  if (user.lastCheckinDate) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastCheckin = new Date(user.lastCheckinDate)
    lastCheckin.setHours(0, 0, 0, 0)

    if (lastCheckin.getTime() === yesterday.getTime()) {
      // 连续签到
      consecutiveDays = (user.consecutiveCheckins % 7) + 1
    }
    // 否则重置为 1
  }

  // 计算奖励
  const reward = REWARDS[consecutiveDays - 1]

  // 更新用户
  await db.collection('users').doc(user._id).update({
    data: {
      chips: _.inc(reward),
      consecutiveCheckins: consecutiveDays,
      lastCheckinDate: db.serverDate(),
    },
  })

  return {
    success: true,
    reward,
    consecutiveDays,
    totalChips: user.chips + reward,
  }
}
```

#### 3.2.2 获取游戏历史

```typescript
// 云函数: user
// Action: getHistory

// 请求
{
  action: 'getHistory',
  page: 1,
  limit: 20,
  result?: 'win' | 'lose'
}

// 响应
{
  data: {
    list: [
      {
        _id: string,
        roomName: string,
        result: 'win' | 'lose',
        chipsChange: number,
        playedAt: Date
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 100
    }
  }
}
```

### 3.3 房间模块 (room)

#### 3.3.1 获取房间列表

```typescript
// 云函数: room
// Action: list

// 请求
{
  action: 'list',
  search?: string,
  status?: 'WAITING' | 'PLAYING'
}

// 响应
{
  data: {
    rooms: [
      {
        _id: string,
        name: string,
        code: string,
        bigBlind: number,
        smallBlind: number,
        currentPlayers: number,
        maxPlayers: number,
        status: 'WAITING' | 'PLAYING'
      }
    ]
  }
}
```

**实现逻辑**：

```typescript
// cloudfunctions/room/handlers/list.ts
import cloud from 'wx-server-sdk'

const db = cloud.database()
const _ = db.command

export async function listRooms(params: {
  search?: string
  status?: string
}) {
  const { search, status } = params

  let query: any = { deletedAt: null }

  if (status) {
    query.status = status
  } else {
    query.status = _.in(['WAITING', 'PLAYING'])
  }

  if (search) {
    query = {
      ...query,
      ..._.or([
        { name: db.RegExp({ regexp: search, options: 'i' }) },
        { code: search },
      ]),
    }
  }

  // 获取房间列表
  const roomsResult = await db.collection('rooms')
    .where(query)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  // 获取每个房间的玩家数量
  const rooms = await Promise.all(
    roomsResult.data.map(async (room: any) => {
      const playersResult = await db.collection('room_players')
        .where({ roomId: room._id })
        .count()

      return {
        ...room,
        currentPlayers: playersResult.total,
      }
    })
  )

  return { rooms }
}
```

#### 3.3.2 创建房间

```typescript
// 云函数: room
// Action: create

// 请求
{
  action: 'create',
  name: string,
  bigBlind: number,
  buyIn: number
}

// 响应
{
  data: {
    room: {
      _id: string,
      name: string,
      code: string,
      // ...
    }
  }
}
```

**实现逻辑**：

```typescript
// cloudfunctions/room/handlers/create.ts
import cloud from 'wx-server-sdk'

const db = cloud.database()

export async function createRoom(params: {
  openid: string
  name: string
  bigBlind: number
  buyIn: number
}) {
  const { openid, name, bigBlind, buyIn } = params

  // 获取用户
  const userResult = await db.collection('users')
    .where({ openid })
    .get()

  if (userResult.data.length === 0) {
    throw { code: 'USER_NOT_FOUND', message: '用户不存在' }
  }

  const user = userResult.data[0]

  // 验证买入金额
  const minBuyIn = bigBlind * 20
  if (buyIn < minBuyIn) {
    throw { code: 'INVALID_BUY_IN', message: `买入金额至少 ${minBuyIn}` }
  }

  if (buyIn > user.chips) {
    throw { code: 'INSUFFICIENT_CHIPS', message: '筹码不足' }
  }

  // 生成房间号
  const code = generateRoomCode()

  // 创建房间
  const room = {
    name,
    code,
    ownerId: user._id,
    smallBlind: Math.floor(bigBlind / 2),
    bigBlind,
    maxPlayers: 8,
    minBuyIn,
    maxBuyIn: bigBlind * 200,
    status: 'WAITING',
    createdAt: db.serverDate(),
    deletedAt: null,
  }

  const roomResult = await db.collection('rooms').add({ data: room })
  const roomId = roomResult._id

  // 房主自动加入房间
  await db.collection('room_players').add({
    data: {
      roomId,
      userId: user._id,
      openid,
      chips: buyIn,
      seatIndex: null,
      status: 'STANDING',
      isReady: false,
      joinedAt: db.serverDate(),
    },
  })

  // 扣除用户筹码
  await db.collection('users').doc(user._id).update({
    data: {
      chips: db.command.inc(-buyIn),
    },
  })

  return {
    room: { _id: roomId, ...room },
  }
}

function generateRoomCode(): string {
  return Math.random().toString().substring(2, 8)
}
```

#### 3.3.3 加入房间

```typescript
// cloudfunctions/room/handlers/join.ts
import cloud from 'wx-server-sdk'

const db = cloud.database()
const _ = db.command

export async function joinRoom(params: {
  openid: string
  roomId: string
  buyIn: number
}) {
  const { openid, roomId, buyIn } = params

  // 获取用户
  const userResult = await db.collection('users')
    .where({ openid })
    .get()

  if (userResult.data.length === 0) {
    throw { code: 'USER_NOT_FOUND', message: '用户不存在' }
  }

  const user = userResult.data[0]

  // 获取房间
  const roomResult = await db.collection('rooms').doc(roomId).get()
  const room = roomResult.data

  if (!room || room.deletedAt) {
    throw { code: 'ROOM_NOT_FOUND', message: '房间不存在' }
  }

  // 检查是否已在房间中
  const existingPlayer = await db.collection('room_players')
    .where({ roomId, userId: user._id })
    .get()

  if (existingPlayer.data.length > 0) {
    throw { code: 'ALREADY_IN_ROOM', message: '已在房间中' }
  }

  // 检查房间人数
  const playerCount = await db.collection('room_players')
    .where({ roomId })
    .count()

  if (playerCount.total >= room.maxPlayers) {
    throw { code: 'ROOM_FULL', message: '房间已满' }
  }

  // 验证买入
  if (buyIn < room.minBuyIn || buyIn > room.maxBuyIn) {
    throw { code: 'INVALID_BUY_IN', message: '买入金额不在允许范围内' }
  }

  if (buyIn > user.chips) {
    throw { code: 'INSUFFICIENT_CHIPS', message: '筹码不足' }
  }

  // 加入房间
  await db.collection('room_players').add({
    data: {
      roomId,
      userId: user._id,
      openid,
      chips: buyIn,
      seatIndex: null,
      status: 'STANDING',
      isReady: false,
      joinedAt: db.serverDate(),
    },
  })

  // 扣除筹码
  await db.collection('users').doc(user._id).update({
    data: {
      chips: _.inc(-buyIn),
    },
  })

  // 获取房间玩家列表
  const playersResult = await db.collection('room_players')
    .where({ roomId })
    .get()

  return {
    room,
    players: playersResult.data,
  }
}
```

### 3.4 游戏模块 (game)

#### 3.4.1 开始游戏

```typescript
// 云函数: game
// Action: start

// 请求
{
  action: 'start',
  roomId: string
}

// 响应
{
  data: {
    gameId: string,
    game: GameState
  }
}
```

**实现逻辑**：

```typescript
// cloudfunctions/game/handlers/start.ts
import cloud from 'wx-server-sdk'
import { GameEngine } from '../engine/GameEngine'

const db = cloud.database()

export async function startGame(params: {
  openid: string
  roomId: string
}) {
  const { openid, roomId } = params

  // 获取房间
  const roomResult = await db.collection('rooms').doc(roomId).get()
  const room = roomResult.data

  if (!room) {
    throw { code: 'ROOM_NOT_FOUND', message: '房间不存在' }
  }

  // 验证是否为房主
  const userResult = await db.collection('users')
    .where({ openid })
    .get()

  if (userResult.data.length === 0 || userResult.data[0]._id !== room.ownerId) {
    throw { code: 'NOT_ROOM_OWNER', message: '只有房主可以开始游戏' }
  }

  // 获取入座玩家
  const playersResult = await db.collection('room_players')
    .where({
      roomId,
      seatIndex: db.command.neq(null),
    })
    .get()

  const seatedPlayers = playersResult.data

  if (seatedPlayers.length < 2) {
    throw { code: 'NOT_ENOUGH_PLAYERS', message: '至少需要2名玩家入座' }
  }

  // 创建游戏引擎
  const engine = new GameEngine(room, seatedPlayers)
  const gameState = engine.initialize()

  // 保存游戏状态到数据库
  const gameResult = await db.collection('games').add({
    data: {
      roomId,
      ...gameState,
      createdAt: db.serverDate(),
    },
  })

  // 保存每个玩家的私牌（单独存储，不在 games 集合中公开）
  for (const player of gameState.players) {
    await db.collection('player_cards').add({
      data: {
        gameId: gameResult._id,
        oderId: player.userId,
        cards: player.holeCards,
      },
    })
  }

  // 更新房间状态
  await db.collection('rooms').doc(roomId).update({
    data: {
      status: 'PLAYING',
      currentGameId: gameResult._id,
    },
  })

  return {
    gameId: gameResult._id,
    game: {
      ...gameState,
      // 不返回玩家私牌
      players: gameState.players.map((p: any) => ({
        ...p,
        holeCards: undefined,
      })),
    },
  }
}
```

#### 3.4.2 执行游戏操作

```typescript
// cloudfunctions/game/handlers/action.ts
import cloud from 'wx-server-sdk'
import { GameEngine } from '../engine/GameEngine'

const db = cloud.database()

export async function performAction(params: {
  openid: string
  roomId: string
  gameAction: 'fold' | 'check' | 'call' | 'raise' | 'all_in'
  amount?: number
}) {
  const { openid, roomId, gameAction, amount } = params

  // 获取当前游戏
  const roomResult = await db.collection('rooms').doc(roomId).get()
  const room = roomResult.data

  if (!room || !room.currentGameId) {
    throw { code: 'NO_ACTIVE_GAME', message: '没有进行中的游戏' }
  }

  const gameResult = await db.collection('games').doc(room.currentGameId).get()
  const game = gameResult.data

  // 获取用户
  const userResult = await db.collection('users')
    .where({ openid })
    .get()

  const user = userResult.data[0]

  // 验证是否轮到该玩家
  const currentPlayer = game.players[game.currentPlayerIndex]
  if (currentPlayer.userId !== user._id) {
    throw { code: 'NOT_YOUR_TURN', message: '还没轮到你' }
  }

  // 执行操作
  const engine = new GameEngine(room, [])
  engine.loadState(game)
  const newState = engine.performAction(user._id, gameAction, amount)

  // 更新游戏状态
  await db.collection('games').doc(room.currentGameId).update({
    data: {
      ...newState,
      updatedAt: db.serverDate(),
    },
  })

  // 如果游戏结束，进行结算
  if (newState.phase === 'SHOWDOWN' || newState.isEnded) {
    await settleGame(room.currentGameId, newState)
  }

  return { success: true, game: newState }
}

async function settleGame(gameId: string, finalState: any) {
  // 计算获胜者和奖金分配
  // 更新玩家筹码
  // 创建游戏历史记录
  // ... 结算逻辑
}
```

---

## 4. 游戏引擎设计

### 4.1 游戏引擎主类

```typescript
// cloudfunctions/game/engine/GameEngine.ts
import { Deck } from './Deck'
import { HandEvaluator, HandResult } from './HandEvaluator'
import { PotCalculator } from './PotCalculator'

type GamePhase = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'
type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all_in'

interface GamePlayer {
  oderId: string
  seatIndex: number
  chips: number
  bet: number
  totalBet: number
  status: 'ACTIVE' | 'FOLDED' | 'ALL_IN'
  holeCards: string[]
}

interface GameState {
  phase: GamePhase
  pot: number
  communityCards: string[]
  players: GamePlayer[]
  dealerIndex: number
  smallBlindIndex: number
  bigBlindIndex: number
  currentPlayerIndex: number
  currentBet: number
  minRaise: number
  isEnded: boolean
}

export class GameEngine {
  private deck: Deck
  private handEvaluator: HandEvaluator
  private potCalculator: PotCalculator
  private state: GameState
  private room: any

  constructor(room: any, players: any[]) {
    this.room = room
    this.deck = new Deck()
    this.handEvaluator = new HandEvaluator()
    this.potCalculator = new PotCalculator()
    this.state = this.createInitialState(players)
  }

  private createInitialState(players: any[]): GameState {
    // 按座位排序
    const sortedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex)

    return {
      phase: 'PREFLOP',
      pot: 0,
      communityCards: [],
      players: sortedPlayers.map((p) => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: 0,
        totalBet: 0,
        status: 'ACTIVE',
        holeCards: [],
      })),
      dealerIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 0,
      currentPlayerIndex: 0,
      currentBet: 0,
      minRaise: this.room.bigBlind,
      isEnded: false,
    }
  }

  initialize(): GameState {
    // 洗牌
    this.deck.shuffle()

    // 确定庄家位置（轮换）
    this.state.dealerIndex = 0
    this.state.smallBlindIndex = this.getNextActivePlayer(this.state.dealerIndex)
    this.state.bigBlindIndex = this.getNextActivePlayer(this.state.smallBlindIndex)

    // 下盲注
    this.postBlind(this.state.smallBlindIndex, this.room.smallBlind)
    this.postBlind(this.state.bigBlindIndex, this.room.bigBlind)

    this.state.currentBet = this.room.bigBlind
    this.state.minRaise = this.room.bigBlind

    // 发底牌
    for (const player of this.state.players) {
      player.holeCards = this.deck.deal(2)
    }

    // 设置第一个行动玩家（大盲位之后）
    this.state.currentPlayerIndex = this.getNextActivePlayer(this.state.bigBlindIndex)

    return this.state
  }

  loadState(state: GameState): void {
    this.state = state
  }

  performAction(userId: string, action: ActionType, amount?: number): GameState {
    const playerIndex = this.state.players.findIndex((p) => p.userId === oderId)
    const player = this.state.players[playerIndex]

    if (playerIndex !== this.state.currentPlayerIndex) {
      throw new Error('Not your turn')
    }

    switch (action) {
      case 'fold':
        player.status = 'FOLDED'
        break

      case 'check':
        if (player.bet < this.state.currentBet) {
          throw new Error('Cannot check, must call or raise')
        }
        break

      case 'call':
        const callAmount = this.state.currentBet - player.bet
        this.placeBet(playerIndex, callAmount)
        break

      case 'raise':
        if (!amount || amount < this.state.minRaise) {
          throw new Error(`Minimum raise is ${this.state.minRaise}`)
        }
        const raiseTotal = this.state.currentBet - player.bet + amount
        this.placeBet(playerIndex, raiseTotal)
        this.state.currentBet = player.bet
        this.state.minRaise = amount
        break

      case 'all_in':
        const allInAmount = player.chips
        this.placeBet(playerIndex, allInAmount)
        player.status = 'ALL_IN'
        if (player.bet > this.state.currentBet) {
          this.state.currentBet = player.bet
        }
        break
    }

    // 移动到下一个玩家
    this.advanceToNextPlayer()

    // 检查是否进入下一阶段
    this.checkPhaseTransition()

    return this.state
  }

  private placeBet(playerIndex: number, amount: number): void {
    const player = this.state.players[playerIndex]
    const actualAmount = Math.min(amount, player.chips)

    player.chips -= actualAmount
    player.bet += actualAmount
    player.totalBet += actualAmount
    this.state.pot += actualAmount
  }

  private postBlind(playerIndex: number, amount: number): void {
    this.placeBet(playerIndex, amount)
  }

  private getNextActivePlayer(fromIndex: number): number {
    let index = (fromIndex + 1) % this.state.players.length
    while (index !== fromIndex) {
      const player = this.state.players[index]
      if (player.status === 'ACTIVE') {
        return index
      }
      index = (index + 1) % this.state.players.length
    }
    return fromIndex
  }

  private advanceToNextPlayer(): void {
    this.state.currentPlayerIndex = this.getNextActivePlayer(this.state.currentPlayerIndex)
  }

  private checkPhaseTransition(): void {
    const activePlayers = this.state.players.filter((p) => p.status === 'ACTIVE')

    // 只剩一个玩家，游戏结束
    if (activePlayers.length <= 1) {
      this.state.isEnded = true
      return
    }

    // 检查是否所有人都已行动且下注一致
    const allEqualBet = activePlayers.every((p) => p.bet === this.state.currentBet)
    if (!allEqualBet) return

    // 进入下一阶段
    this.nextPhase()
  }

  private nextPhase(): void {
    // 重置下注
    for (const player of this.state.players) {
      player.bet = 0
    }
    this.state.currentBet = 0

    switch (this.state.phase) {
      case 'PREFLOP':
        this.state.phase = 'FLOP'
        this.state.communityCards = this.deck.deal(3)
        break
      case 'FLOP':
        this.state.phase = 'TURN'
        this.state.communityCards.push(...this.deck.deal(1))
        break
      case 'TURN':
        this.state.phase = 'RIVER'
        this.state.communityCards.push(...this.deck.deal(1))
        break
      case 'RIVER':
        this.state.phase = 'SHOWDOWN'
        this.state.isEnded = true
        break
    }

    // 设置第一个行动玩家（小盲位开始）
    this.state.currentPlayerIndex = this.getNextActivePlayer(this.state.dealerIndex)
  }

  getWinners(): Array<{ userId: string; amount: number; hand: HandResult }> {
    // 评估每个玩家的牌型
    const results = this.state.players
      .filter((p) => p.status !== 'FOLDED')
      .map((p) => ({
        userId: p.userId,
        hand: this.handEvaluator.evaluate(p.holeCards, this.state.communityCards),
        totalBet: p.totalBet,
      }))

    // 计算底池分配
    return this.potCalculator.distribute(results, this.state.pot)
  }
}
```

### 4.2 牌组类

```typescript
// cloudfunctions/game/engine/Deck.ts

type Suit = 'h' | 'd' | 'c' | 's'
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'
type Card = `${Rank}${Suit}`

export class Deck {
  private cards: Card[]

  constructor() {
    this.cards = this.createDeck()
  }

  private createDeck(): Card[] {
    const suits: Suit[] = ['h', 'd', 'c', 's']
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
    const deck: Card[] = []

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push(`${rank}${suit}` as Card)
      }
    }

    return deck
  }

  shuffle(): void {
    // Fisher-Yates 洗牌算法
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  deal(count: number = 1): Card[] {
    return this.cards.splice(0, count)
  }

  reset(): void {
    this.cards = this.createDeck()
  }
}
```

### 4.3 牌型评估器

```typescript
// cloudfunctions/game/engine/HandEvaluator.ts

export enum HandRank {
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

export interface HandResult {
  rank: HandRank
  name: string
  bestCards: string[]
  score: number  // 用于比较同级牌型
}

export class HandEvaluator {
  private rankValues: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }

  evaluate(holeCards: string[], communityCards: string[]): HandResult {
    const allCards = [...holeCards, ...communityCards]

    // 生成所有可能的 5 张牌组合
    const combinations = this.getCombinations(allCards, 5)

    // 评估每个组合，找出最佳
    let bestResult: HandResult | null = null

    for (const combo of combinations) {
      const result = this.evaluateFiveCards(combo)
      if (!bestResult || result.score > bestResult.score) {
        bestResult = result
      }
    }

    return bestResult!
  }

  private evaluateFiveCards(cards: string[]): HandResult {
    const suits = cards.map((c) => c[1])
    const ranks = cards.map((c) => c[0]).sort((a, b) =>
      this.rankValues[b] - this.rankValues[a]
    )

    const isFlush = suits.every((s) => s === suits[0])
    const isStraight = this.checkStraight(ranks)

    // 统计牌面数量
    const rankCounts = this.countRanks(ranks)
    const counts = Object.values(rankCounts).sort((a, b) => b - a)

    // 判断牌型
    if (isFlush && isStraight) {
      if (ranks.includes('A') && ranks.includes('K')) {
        return this.createResult(HandRank.ROYAL_FLUSH, '皇家同花顺', cards)
      }
      return this.createResult(HandRank.STRAIGHT_FLUSH, '同花顺', cards)
    }

    if (counts[0] === 4) {
      return this.createResult(HandRank.FOUR_OF_A_KIND, '四条', cards)
    }

    if (counts[0] === 3 && counts[1] === 2) {
      return this.createResult(HandRank.FULL_HOUSE, '葫芦', cards)
    }

    if (isFlush) {
      return this.createResult(HandRank.FLUSH, '同花', cards)
    }

    if (isStraight) {
      return this.createResult(HandRank.STRAIGHT, '顺子', cards)
    }

    if (counts[0] === 3) {
      return this.createResult(HandRank.THREE_OF_A_KIND, '三条', cards)
    }

    if (counts[0] === 2 && counts[1] === 2) {
      return this.createResult(HandRank.TWO_PAIR, '两对', cards)
    }

    if (counts[0] === 2) {
      return this.createResult(HandRank.ONE_PAIR, '一对', cards)
    }

    return this.createResult(HandRank.HIGH_CARD, '高牌', cards)
  }

  private checkStraight(ranks: string[]): boolean {
    const values = ranks.map((r) => this.rankValues[r]).sort((a, b) => a - b)

    // 检查普通顺子
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i + 1] - values[i] !== 1) {
        // 检查 A2345 特殊情况
        if (values.join(',') === '2,3,4,5,14') {
          return true
        }
        return false
      }
    }
    return true
  }

  private countRanks(ranks: string[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const rank of ranks) {
      counts[rank] = (counts[rank] || 0) + 1
    }
    return counts
  }

  private createResult(rank: HandRank, name: string, cards: string[]): HandResult {
    return {
      rank,
      name,
      bestCards: cards,
      score: this.calculateScore(rank, cards),
    }
  }

  private calculateScore(rank: HandRank, cards: string[]): number {
    // 主要分数来自牌型等级
    let score = rank * 1000000

    // 次要分数来自具体牌面
    const values = cards
      .map((c) => this.rankValues[c[0]])
      .sort((a, b) => b - a)

    for (let i = 0; i < values.length; i++) {
      score += values[i] * Math.pow(15, 4 - i)
    }

    return score
  }

  private getCombinations<T>(arr: T[], size: number): T[][] {
    const result: T[][] = []

    function backtrack(start: number, current: T[]) {
      if (current.length === size) {
        result.push([...current])
        return
      }

      for (let i = start; i < arr.length; i++) {
        current.push(arr[i])
        backtrack(i + 1, current)
        current.pop()
      }
    }

    backtrack(0, [])
    return result
  }

  compare(hand1: HandResult, hand2: HandResult): -1 | 0 | 1 {
    if (hand1.score > hand2.score) return 1
    if (hand1.score < hand2.score) return -1
    return 0
  }
}
```

---

## 5. 错误处理

### 5.1 错误码定义

```typescript
// cloudfunctions/shared/constants/errors.ts

export const ErrorCodes = {
  // 通用错误
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  INVALID_ACTION: { code: 'INVALID_ACTION', message: '无效的操作' },
  INVALID_PARAMS: { code: 'INVALID_PARAMS', message: '参数错误' },

  // 用户错误
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: '用户不存在' },
  INSUFFICIENT_CHIPS: { code: 'INSUFFICIENT_CHIPS', message: '筹码不足' },
  ALREADY_CHECKED_IN: { code: 'ALREADY_CHECKED_IN', message: '今日已签到' },

  // 房间错误
  ROOM_NOT_FOUND: { code: 'ROOM_NOT_FOUND', message: '房间不存在' },
  ROOM_FULL: { code: 'ROOM_FULL', message: '房间已满' },
  ALREADY_IN_ROOM: { code: 'ALREADY_IN_ROOM', message: '已在房间中' },
  NOT_IN_ROOM: { code: 'NOT_IN_ROOM', message: '不在房间中' },
  SEAT_TAKEN: { code: 'SEAT_TAKEN', message: '座位已被占用' },
  INVALID_BUY_IN: { code: 'INVALID_BUY_IN', message: '买入金额无效' },
  NOT_ROOM_OWNER: { code: 'NOT_ROOM_OWNER', message: '只有房主可以执行此操作' },

  // 游戏错误
  NO_ACTIVE_GAME: { code: 'NO_ACTIVE_GAME', message: '没有进行中的游戏' },
  NOT_YOUR_TURN: { code: 'NOT_YOUR_TURN', message: '还没轮到你' },
  INVALID_GAME_ACTION: { code: 'INVALID_GAME_ACTION', message: '无效的游戏操作' },
  NOT_ENOUGH_PLAYERS: { code: 'NOT_ENOUGH_PLAYERS', message: '玩家数量不足' },
}
```

### 5.2 统一错误处理

```typescript
// cloudfunctions/shared/utils/response.ts

export function success<T>(data: T) {
  return { data }
}

export function error(code: string, message: string, details?: any) {
  return {
    error: {
      code,
      message,
      details,
    },
  }
}

export class AppError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}
```

---

## 6. 安全设计

### 6.1 敏感数据保护

```typescript
// 玩家私牌单独存储，不在 games 集合中公开
// 只有对应玩家可以读取自己的私牌

// 云函数中获取玩家私牌
async function getMyCards(openid: string, gameId: string) {
  const user = await getUserByOpenid(openid)

  const cardsResult = await db.collection('player_cards')
    .where({
      gameId,
      userId: user._id,
    })
    .get()

  return cardsResult.data[0]?.cards || []
}
```

### 6.2 操作校验

```typescript
// 所有游戏操作都在云函数中校验
// 客户端无法直接修改游戏状态

// 1. 验证是否轮到该玩家
// 2. 验证操作是否合法（如不能 check 当有人加注）
// 3. 验证金额是否合法（如加注金额是否足够）
// 4. 验证筹码是否足够
```

### 6.3 数据库安全规则

```json
{
  "users": {
    ".read": "auth.openid == doc.openid",
    ".write": false
  },
  "rooms": {
    ".read": true,
    ".write": false
  },
  "room_players": {
    ".read": true,
    ".write": false
  },
  "games": {
    ".read": true,
    ".write": false
  },
  "player_cards": {
    ".read": "auth.openid == doc.openid",
    ".write": false
  },
  "game_history": {
    ".read": "auth.openid == doc.openid",
    ".write": false
  }
}
```

---

## 7. 待办事项

- [ ] 创建云函数项目结构
- [ ] 实现认证云函数
- [ ] 实现用户云函数
- [ ] 实现房间云函数
- [ ] 实现游戏云函数
- [ ] 实现游戏引擎
- [ ] 实现牌型评估
- [ ] 实现底池计算
- [ ] 配置数据库安全规则
- [ ] 云函数联调测试
