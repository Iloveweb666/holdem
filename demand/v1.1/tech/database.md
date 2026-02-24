# 数据库技术方案 - 微信云数据库

> 版本：v1.1
> 更新日期：2026-02-24

---

## 1. 技术选型

### 1.1 云数据库

微信云开发提供的云数据库是一个 **MongoDB-like** 的文档型数据库。

| 特性 | 说明 |
|------|------|
| 数据模型 | JSON 文档 |
| 查询语法 | 类 MongoDB |
| 实时推送 | 支持 Watch 监听 |
| 安全规则 | 支持配置读写权限 |

### 1.2 对比 v1.0 (PostgreSQL)

| 对比项 | PostgreSQL | 云数据库 |
|--------|------------|----------|
| 数据模型 | 关系型 | 文档型 |
| Schema | 强类型约束 | 灵活无 Schema |
| 事务 | 完整 ACID | 部分支持 |
| 实时监听 | 需要轮询/WS | 原生支持 Watch |
| 运维 | 需要 | 免运维 |
| 扩展性 | 高 | 中等 |

### 1.3 选型理由

1. **实时数据推送**：原生支持 Watch，无需自建 WebSocket
2. **免运维**：无需关心数据库服务器
3. **与小程序集成**：安全规则可基于 OpenID 控制权限
4. **文档模型灵活**：游戏状态适合文档存储

---

## 2. 集合设计

### 2.1 集合概览

```
云数据库集合:
├── users              # 用户信息
├── user_statistics    # 用户统计
├── rooms              # 房间信息
├── room_players       # 房间玩家
├── games              # 游戏状态（实时监听）
├── player_cards       # 玩家私牌（安全隔离）
└── game_history       # 游戏历史记录
```

### 2.2 users - 用户集合

```typescript
interface User {
  _id: string                    // 文档 ID
  _openid: string                // 微信 OpenID（自动填充）
  openid: string                 // 微信 OpenID
  unionid?: string               // 微信 UnionID
  name: string                   // 昵称
  avatar: string                 // 头像 URL
  chips: number                  // 当前筹码
  consecutiveCheckins: number    // 连续签到天数
  lastCheckinDate: Date | null   // 最后签到日期
  createdAt: Date                // 注册时间
  lastLoginAt: Date              // 最后登录时间
}

// 示例文档
{
  "_id": "user_abc123",
  "_openid": "oXXXX-xxxxx",
  "openid": "oXXXX-xxxxx",
  "name": "德扑高手",
  "avatar": "https://...",
  "chips": 15000,
  "consecutiveCheckins": 3,
  "lastCheckinDate": "2026-02-24T00:00:00Z",
  "createdAt": "2026-02-01T10:00:00Z",
  "lastLoginAt": "2026-02-24T08:30:00Z"
}
```

**索引**:
```javascript
db.collection('users').createIndex('openid', { unique: true })
```

### 2.3 user_statistics - 用户统计集合

```typescript
interface UserStatistics {
  _id: string
  userId: string              // 关联用户 ID
  totalGames: number          // 总游戏场数
  wins: number                // 胜利场数
  totalWinnings: number       // 总赢取筹码
  totalLosses: number         // 总输掉筹码
  biggestWin: number          // 单局最大赢取
  biggestLoss: number         // 单局最大损失
  createdAt: Date
  updatedAt: Date
}

// 示例文档
{
  "_id": "stats_abc123",
  "userId": "user_abc123",
  "totalGames": 50,
  "wins": 25,
  "totalWinnings": 35000,
  "totalLosses": 20000,
  "biggestWin": 5000,
  "biggestLoss": 3000,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-24T08:30:00Z"
}
```

**索引**:
```javascript
db.collection('user_statistics').createIndex('userId', { unique: true })
```

### 2.4 rooms - 房间集合

