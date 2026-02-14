# 前端技术方案 - Taro 微信小程序

> 版本：v1.0
> 更新日期：2026-02-11

---

## 1. 技术选型

### 1.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Taro | 4.x | 跨平台小程序框架 |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |

### 1.2 UI 组件库

| 技术 | 版本 | 用途 |
|------|------|------|
| @nutui/nutui-react-taro | 2.x | Taro 专用组件库 |
| @tarojs/components | 4.x | Taro 基础组件 |

### 1.3 状态管理

| 技术 | 版本 | 用途 |
|------|------|------|
| Zustand | 5.x | 全局状态管理 |
| @tanstack/react-query | 5.x | 服务端状态管理 |

### 1.4 样式方案

| 技术 | 版本 | 用途 |
|------|------|------|
| Sass | 1.x | CSS 预处理器 |
| postcss-pxtransform | - | 像素单位转换 |

### 1.5 开发工具

| 技术 | 版本 | 用途 |
|------|------|------|
| ESLint | 9.x | 代码规范 |
| Prettier | 3.x | 代码格式化 |
| husky | 9.x | Git Hooks |

---

## 2. 项目结构

```
apps/miniapp/
├── config/                      # Taro 配置
│   ├── index.ts                 # 主配置
│   ├── dev.ts                   # 开发环境配置
│   └── prod.ts                  # 生产环境配置
│
├── src/
│   ├── app.tsx                  # 应用入口
│   ├── app.config.ts            # 全局配置（tabBar、pages）
│   ├── app.scss                 # 全局样式
│   │
│   ├── pages/                   # 页面目录
│   │   ├── index/               # 首页（重定向）
│   │   │   ├── index.tsx
│   │   │   └── index.config.ts
│   │   │
│   │   ├── login/               # 登录页
│   │   │   ├── index.tsx
│   │   │   ├── index.scss
│   │   │   └── index.config.ts
│   │   │
│   │   ├── lobby/               # 大厅页
│   │   │   ├── index.tsx
│   │   │   ├── index.scss
│   │   │   └── index.config.ts
│   │   │
│   │   ├── profile/             # 个人中心
│   │   │   ├── index.tsx
│   │   │   ├── index.scss
│   │   │   └── index.config.ts
│   │   │
│   │   ├── game/                # 游戏房间
│   │   │   ├── index.tsx
│   │   │   ├── index.scss
│   │   │   └── index.config.ts
│   │   │
│   │   ├── history/             # 历史记录
│   │   │   ├── index.tsx
│   │   │   ├── index.scss
│   │   │   └── index.config.ts
│   │   │
│   │   └── rules/               # 游戏规则
│   │       ├── index.tsx
│   │       ├── index.scss
│   │       └── index.config.ts
│   │
│   ├── components/              # 公共组件
│   │   ├── common/              # 通用组件
│   │   │   ├── Loading/
│   │   │   ├── Empty/
│   │   │   └── ErrorBoundary/
│   │   │
│   │   ├── room/                # 房间相关组件
│   │   │   ├── RoomCard/
│   │   │   ├── CreateRoomModal/
│   │   │   └── JoinRoomModal/
│   │   │
│   │   ├── game/                # 游戏相关组件
│   │   │   ├── PokerTable/      # 牌桌
│   │   │   ├── PlayerSeat/      # 玩家座位
│   │   │   ├── PlayingCard/     # 扑克牌
│   │   │   ├── ActionBar/       # 操作栏
│   │   │   ├── ChipStack/       # 筹码堆
│   │   │   └── GameResult/      # 结算弹窗
│   │   │
│   │   └── profile/             # 个人中心组件
│   │       ├── UserInfo/
│   │       ├── StatsCard/
│   │       └── CheckinCard/
│   │
│   ├── stores/                  # Zustand 状态管理
│   │   ├── index.ts             # Store 导出
│   │   ├── useAuthStore.ts      # 认证状态
│   │   ├── useUserStore.ts      # 用户状态
│   │   ├── useRoomStore.ts      # 房间状态
│   │   └── useGameStore.ts      # 游戏状态
│   │
│   ├── services/                # API 服务
│   │   ├── index.ts             # 服务导出
│   │   ├── request.ts           # 请求封装
│   │   ├── auth.ts              # 认证 API
│   │   ├── user.ts              # 用户 API
│   │   ├── room.ts              # 房间 API
│   │   └── game.ts              # 游戏 API
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useAuth.ts           # 认证相关
│   │   ├── useWebSocket.ts      # WebSocket 连接
│   │   ├── useGameSocket.ts     # 游戏 Socket
│   │   └── useCountdown.ts      # 倒计时
│   │
│   ├── utils/                   # 工具函数
│   │   ├── index.ts
│   │   ├── storage.ts           # 本地存储
│   │   ├── format.ts            # 格式化
│   │   └── poker.ts             # 扑克牌工具
│   │
│   ├── constants/               # 常量定义
│   │   ├── index.ts
│   │   ├── api.ts               # API 地址
│   │   ├── storage.ts           # 存储 Key
│   │   └── game.ts              # 游戏常量
│   │
│   └── types/                   # 类型定义
│       └── index.ts             # 从 @holdem/shared-types 重导出
│
├── project.config.json          # 微信小程序配置
├── project.private.config.json  # 私有配置（gitignore）
├── package.json
├── tsconfig.json
└── babel.config.js
```

