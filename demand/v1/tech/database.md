# 数据库技术方案 - PostgreSQL + Prisma

> 版本：v1.0
> 更新日期：2026-02-11

---

## 1. 技术选型

### 1.1 数据库

| 技术 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 16.x | 关系型数据库 |
| Prisma | 6.x | ORM |

### 1.2 选型理由

**PostgreSQL**：
- 功能丰富，支持 JSON、数组等高级数据类型
- 性能优秀，适合读写混合场景
- Zeabur 原生支持，一键部署
- 开源免费，社区活跃

**Prisma**：
- 类型安全，与 TypeScript 完美集成
- 自动迁移管理
- 直观的查询 API
- 关系处理简洁

---

## 2. Schema 设计

### 2.1 完整 Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ 用户模块 ============

model User {
  id                  String    @id @default(cuid())
  openid              String    @unique                    // 微信 OpenID
  unionid             String?                              // 微信 UnionID（可选）
  name                String                               // 昵称
  avatar              String?                              // 头像 URL
  chips               Int       @default(10000)            // 当前筹码
  consecutiveCheckins Int       @default(0) @map("consecutive_checkins")  // 连续签到天数
  lastCheckinDate     DateTime? @map("last_checkin_date")  // 最后签到日期
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  lastLoginAt         DateTime? @map("last_login_at")

  roomPlayers RoomPlayer[]
  gameActions GameAction[]
  gameResults GamePlayerResult[]
  statistics  UserStatistics?

  @@map("users")
}

model UserStatistics {
  id            String   @id @default(cuid())
  userId        String   @unique @map("user_id")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  totalGames    Int      @default(0) @map("total_games")
  wins          Int      @default(0)
  totalWinnings Int      @default(0) @map("total_winnings")
  totalLosses   Int      @default(0) @map("total_losses")
  biggestWin    Int      @default(0) @map("biggest_win")     // 单局最大赢取
  biggestLoss   Int      @default(0) @map("biggest_loss")    // 单局最大损失
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("user_statistics")
}

// ============ 房间模块 ============

model Room {
  id         String     @id @default(cuid())
  name       String                                // 房间名称
  code       String     @unique                    // 6位房间号（用于搜索）
  ownerId    String     @map("owner_id")           // 房主ID
  smallBlind Int        @map("small_blind")
  bigBlind   Int        @map("big_blind")
  maxPlayers Int        @default(8) @map("max_players")
  minBuyIn   Int        @map("min_buy_in")
  maxBuyIn   Int        @map("max_buy_in")
  status     RoomStatus @default(WAITING)
  createdAt  DateTime   @default(now()) @map("created_at")
  updatedAt  DateTime   @updatedAt @map("updated_at")
  deletedAt  DateTime?  @map("deleted_at")         // 软删除

  players RoomPlayer[]
  games   Game[]

  @@index([status])
  @@index([code])
  @@map("rooms")
}

model RoomPlayer {
  id        String       @id @default(cuid())
  roomId    String       @map("room_id")
  room      Room         @relation(fields: [roomId], references: [id], onDelete: Cascade)
  userId    String       @map("user_id")
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  chips     Int                                    // 带入筹码
  seatIndex Int?         @map("seat_index")        // 座位号（null=站立）
  status    PlayerStatus @default(STANDING)
  isReady   Boolean      @default(false) @map("is_ready")  // 是否准备下一局
  joinedAt  DateTime     @default(now()) @map("joined_at")
  leftAt    DateTime?    @map("left_at")

  @@unique([roomId, seatIndex])
  @@unique([roomId, userId])
  @@index([userId])
  @@map("room_players")
}

// ============ 游戏模块 ============

model Game {
  id               String    @id @default(cuid())
  roomId           String    @map("room_id")
  room             Room      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  roundNumber      Int       @map("round_number")          // 房间内的第几局
  phase            GamePhase @default(PREFLOP)
  pot              Int       @default(0)
  communityCards   String[]  @map("community_cards")       // 公共牌 ["Ah", "Kd", "Qc"]
  dealerIndex      Int       @map("dealer_index")          // 庄家座位
  smallBlindIndex  Int       @map("small_blind_index")     // 小盲座位
  bigBlindIndex    Int       @map("big_blind_index")       // 大盲座位
  currentPlayerIdx Int       @map("current_player_idx")    // 当前行动玩家座位
  currentBet       Int       @default(0) @map("current_bet") // 当前轮最大下注
  startedAt        DateTime  @default(now()) @map("started_at")
  endedAt          DateTime? @map("ended_at")

  actions GameAction[]
  players GamePlayer[]
  results GamePlayerResult[]

  @@index([roomId, startedAt])
  @@map("games")
}