```typescript
interface Room {
  _id: string
  name: string                // 房间名称
  code: string                // 6位房间号
  ownerId: string             // 房主用户 ID
  smallBlind: number          // 小盲注
  bigBlind: number            // 大盲注
  maxPlayers: number          // 最大玩家数（默认 8）
  minBuyIn: number            // 最小买入
  maxBuyIn: number            // 最大买入
  status: RoomStatus          // 房间状态
  currentGameId?: string      // 当前游戏 ID
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date            // 软删除标记
}

type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED'

// 示例文档
{
  "_id": "room_xyz789",
  "name": "欢乐德扑",
  "code": "123456",
  "ownerId": "user_abc123",
  "smallBlind": 10,
  "bigBlind": 20,
  "maxPlayers": 8,
  "minBuyIn": 400,
  "maxBuyIn": 4000,
  "status": "WAITING",
  "currentGameId": null,
  "createdAt": "2026-02-24T19:00:00Z",
  "updatedAt": "2026-02-24T19:00:00Z",
  "deletedAt": null
}
```

**索引**:
```javascript
db.collection('rooms').createIndex('code', { unique: true })
db.collection('rooms').createIndex('status')
db.collection('rooms').createIndex('createdAt')
```

### 2.5 room_players - 房间玩家集合

```typescript
interface RoomPlayer {
  _id: string
  roomId: string              // 房间 ID
  userId: string              // 用户 ID
  openid: string              // 用户 OpenID
  chips: number               // 带入筹码
  seatIndex: number | null    // 座位号（null = 站立观战）
  status: PlayerStatus        // 玩家状态
  isReady: boolean            // 是否准备下一局
  joinedAt: Date
  leftAt?: Date
}

type PlayerStatus = 'STANDING' | 'SEATED' | 'PLAYING' | 'FOLDED' | 'ALL_IN'

// 示例文档
{
  "_id": "rp_001",
  "roomId": "room_xyz789",
  "userId": "user_abc123",
  "openid": "oXXXX-xxxxx",
  "chips": 2000,
  "seatIndex": 3,
  "status": "SEATED",
  "isReady": true,
  "joinedAt": "2026-02-24T19:05:00Z"
}
```

**索引**:
```javascript
db.collection('room_players').createIndex(['roomId', 'userId'], { unique: true })
db.collection('room_players').createIndex(['roomId', 'seatIndex'], { unique: true })
db.collection('room_players').createIndex('userId')
```

### 2.6 games - 游戏状态集合（核心）

这是**实时监听**的核心集合，客户端通过 Watch 获取游戏状态更新。

```typescript
interface Game {
  _id: string
  roomId: string                    // 房间 ID
  roundNumber: number               // 本房间第几局

  // 游戏阶段
  phase: GamePhase
  isEnded: boolean

  // 底池和公共牌
  pot: number
  communityCards: string[]          // ['Ah', 'Kd', 'Qc', 'Js', 'Th']

  // 位置信息
  dealerIndex: number               // 庄家座位
  smallBlindIndex: number           // 小盲座位
  bigBlindIndex: number             // 大盲座位
  currentPlayerIndex: number        // 当前行动玩家座位

  // 下注信息
  currentBet: number                // 当前最大下注
  minRaise: number                  // 最小加注额

  // 玩家状态（不包含私牌）
  players: GamePlayerState[]

  // 时间戳
  createdAt: Date
  updatedAt: Date
  endedAt?: Date

  // 结果（游戏结束后填充）
  results?: GameResult[]
}

interface GamePlayerState {
  oderId: string
  seatIndex: number
  chips: number                     // 剩余筹码
  bet: number                       // 本轮下注
  totalBet: number                  // 本局总下注
  status: 'ACTIVE' | 'FOLDED' | 'ALL_IN'
  // 注意：不包含 holeCards，私牌单独存储
}

interface GameResult {
  userId: string
  handRank?: string                 // 牌型名称
  bestHand?: string[]               // 最佳5张牌
  chipsWon: number
  chipsLost: number
  isWinner: boolean
}

type GamePhase = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'

// 示例文档
{
  "_id": "game_001",
  "roomId": "room_xyz789",
  "roundNumber": 1,
  "phase": "FLOP",
  "isEnded": false,
  "pot": 150,
  "communityCards": ["Ah", "Kd", "7c"],
  "dealerIndex": 0,
  "smallBlindIndex": 1,
  "bigBlindIndex": 2,
  "currentPlayerIndex": 3,
  "currentBet": 40,
  "minRaise": 20,
  "players": [
    {
      "userId": "user_abc123",
      "seatIndex": 0,
      "chips": 1960,
      "bet": 0,
      "totalBet": 40,
      "status": "ACTIVE"
    },
    {
      "userId": "user_def456",
      "seatIndex": 1,
      "chips": 1940,
      "bet": 0,
      "totalBet": 60,
      "status": "ACTIVE"
    }
  ],
  "createdAt": "2026-02-24T19:10:00Z",
  "updatedAt": "2026-02-24T19:12:30Z"
}
```