---

## 3. 页面路由配置

### 3.1 app.config.ts

```typescript
export default defineAppConfig({
  pages: [
    'pages/index/index',      // 入口页（路由守卫）
    'pages/login/index',      // 登录页
    'pages/lobby/index',      // 大厅页
    'pages/profile/index',    // 个人中心
    'pages/game/index',       // 游戏房间
    'pages/history/index',    // 历史记录
    'pages/rules/index',      // 游戏规则
  ],
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#D4AF37',
    backgroundColor: '#121214',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/lobby/index',
        text: '大厅',
        iconPath: 'assets/icons/lobby.png',
        selectedIconPath: 'assets/icons/lobby-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#121214',
    navigationBarTitleText: '德州扑克',
    navigationBarTextStyle: 'white',
    backgroundColor: '#121214',
  },
})
```

### 3.2 页面配置示例

```typescript
// pages/game/index.config.ts
export default definePageConfig({
  navigationBarTitleText: '游戏房间',
  navigationStyle: 'custom',        // 自定义导航栏
  pageOrientation: 'landscape',     // 横屏模式
  disableScroll: true,              // 禁止滚动
})
```

---

## 4. 状态管理设计

### 4.1 认证状态 (useAuthStore)

```typescript
interface AuthState {
  token: string | null
  isLoggedIn: boolean
  isLoading: boolean

  // Actions
  login: (code: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<boolean>
}
```

### 4.2 用户状态 (useUserStore)

```typescript
interface UserState {
  user: User | null
  statistics: UserStatistics | null

  // Actions
  fetchUser: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
  checkin: () => Promise<CheckinResult>
}
```

### 4.3 房间状态 (useRoomStore)

```typescript
interface RoomState {
  rooms: Room[]
  currentRoom: Room | null
  isLoading: boolean

  // Actions
  fetchRooms: (params?: RoomListParams) => Promise<void>
  createRoom: (data: CreateRoomData) => Promise<Room>
  joinRoom: (roomId: string, buyIn: number) => Promise<void>
  leaveRoom: () => Promise<void>
}
```

### 4.4 游戏状态 (useGameStore)

```typescript
interface GameState {
  gamePhase: GamePhase
  pot: number
  communityCards: Card[]
  players: GamePlayer[]
  currentPlayerIndex: number
  dealerIndex: number
  myCards: Card[]
  myStatus: PlayerStatus

  // Actions
  sitDown: (seatIndex: number) => Promise<void>
  standUp: () => Promise<void>
  performAction: (action: GameAction) => Promise<void>
  readyForNextGame: (ready: boolean) => Promise<void>

  // Socket handlers
  handleGameUpdate: (data: GameUpdateEvent) => void
  handlePlayerAction: (data: PlayerActionEvent) => void
}
```

---

## 5. API 服务封装

### 5.1 请求封装 (request.ts)

```typescript
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/useAuthStore'
import { API_BASE_URL } from '@/constants/api'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: Record<string, any>
  header?: Record<string, string>
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const token = useAuthStore.getState().token

  const response = await Taro.request({
    url: `${API_BASE_URL}${options.url}`,
    method: options.method || 'GET',
    data: options.data,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.header,
    },
  })

  if (response.statusCode === 401) {
    useAuthStore.getState().logout()
    Taro.redirectTo({ url: '/pages/login/index' })
    throw new Error('Unauthorized')
  }

  if (response.statusCode >= 400) {
    throw new Error(response.data?.message || 'Request failed')
  }

  return response.data as T
}
```