model GamePlayer {
  id        String       @id @default(cuid())
  gameId    String       @map("game_id")
  game      Game         @relation(fields: [gameId], references: [id], onDelete: Cascade)
  userId    String       @map("user_id")
  seatIndex Int          @map("seat_index")
  holeCards String[]     @map("hole_cards")          // 底牌 ["As", "Kh"]
  chips     Int                                      // 本局开始时的筹码
  bet       Int          @default(0)                 // 本轮已下注
  totalBet  Int          @default(0) @map("total_bet") // 本局总下注
  status    PlayerStatus @default(ACTIVE)

  @@unique([gameId, seatIndex])
  @@unique([gameId, userId])
  @@map("game_players")
}

model GameAction {
  id         String     @id @default(cuid())
  gameId     String     @map("game_id")
  game       Game       @relation(fields: [gameId], references: [id], onDelete: Cascade)
  userId     String     @map("user_id")
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  phase      GamePhase                              // 操作时的阶段
  actionType ActionType @map("action_type")
  amount     Int?                                   // 下注/加注金额
  createdAt  DateTime   @default(now()) @map("created_at")

  @@index([gameId, createdAt])
  @@map("game_actions")
}

model GamePlayerResult {
  id           String  @id @default(cuid())
  gameId       String  @map("game_id")
  game         Game    @relation(fields: [gameId], references: [id], onDelete: Cascade)
  userId       String  @map("user_id")
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  handRank     String? @map("hand_rank")            // 牌型名称
  bestHand     String[] @map("best_hand")           // 最佳5张牌
  chipsWon     Int     @default(0) @map("chips_won")
  chipsLost    Int     @default(0) @map("chips_lost")
  isWinner     Boolean @default(false) @map("is_winner")

  @@unique([gameId, userId])
  @@map("game_player_results")
}

// ============ 枚举 ============

enum RoomStatus {
  WAITING   // 等待中
  PLAYING   // 游戏中
  FINISHED  // 已结束
}

enum PlayerStatus {
  STANDING     // 站立观战
  WAITING      // 入座等待
  ACTIVE       // 游戏中
  FOLDED       // 已弃牌
  ALL_IN       // 全下
  SPECTATING   // 入座观战（游戏中入座）
}

enum GamePhase {
  PREFLOP   // 翻牌前
  FLOP      // 翻牌
  TURN      // 转牌
  RIVER     // 河牌
  SHOWDOWN  // 摊牌
}

enum ActionType {
  FOLD      // 弃牌
  CHECK     // 过牌
  CALL      // 跟注
  RAISE     // 加注
  ALL_IN    // 全下
  POST_SB   // 下小盲
  POST_BB   // 下大盲
}
```

---

## 3. ER 图

```
┌─────────────────┐      1:1       ┌─────────────────┐
│      User       │───────────────►│ UserStatistics  │
├─────────────────┤                ├─────────────────┤
│ id              │                │ id              │
│ openid          │                │ userId          │
│ name            │                │ totalGames      │
│ avatar          │                │ wins            │
│ chips           │                │ totalWinnings   │
│ consecutiveCheck│                │ totalLosses     │
│ lastCheckinDate │                └─────────────────┘
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐      N:1       ┌─────────────────┐
│   RoomPlayer    │───────────────►│      Room       │
├─────────────────┤                ├─────────────────┤
│ id              │                │ id              │
│ roomId          │                │ name            │
│ userId          │                │ code            │
│ chips           │                │ ownerId         │
│ seatIndex       │                │ smallBlind      │
│ status          │                │ bigBlind        │
│ isReady         │                │ maxPlayers      │
└─────────────────┘                │ status          │
                                   └────────┬────────┘
                                            │
                                            │ 1:N
                                            ▼