**索引**:
```javascript
db.collection('games').createIndex('roomId')
db.collection('games').createIndex(['roomId', 'createdAt'])
```

### 2.7 player_cards - 玩家私牌集合（安全隔离）

私牌**单独存储**，每个玩家只能读取自己的私牌。

```typescript
interface PlayerCards {
  _id: string
  _openid: string             // 自动填充，用于权限控制
  gameId: string              // 游戏 ID
  userId: string              // 用户 ID
  openid: string              // 用户 OpenID
  cards: string[]             // 私牌 ['As', 'Kh']
}

// 示例文档
{
  "_id": "pc_001",
  "_openid": "oXXXX-xxxxx",
  "gameId": "game_001",
  "userId": "user_abc123",
  "openid": "oXXXX-xxxxx",
  "cards": ["As", "Kh"]
}
```

**安全规则**:
```json
{
  "player_cards": {
    ".read": "auth.openid == doc.openid",
    ".write": false
  }
}
```

### 2.8 game_history - 游戏历史集合

```typescript
interface GameHistory {
  _id: string
  _openid: string             // 用于权限控制
  gameId: string              // 游戏 ID
  roomId: string              // 房间 ID
  roomName: string            // 房间名称快照
  userId: string              // 用户 ID
  openid: string              // 用户 OpenID
  result: 'win' | 'lose'      // 胜负结果
  chipsChange: number         // 筹码变化
  handRank?: string           // 最终牌型
  playedAt: Date              // 游戏时间
}

// 示例文档
{
  "_id": "gh_001",
  "_openid": "oXXXX-xxxxx",
  "gameId": "game_001",
  "roomId": "room_xyz789",
  "roomName": "欢乐德扑",
  "userId": "user_abc123",
  "openid": "oXXXX-xxxxx",
  "result": "win",
  "chipsChange": 350,
  "handRank": "两对",
  "playedAt": "2026-02-24T19:15:00Z"
}
```

**索引**:
```javascript
db.collection('game_history').createIndex(['userId', 'playedAt'])
db.collection('game_history').createIndex('openid')
```

---

## 3. 数据关系图

```
┌─────────────────┐      1:1       ┌─────────────────┐
│      users      │───────────────►│ user_statistics │
├─────────────────┤                ├─────────────────┤
│ _id             │                │ userId (FK)     │
│ openid          │                │ totalGames      │
│ name            │                │ wins            │
│ chips           │                │ totalWinnings   │
│ ...             │                │ ...             │
└────────┬────────┘                └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐      N:1       ┌─────────────────┐
│  room_players   │───────────────►│      rooms      │
├─────────────────┤                ├─────────────────┤
│ roomId (FK)     │                │ _id             │
│ userId (FK)     │                │ name            │
│ chips           │                │ code            │
│ seatIndex       │                │ bigBlind        │
│ status          │                │ status          │
│ ...             │                │ currentGameId   │
└─────────────────┘                └────────┬────────┘
                                            │
                                            │ 1:N
                                            ▼
┌─────────────────┐      N:1       ┌─────────────────┐
│  player_cards   │───────────────►│      games      │
├─────────────────┤                ├─────────────────┤
│ gameId (FK)     │                │ _id             │
│ userId (FK)     │                │ roomId (FK)     │
│ cards           │                │ phase           │
│ (仅自己可读)     │                │ pot             │
└─────────────────┘                │ communityCards  │
                                   │ players[]       │
┌─────────────────┐                │ ...             │
│  game_history   │                └─────────────────┘
├─────────────────┤
│ gameId (FK)     │
│ userId (FK)     │
│ result          │
│ chipsChange     │
│ (仅自己可读)     │
└─────────────────┘
```