### 5.2 认证服务 (auth.ts)

```typescript
import { request } from './request'

interface WxLoginResponse {
  token: string
  user: User
}

export const authService = {
  // 微信登录
  async wxLogin(code: string): Promise<WxLoginResponse> {
    return request({
      url: '/api/auth/wechat-login',
      method: 'POST',
      data: { code },
    })
  },

  // 获取当前用户
  async getCurrentUser(): Promise<User> {
    return request({
      url: '/api/auth/me',
      method: 'GET',
    })
  },
}
```

---

## 6. WebSocket 设计

### 6.1 WebSocket Hook

```typescript
// hooks/useGameSocket.ts
import { useEffect, useRef, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGameStore } from '@/stores/useGameStore'
import { WS_BASE_URL } from '@/constants/api'

export function useGameSocket(roomId: string) {
  const socketRef = useRef<Taro.SocketTask | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnects = 5

  const token = useAuthStore((s) => s.token)
  const { handleGameUpdate, handlePlayerAction } = useGameStore()

  const connect = useCallback(() => {
    if (!token || !roomId) return

    socketRef.current = Taro.connectSocket({
      url: `${WS_BASE_URL}/ws/game/${roomId}?token=${token}`,
    })

    socketRef.current.onOpen(() => {
      console.log('WebSocket connected')
      reconnectAttempts.current = 0
    })

    socketRef.current.onMessage((res) => {
      const data = JSON.parse(res.data)
      switch (data.type) {
        case 'game:update':
          handleGameUpdate(data.payload)
          break
        case 'player:action':
          handlePlayerAction(data.payload)
          break
        // ... 其他事件
      }
    })

    socketRef.current.onClose(() => {
      if (reconnectAttempts.current < maxReconnects) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        setTimeout(() => {
          reconnectAttempts.current++
          connect()
        }, delay)
      }
    })
  }, [token, roomId])

  const sendMessage = useCallback((type: string, payload: any) => {
    if (socketRef.current) {
      socketRef.current.send({
        data: JSON.stringify({ type, payload }),
      })
    }
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.close({})
    socketRef.current = null
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { sendMessage, disconnect }
}
```

---

## 7. 核心组件设计

### 7.1 扑克牌组件 (PlayingCard)

```typescript
interface PlayingCardProps {
  card: Card | null          // null 表示背面
  size?: 'small' | 'medium' | 'large'
  highlight?: boolean
  className?: string
}

// Card = `${Rank}${Suit}` e.g., 'As', 'Kh', '2c'
// Suit: h(hearts), d(diamonds), c(clubs), s(spades)
```

### 7.2 玩家座位组件 (PlayerSeat)

```typescript
interface PlayerSeatProps {
  player: GamePlayer | null  // null 表示空座位
  seatIndex: number
  isDealer: boolean
  isCurrentTurn: boolean
  isSelf: boolean
  onSit?: () => void
}

// 显示内容：
// - 空座位：显示 "入座" 按钮
// - 有玩家：头像、昵称、筹码、状态标识、下注金额、手牌
```

### 7.3 操作栏组件 (ActionBar)

```typescript
interface ActionBarProps {
  status: 'spectating' | 'waiting' | 'playing'
  canCheck: boolean
  callAmount: number
  minRaise: number
  maxRaise: number
  onFold: () => void
  onCheck: () => void
  onCall: () => void
  onRaise: (amount: number) => void
  onAllIn: () => void
  onStandUp: () => void
}
```

---

## 8. 样式设计

### 8.1 设计变量

```scss
// src/app.scss

// 颜色系统
$color-bg-primary: #121214;
$color-bg-secondary: #1A1A1C;
$color-bg-card: #242428;
$color-primary: #D4AF37;
$color-success: #22C55E;
$color-danger: #EF4444;
$color-text-primary: #FFFFFF;
$color-text-secondary: #9CA3AF;
$color-poker-green: #1A3D2E;

// 间距
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// 圆角
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-full: 9999px;

// 字体
$font-size-xs: 24px;    // 12px * 2
$font-size-sm: 28px;    // 14px * 2
$font-size-md: 32px;    // 16px * 2
$font-size-lg: 36px;    // 18px * 2
$font-size-xl: 40px;    // 20px * 2
```

### 8.2 游戏房间横屏布局