┌─────────────────┐      N:1       ┌─────────────────┐
│   GamePlayer    │───────────────►│      Game       │
├─────────────────┤                ├─────────────────┤
│ id              │                │ id              │
│ gameId          │                │ roomId          │
│ userId          │                │ roundNumber     │
│ seatIndex       │                │ phase           │
│ holeCards       │                │ pot             │
│ chips           │                │ communityCards  │
│ bet             │                │ dealerIndex     │
│ status          │                └────────┬────────┘
└─────────────────┘                         │
                                            │ 1:N
         ┌──────────────────────────────────┴──────────────────┐
         │                                                      │
         ▼                                                      ▼
┌─────────────────┐                               ┌─────────────────────┐
│   GameAction    │                               │  GamePlayerResult   │
├─────────────────┤                               ├─────────────────────┤
│ id              │                               │ id                  │
│ gameId          │                               │ gameId              │
│ userId          │                               │ userId              │
│ phase           │                               │ handRank            │
│ actionType      │                               │ bestHand            │
│ amount          │                               │ chipsWon            │
│ createdAt       │                               │ isWinner            │
└─────────────────┘                               └─────────────────────┘
```

---

## 4. 索引设计

### 4.1 主要索引

```sql
-- 用户表
CREATE UNIQUE INDEX users_openid_key ON users(openid);

-- 房间表
CREATE INDEX rooms_status_idx ON rooms(status);
CREATE UNIQUE INDEX rooms_code_key ON rooms(code);

-- 房间玩家表
CREATE UNIQUE INDEX room_players_room_seat_key ON room_players(room_id, seat_index);
CREATE UNIQUE INDEX room_players_room_user_key ON room_players(room_id, user_id);
CREATE INDEX room_players_user_id_idx ON room_players(user_id);

-- 游戏表
CREATE INDEX games_room_started_idx ON games(room_id, started_at);

-- 游戏动作表
CREATE INDEX game_actions_game_created_idx ON game_actions(game_id, created_at);

-- 游戏玩家结果表
CREATE UNIQUE INDEX game_player_results_game_user_key ON game_player_results(game_id, user_id);
```

### 4.2 索引说明

| 表 | 索引 | 类型 | 用途 |
|------|------|------|------|
| users | openid | UNIQUE | 微信登录查询 |
| rooms | status | INDEX | 按状态筛选房间 |
| rooms | code | UNIQUE | 按房间号搜索 |
| room_players | (room_id, seat_index) | UNIQUE | 确保座位唯一 |
| room_players | (room_id, user_id) | UNIQUE | 确保用户不重复加入 |
| games | (room_id, started_at) | INDEX | 查询房间的游戏历史 |
| game_actions | (game_id, created_at) | INDEX | 按时间顺序获取操作 |

---

## 5. 数据库包结构

```
packages/database/
├── prisma/
│   ├── schema.prisma          # Schema 定义
│   ├── migrations/            # 迁移文件（自动生成）
│   │   ├── 20260211000000_init/
│   │   └── migration_lock.toml
│   └── seed.ts                # 种子数据
│
├── src/
│   ├── index.ts               # 导出入口
│   └── client.ts              # Prisma 客户端单例
│
├── package.json
└── tsconfig.json
```

### 5.1 客户端单例

```typescript
// packages/database/src/client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### 5.2 导出

```typescript
// packages/database/src/index.ts
export { prisma } from './client'
export * from '@prisma/client'
```

---

## 6. 迁移管理

### 6.1 常用命令

```bash
# 创建迁移（开发环境）
pnpm --filter @holdem/database prisma migrate dev --name <migration_name>

# 应用迁移（生产环境）
pnpm --filter @holdem/database prisma migrate deploy

# 生成 Prisma Client
pnpm --filter @holdem/database prisma generate

# 重置数据库（开发环境）
pnpm --filter @holdem/database prisma migrate reset

# 查看迁移状态
pnpm --filter @holdem/database prisma migrate status

# 打开 Prisma Studio
pnpm --filter @holdem/database prisma studio
```

### 6.2 迁移策略