---

## 4. 实时数据监听

### 4.1 Watch 机制

客户端通过 `db.collection().watch()` 监听数据变化，实现实时同步。

```typescript
// 客户端监听游戏状态
const watcher = db.collection('games')
  .doc(gameId)
  .watch({
    onChange: (snapshot) => {
      console.log('游戏状态更新:', snapshot.docs[0])
      // 更新本地状态
      updateGameState(snapshot.docs[0])
    },
    onError: (err) => {
      console.error('监听错误:', err)
    }
  })

// 取消监听
watcher.close()
```

### 4.2 监听设计

| 场景 | 监听目标 | 触发时机 |
|------|----------|----------|
| 房间列表刷新 | `rooms` 集合 | 新房间创建、状态变化 |
| 房间内玩家变化 | `room_players` where roomId | 玩家加入/离开/入座 |
| 游戏状态同步 | `games` doc | 任何游戏状态变化 |

### 4.3 监听数量限制

云数据库 Watch 有连接数限制：
- 单个小程序同时最多 **10000** 个 Watch 连接
- 对于朋友局场景绰绰有余

---

## 5. 安全规则配置

### 5.1 安全规则说明

云数据库安全规则基于 **OpenID** 进行权限控制。

```json
// 安全规则配置文件
{
  "users": {
    ".read": "auth.openid == doc.openid",
    ".write": "auth.openid == doc.openid"
  },
  "user_statistics": {
    ".read": "auth.openid != null",
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

### 5.2 规则说明

| 集合 | 读权限 | 写权限 | 说明 |
|------|--------|--------|------|
| users | 仅自己 | 仅自己 | 用户只能读写自己的数据 |
| user_statistics | 登录用户 | 禁止 | 只能通过云函数写入 |
| rooms | 所有人 | 禁止 | 房间列表公开可见 |
| room_players | 所有人 | 禁止 | 玩家列表公开可见 |
| games | 所有人 | 禁止 | 游戏状态公开可见（无私牌） |
| player_cards | 仅自己 | 禁止 | 私牌只有自己可见 |
| game_history | 仅自己 | 禁止 | 历史记录只有自己可见 |

### 5.3 云函数绕过安全规则

云函数使用管理员权限，可以绑过安全规则：

```typescript
// 云函数中初始化
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 使用管理员权限操作数据库
const db = cloud.database()
// 此时的操作不受安全规则限制
```

---

## 6. 数据操作示例

### 6.1 创建用户

```typescript
// 云函数中创建用户
const db = cloud.database()

const newUser = {
  openid: 'oXXXX-xxxxx',
  name: '新玩家',
  avatar: '',
  chips: 10000,
  consecutiveCheckins: 0,
  lastCheckinDate: null,
  createdAt: db.serverDate(),
  lastLoginAt: db.serverDate(),
}

const result = await db.collection('users').add({ data: newUser })
console.log('新用户 ID:', result._id)
```

### 6.2 查询房间列表

```typescript
// 云函数中查询房间
const db = cloud.database()
const _ = db.command

const rooms = await db.collection('rooms')
  .where({
    status: _.in(['WAITING', 'PLAYING']),
    deletedAt: null,
  })
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get()

// 聚合查询玩家数量
const roomsWithCount = await Promise.all(
  rooms.data.map(async (room) => {
    const count = await db.collection('room_players')
      .where({ roomId: room._id })
      .count()
    return { ...room, playerCount: count.total }
  })
)
```

### 6.3 原子更新筹码

```typescript
// 使用 inc 操作符原子增减筹码
const db = cloud.database()
const _ = db.command

// 扣除筹码
await db.collection('users')
  .doc(userId)
  .update({
    data: {
      chips: _.inc(-1000),  // 原子减少 1000
    }
  })

// 增加筹码
await db.collection('users')
  .doc(userId)
  .update({
    data: {
      chips: _.inc(500),    // 原子增加 500
    }
  })