```scss
// pages/game/index.scss

.game-page {
  width: 100vh;       // 横屏模式
  height: 100vw;
  background: $color-poker-green;
  position: relative;
  overflow: hidden;
}

.poker-table {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 60%;
  background: radial-gradient(ellipse, #2d5a44 0%, #1A3D2E 100%);
  border-radius: 50%;
  border: 8px solid #8B4513;
  box-shadow:
    0 0 20px rgba(0, 0, 0, 0.5),
    inset 0 0 30px rgba(0, 0, 0, 0.3);
}

// 8个座位位置
.seat {
  position: absolute;

  &--1 { bottom: 10%; left: 35%; }
  &--2 { bottom: 10%; right: 35%; }
  &--3 { top: 50%; right: 5%; transform: translateY(-50%); }
  &--4 { top: 20%; right: 20%; }
  &--5 { top: 10%; left: 50%; transform: translateX(-50%); }
  &--6 { top: 20%; left: 20%; }
  &--7 { top: 50%; left: 5%; transform: translateY(-50%); }
  &--8 { bottom: 10%; left: 50%; transform: translateX(-50%); }
}
```

---

## 9. 微信小程序特殊处理

### 9.1 登录流程

```typescript
// pages/login/index.tsx
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/useAuthStore'

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()

  const handleLogin = async () => {
    try {
      // 1. 获取微信 code
      const { code } = await Taro.login()

      // 2. 使用 code 登录后端
      await login(code)

      // 3. 跳转到大厅
      Taro.switchTab({ url: '/pages/lobby/index' })
    } catch (error) {
      Taro.showToast({ title: '登录失败', icon: 'error' })
    }
  }

  return (
    <View className="login-page">
      <Button onClick={handleLogin} loading={isLoading}>
        微信授权登录
      </Button>
    </View>
  )
}
```

### 9.2 获取用户信息

```typescript
// 微信小程序需要用户主动触发授权
const handleGetUserInfo = async () => {
  try {
    const { userInfo } = await Taro.getUserProfile({
      desc: '用于完善用户资料',
    })

    // 上传头像昵称到后端
    await userService.updateProfile({
      nickname: userInfo.nickName,
      avatar: userInfo.avatarUrl,
    })
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}
```

### 9.3 横屏适配

```typescript
// pages/game/index.tsx
import { useEffect } from 'react'
import Taro from '@tarojs/taro'

export default function GamePage() {
  useEffect(() => {
    // 进入时设置横屏
    Taro.setScreenOrientation({ orientation: 'landscape' })

    // 退出时恢复竖屏
    return () => {
      Taro.setScreenOrientation({ orientation: 'portrait' })
    }
  }, [])

  // ...
}
```

---

## 10. 性能优化

### 10.1 包体积优化

- 按需引入 NutUI 组件
- 使用 Tree Shaking 移除未使用代码
- 图片资源压缩，大图使用 CDN
- 分包加载非核心页面

### 10.2 分包配置

```typescript
// app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/login/index',
    'pages/lobby/index',
    'pages/profile/index',
  ],
  subPackages: [
    {
      root: 'packageGame',
      pages: ['pages/game/index'],
    },
    {
      root: 'packageOther',
      pages: [
        'pages/history/index',
        'pages/rules/index',
      ],
    },
  ],
})
```

### 10.3 渲染优化

- 使用 `React.memo` 包裹纯展示组件
- 座位组件独立更新，避免牌桌重渲染
- WebSocket 消息批量处理
- 图片懒加载

---

## 11. 开发与调试

### 11.1 常用命令

```bash
# 安装依赖
pnpm --filter @holdem/miniapp install

# 开发模式（微信小程序）
pnpm --filter @holdem/miniapp dev:weapp

# 构建（微信小程序）
pnpm --filter @holdem/miniapp build:weapp

# 类型检查
pnpm --filter @holdem/miniapp typecheck

# 代码检查
pnpm --filter @holdem/miniapp lint
```

### 11.2 调试配置

```json
// project.config.json
{
  "appid": "your-appid",
  "projectname": "holdem",
  "setting": {
    "urlCheck": false,    // 开发时关闭域名校验
    "es6": true,
    "postcss": true,
    "minified": true
  }
}
```

---

## 12. 待办事项

- [ ] 创建 Taro 项目脚手架
- [ ] 配置 NutUI 组件库
- [ ] 实现登录流程
- [ ] 实现大厅页面
- [ ] 实现游戏房间
- [ ] 实现个人中心
- [ ] WebSocket 联调
- [ ] 横屏适配测试
- [ ] 真机调试
- [ ] 小程序审核上线