1. **开发阶段**：使用 `migrate dev` 自动生成和应用迁移
2. **生产部署**：使用 `migrate deploy` 仅应用迁移
3. **紧急回滚**：手动执行 SQL 或创建反向迁移

---

## 7. 种子数据

```typescript
// packages/database/prisma/seed.ts
import { prisma } from '../src/client'

async function main() {
  // 创建测试用户
  const testUser = await prisma.user.upsert({
    where: { openid: 'test_openid' },
    update: {},
    create: {
      openid: 'test_openid',
      name: '测试玩家',
      chips: 10000,
      statistics: {
        create: {}
      }
    },
  })

  // 创建测试房间
  const testRoom = await prisma.room.create({
    data: {
      name: '测试房间',
      code: '123456',
      ownerId: testUser.id,
      smallBlind: 10,
      bigBlind: 20,
      minBuyIn: 1000,
      maxBuyIn: 5000,
      maxPlayers: 8,
    },
  })

  console.log({ testUser, testRoom })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## 8. 查询示例

### 8.1 获取房间列表（带玩家数量）

```typescript
const rooms = await prisma.room.findMany({
  where: {
    status: 'WAITING',
    deletedAt: null,
  },
  include: {
    _count: {
      select: { players: true }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
})

// 结果转换
const roomList = rooms.map(room => ({
  ...room,
  currentPlayers: room._count.players,
}))
```

### 8.2 获取游戏详情（完整关联）

```typescript
const game = await prisma.game.findUnique({
  where: { id: gameId },
  include: {
    room: true,
    players: {
      include: { user: { select: { id, name, avatar } } }
    },
    actions: {
      orderBy: { createdAt: 'asc' }
    },
    results: {
      include: { user: { select: { id, name } } }
    }
  }
})
```

### 8.3 用户游戏历史（分页）

```typescript
const history = await prisma.gamePlayerResult.findMany({
  where: { userId },
  include: {
    game: {
      include: {
        room: { select: { name: true } }
      }
    }
  },
  orderBy: { game: { startedAt: 'desc' } },
  skip: (page - 1) * pageSize,
  take: pageSize,
})
```

### 8.4 签到（事务）

```typescript
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({
    where: { id: userId }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 检查今日是否已签到
  if (user.lastCheckinDate && user.lastCheckinDate >= today) {
    throw new Error('今日已签到')
  }

  // 计算连续签到天数
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isConsecutive = user.lastCheckinDate &&
    user.lastCheckinDate >= yesterday

  const consecutiveDays = isConsecutive
    ? (user.consecutiveCheckins % 7) + 1
    : 1

  // 签到奖励
  const rewards = [1000, 1200, 1500, 1800, 2000, 2500, 3000]
  const reward = rewards[consecutiveDays - 1]

  // 更新用户
  return tx.user.update({
    where: { id: userId },
    data: {
      chips: { increment: reward },
      consecutiveCheckins: consecutiveDays,
      lastCheckinDate: today,
    }
  })
})
```

---

## 9. 数据备份

### 9.1 备份策略

| 类型 | 频率 | 保留时间 |
|------|------|----------|
| 全量备份 | 每日 | 30 天 |
| WAL 归档 | 实时 | 7 天 |

### 9.2 Zeabur 备份

Zeabur 提供自动备份功能：
1. 进入 PostgreSQL 服务页面
2. 点击 **Backups** 标签
3. 可查看和下载备份
4. 支持一键恢复

---

## 10. 性能优化

### 10.1 连接池配置

```typescript
// 生产环境建议配置
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Prisma 默认使用连接池
  // 可通过 URL 参数配置：
  // postgresql://...?connection_limit=20&pool_timeout=30
})
```

### 10.2 查询优化建议

1. **选择性返回字段**：使用 `select` 而非 `include` 全部
2. **分页查询**：大列表必须分页
3. **批量操作**：使用 `createMany`、`updateMany`
4. **避免 N+1**：使用 `include` 预加载关联
5. **使用事务**：保证数据一致性

---

## 11. 待办事项

- [ ] 完善 Schema 定义
- [ ] 创建初始迁移
- [ ] 编写种子数据
- [ ] 配置生产环境连接池
- [ ] 设置自动备份
- [ ] 添加数据库监控