```

### 6.4 事务操作

```typescript
// 云函数中使用事务
const db = cloud.database()

const transaction = await db.startTransaction()

try {
  // 1. 扣除用户筹码
  await transaction.collection('users')
    .doc(userId)
    .update({
      data: { chips: db.command.inc(-buyIn) }
    })

  // 2. 添加房间玩家
  await transaction.collection('room_players')
    .add({
      data: {
        roomId,
        userId,
        chips: buyIn,
        // ...
      }
    })

  // 提交事务
  await transaction.commit()
} catch (err) {
  // 回滚事务
  await transaction.rollback()
  throw err
}
```

### 6.5 监听游戏状态

```typescript
// 客户端监听
import Taro from '@tarojs/taro'

const db = Taro.cloud.database()

const watcher = db.collection('games')
  .doc(gameId)
  .watch({
    onChange: (snapshot) => {
      if (snapshot.docs.length > 0) {
        const game = snapshot.docs[0]
        console.log('游戏阶段:', game.phase)
        console.log('底池:', game.pot)
        console.log('公共牌:', game.communityCards)
        // 更新 UI
      }
    },
    onError: (err) => {
      console.error('监听失败:', err)
    }
  })

// 组件卸载时关闭监听
onUnmounted(() => {
  watcher.close()
})
```

---

## 7. 性能优化

### 7.1 索引优化

确保常用查询字段都有索引：

```javascript
// 在微信开发者工具中创建索引
// 数据库 → 索引管理 → 添加索引

// users 集合
{ "openid": 1 }  // 唯一索引

// rooms 集合
{ "code": 1 }    // 唯一索引
{ "status": 1 }  // 普通索引

// room_players 集合
{ "roomId": 1, "userId": 1 }    // 复合唯一索引
{ "roomId": 1, "seatIndex": 1 } // 复合唯一索引

// games 集合
{ "roomId": 1 }
{ "roomId": 1, "createdAt": -1 }

// game_history 集合
{ "userId": 1, "playedAt": -1 }
```

### 7.2 查询优化

1. **使用投影**：只返回需要的字段

```typescript
const users = await db.collection('users')
  .where({ openid })
  .field({
    _id: true,
    name: true,
    avatar: true,
    chips: true,
  })
  .get()
```

2. **分页查询**：大列表必须分页

```typescript
const pageSize = 20
const history = await db.collection('game_history')
  .where({ userId })
  .orderBy('playedAt', 'desc')
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .get()
```

3. **避免 N+1 查询**：尽量减少查询次数

### 7.3 数据设计优化

1. **冗余存储**：在 `game_history` 中存储 `roomName`，避免关联查询
2. **嵌套文档**：`games.players[]` 内嵌玩家状态，一次查询获取所有信息
3. **私牌分离**：`player_cards` 单独存储，确保安全性

---

## 8. 数据备份

### 8.1 云开发备份策略

微信云开发提供自动备份：
- **自动备份**：每日自动备份
- **保留时间**：7 天
- **恢复方式**：控制台一键恢复

### 8.2 手动导出

```bash
# 使用云开发 CLI 导出数据
tcb db export --collection users --output ./backup/users.json
tcb db export --collection rooms --output ./backup/rooms.json
tcb db export --collection games --output ./backup/games.json
```

---

## 9. 监控与告警

### 9.1 云开发控制台监控

- **请求量统计**：查看集合的读写次数
- **容量监控**：查看数据存储大小
- **慢查询日志**：分析性能瓶颈

### 9.2 关键指标

| 指标 | 阈值 | 说明 |
|------|------|------|
| 单次查询耗时 | < 500ms | 超过需优化索引 |
| Watch 连接数 | < 8000 | 接近上限需预警 |
| 存储容量 | < 80% | 超过需扩容 |

---

## 10. 待办事项

- [ ] 创建所有集合
- [ ] 配置索引
- [ ] 配置安全规则
- [ ] 编写数据迁移脚本（如有旧数据）
- [ ] 验证 Watch 功能
- [ ] 压力测试
- [ ] 配置备份策略
