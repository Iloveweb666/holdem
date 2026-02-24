# 前端技术方案 - Taro + Canvas 2D

> 版本：v1.1
> 更新日期：2026-02-24

---

## 1. 技术选型

### 1.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Taro | 4.x | 跨平台小程序框架 |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |

### 1.2 游戏渲染

| 技术 | 说明 |
|------|------|
| Canvas 2D | 小程序原生 Canvas API，type="2d" |
| 同层渲染 | 解决 Canvas 与普通组件层叠问题 |

### 1.3 状态管理

| 技术 | 版本 | 用途 |
|------|------|------|
| Zustand | 5.x | 全局状态管理 |

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

---

## 2. 项目结构

```
miniprogram/
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
│   │   ├── login/               # 登录页
│   │   ├── lobby/               # 大厅页
│   │   ├── profile/             # 个人中心
│   │   ├── game/                # 游戏房间（横屏）
│   │   ├── history/             # 历史记录
│   │   └── rules/               # 游戏规则
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
│   │   │   ├── canvas/          # Canvas 渲染模块
│   │   │   │   ├── GameCanvas.tsx       # Canvas 容器组件
│   │   │   │   ├── renderers/           # 渲染器
│   │   │   │   │   ├── TableRenderer.ts     # 牌桌渲染
│   │   │   │   │   ├── CardRenderer.ts      # 扑克牌渲染
│   │   │   │   │   ├── ChipRenderer.ts      # 筹码渲染
│   │   │   │   │   ├── PlayerRenderer.ts    # 玩家信息渲染
│   │   │   │   │   └── TextRenderer.ts      # 文字渲染
│   │   │   │   ├── animations/          # 动画模块
│   │   │   │   │   ├── AnimationManager.ts  # 动画管理器
│   │   │   │   │   ├── TweenEngine.ts       # 缓动引擎
│   │   │   │   │   └── presets.ts           # 预设动画
│   │   │   │   └── utils/               # Canvas 工具
│   │   │   │       ├── ImageLoader.ts       # 图片加载器
│   │   │   │       └── CoordinateSystem.ts  # 坐标系统
│   │   │   │
│   │   │   ├── ui/              # 游戏 UI 组件（普通组件）
│   │   │   │   ├── ActionBar/       # 操作栏
│   │   │   │   ├── GameHeader/      # 顶部信息栏
│   │   │   │   ├── GameResult/      # 结算弹窗
│   │   │   │   └── BetSlider/       # 下注滑块
│   │   │   │
│   │   │   └── GamePage.tsx     # 游戏页面整合
│   │   │
│   │   └── profile/             # 个人中心组件
│   │       ├── UserInfo/
│   │       ├── StatsCard/
│   │       └── CheckinCard/
│   │
│   ├── stores/                  # Zustand 状态管理
│   │   ├── index.ts
│   │   ├── useAuthStore.ts      # 认证状态
│   │   ├── useUserStore.ts      # 用户状态
│   │   ├── useRoomStore.ts      # 房间状态
│   │   └── useGameStore.ts      # 游戏状态
│   │
│   ├── services/                # 云函数调用封装
│   │   ├── index.ts
│   │   ├── cloud.ts             # 云开发初始化
│   │   ├── auth.ts              # 认证服务
│   │   ├── user.ts              # 用户服务
│   │   ├── room.ts              # 房间服务
│   │   └── game.ts              # 游戏服务
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useAuth.ts           # 认证相关
│   │   ├── useCloudWatch.ts     # 数据库监听
│   │   ├── useGameWatch.ts      # 游戏状态监听
│   │   ├── useCanvas.ts         # Canvas 初始化
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
│   │   ├── cloud.ts             # 云开发配置
│   │   ├── storage.ts           # 存储 Key
│   │   └── game.ts              # 游戏常量
│   │
│   ├── types/                   # 类型定义
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── room.ts
│   │   ├── game.ts
│   │   └── canvas.ts
│   │
│   └── assets/                  # 静态资源
│       ├── images/
│       │   ├── cards/           # 扑克牌图片 (52张 + 背面)
│       │   ├── chips/           # 筹码图片
│       │   ├── table/           # 牌桌背景
│       │   └── avatars/         # 默认头像
│       └── icons/               # 图标
│
├── project.config.json          # 微信小程序配置
└── package.json
```

---

## 3. Canvas 渲染架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      GamePage                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  GameCanvas (Canvas 2D)                │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              RenderManager                       │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │  │  │
│  │  │  │  Table   │ │  Cards   │ │  Chips   │        │  │  │
│  │  │  │ Renderer │ │ Renderer │ │ Renderer │        │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘        │  │  │
│  │  │  ┌──────────┐ ┌──────────┐                     │  │  │
│  │  │  │ Player   │ │  Text    │                     │  │  │
│  │  │  │ Renderer │ │ Renderer │                     │  │  │
│  │  │  └──────────┘ └──────────┘                     │  │  │
│  │  │                    │                            │  │  │
│  │  │                    ▼                            │  │  │
│  │  │           AnimationManager                      │  │  │
│  │  │           (Tween / Timeline)                    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│                              │ 层叠 (z-index)                │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              UI Components (普通 View)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │  │
│  │  │ ActionBar │ │GameHeader│ │  Modal   │              │  │
│  │  └──────────┘ └──────────┘ └──────────┘              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Canvas 组件

```tsx
// components/game/canvas/GameCanvas.tsx
import { Canvas } from '@tarojs/components'
import { useEffect, useRef } from 'react'
import Taro from '@tarojs/taro'
import { useGameStore } from '@/stores/useGameStore'
import { RenderManager } from './renderers/RenderManager'

interface GameCanvasProps {
  width: number
  height: number
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  const renderManagerRef = useRef<RenderManager | null>(null)
  const gameState = useGameStore((s) => s.gameState)

  useEffect(() => {
    // 初始化 Canvas 2D
    const query = Taro.createSelectorQuery()
    query.select('#game-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        // 设置 Canvas 尺寸（适配高清屏）
        const dpr = Taro.getSystemInfoSync().pixelRatio
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        // 初始化渲染管理器
        renderManagerRef.current = new RenderManager(ctx, width, height)
        renderManagerRef.current.loadAssets().then(() => {
          renderManagerRef.current?.startRenderLoop()
        })
      })

    return () => {
      renderManagerRef.current?.stopRenderLoop()
    }
  }, [width, height])

  // 游戏状态变化时更新渲染
  useEffect(() => {
    if (renderManagerRef.current && gameState) {
      renderManagerRef.current.updateGameState(gameState)
    }
  }, [gameState])

  return (
    <Canvas
      type="2d"
      id="game-canvas"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  )
}
```

### 3.3 渲染管理器

```typescript
// components/game/canvas/renderers/RenderManager.ts
import { TableRenderer } from './TableRenderer'
import { CardRenderer } from './CardRenderer'
import { ChipRenderer } from './ChipRenderer'
import { PlayerRenderer } from './PlayerRenderer'
import { AnimationManager } from '../animations/AnimationManager'
import { ImageLoader } from '../utils/ImageLoader'
import type { GameState } from '@/types/game'

export class RenderManager {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  private tableRenderer: TableRenderer
  private cardRenderer: CardRenderer
  private chipRenderer: ChipRenderer
  private playerRenderer: PlayerRenderer
  private animationManager: AnimationManager
  private imageLoader: ImageLoader

  private gameState: GameState | null = null
  private animationFrameId: number | null = null

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height

    this.imageLoader = new ImageLoader()
    this.animationManager = new AnimationManager()

    this.tableRenderer = new TableRenderer(ctx, width, height)
    this.cardRenderer = new CardRenderer(ctx, this.imageLoader)
    this.chipRenderer = new ChipRenderer(ctx, this.imageLoader)
    this.playerRenderer = new PlayerRenderer(ctx, this.imageLoader)
  }

  async loadAssets(): Promise<void> {
    // 预加载所有游戏资源
    await this.imageLoader.loadAll([
      // 扑克牌
      ...this.getCardImagePaths(),
      // 筹码
      '/assets/images/chips/chip-red.png',
      '/assets/images/chips/chip-blue.png',
      '/assets/images/chips/chip-green.png',
      // 牌桌
      '/assets/images/table/felt.png',
    ])
  }

  private getCardImagePaths(): string[] {
    const suits = ['h', 'd', 'c', 's']
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
    const paths = ['/assets/images/cards/back.png']
    for (const suit of suits) {
      for (const rank of ranks) {
        paths.push(`/assets/images/cards/${rank}${suit}.png`)
      }
    }
    return paths
  }

  updateGameState(state: GameState): void {
    this.gameState = state
    // 触发相应动画
    this.animationManager.handleStateChange(state)
  }

  startRenderLoop(): void {
    const render = () => {
      this.render()
      this.animationFrameId = requestAnimationFrame(render)
    }
    render()
  }

  stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }

  private render(): void {
    // 清空画布
    this.ctx.clearRect(0, 0, this.width, this.height)

    // 更新动画
    this.animationManager.update()

    // 按层级渲染
    this.tableRenderer.render()                              // 1. 牌桌背景
    this.chipRenderer.render(this.gameState?.pot)            // 2. 底池筹码
    this.cardRenderer.renderCommunityCards(                  // 3. 公共牌
      this.gameState?.communityCards,
      this.animationManager
    )
    this.playerRenderer.render(                              // 4. 玩家信息
      this.gameState?.players,
      this.animationManager
    )
  }
}
```

### 3.4 扑克牌渲染器

```typescript
// components/game/canvas/renderers/CardRenderer.ts
import { ImageLoader } from '../utils/ImageLoader'
import { AnimationManager } from '../animations/AnimationManager'
import type { Card } from '@/types/game'

// 公共牌位置（相对于牌桌中心）
const COMMUNITY_CARD_POSITIONS = [
  { x: -120, y: 0 },
  { x: -60, y: 0 },
  { x: 0, y: 0 },
  { x: 60, y: 0 },
  { x: 120, y: 0 },
]

const CARD_WIDTH = 50
const CARD_HEIGHT = 70

export class CardRenderer {
  private ctx: CanvasRenderingContext2D
  private imageLoader: ImageLoader

  constructor(ctx: CanvasRenderingContext2D, imageLoader: ImageLoader) {
    this.ctx = ctx
    this.imageLoader = imageLoader
  }

  renderCommunityCards(
    cards: Card[] | undefined,
    animationManager: AnimationManager
  ): void {
    if (!cards) return

    const centerX = this.ctx.canvas.width / 2
    const centerY = this.ctx.canvas.height / 2

    cards.forEach((card, index) => {
      const pos = COMMUNITY_CARD_POSITIONS[index]
      const animation = animationManager.getCardAnimation(index)

      // 应用动画变换
      const x = centerX + pos.x + (animation?.offsetX || 0)
      const y = centerY + pos.y + (animation?.offsetY || 0)
      const scale = animation?.scale || 1
      const rotation = animation?.rotation || 0
      const alpha = animation?.alpha || 1

      this.ctx.save()
      this.ctx.globalAlpha = alpha
      this.ctx.translate(x, y)
      this.ctx.rotate(rotation)
      this.ctx.scale(scale, scale)

      // 绘制卡牌
      this.drawCard(card, 0, 0, CARD_WIDTH, CARD_HEIGHT)

      this.ctx.restore()
    })
  }

  renderPlayerCards(
    cards: Card[],
    x: number,
    y: number,
    faceUp: boolean
  ): void {
    const cardSpacing = 25

    cards.forEach((card, index) => {
      const cardX = x + index * cardSpacing
      if (faceUp) {
        this.drawCard(card, cardX, y, CARD_WIDTH * 0.8, CARD_HEIGHT * 0.8)
      } else {
        this.drawCardBack(cardX, y, CARD_WIDTH * 0.8, CARD_HEIGHT * 0.8)
      }
    })
  }

  private drawCard(
    card: Card,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const image = this.imageLoader.get(`/assets/images/cards/${card}.png`)
    if (image) {
      this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height)
    }
  }

  private drawCardBack(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const image = this.imageLoader.get('/assets/images/cards/back.png')
    if (image) {
      this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height)
    }
  }
}
```

### 3.5 动画管理器

```typescript
// components/game/canvas/animations/AnimationManager.ts
import { TweenEngine, Tween } from './TweenEngine'
import type { GameState } from '@/types/game'

interface CardAnimation {
  offsetX: number
  offsetY: number
  scale: number
  rotation: number
  alpha: number
}

export class AnimationManager {
  private tweenEngine: TweenEngine
  private cardAnimations: Map<number, CardAnimation> = new Map()
  private previousState: GameState | null = null

  constructor() {
    this.tweenEngine = new TweenEngine()
  }

  handleStateChange(newState: GameState): void {
    if (!this.previousState) {
      this.previousState = newState
      return
    }

    // 检测新翻开的公共牌
    const prevCards = this.previousState.communityCards?.length || 0
    const newCards = newState.communityCards?.length || 0

    if (newCards > prevCards) {
      // 新牌翻开动画
      for (let i = prevCards; i < newCards; i++) {
        this.animateCardReveal(i)
      }
    }

    // 检测筹码变化
    if (newState.pot !== this.previousState.pot) {
      this.animateChipsMovement(newState.pot)
    }

    this.previousState = newState
  }

  private animateCardReveal(cardIndex: number): void {
    // 初始状态：缩小、透明、在上方
    this.cardAnimations.set(cardIndex, {
      offsetX: 0,
      offsetY: -50,
      scale: 0.5,
      rotation: Math.PI,
      alpha: 0,
    })

    // 创建动画
    const animation = this.cardAnimations.get(cardIndex)!
    this.tweenEngine.create(animation, {
      offsetY: 0,
      scale: 1,
      rotation: 0,
      alpha: 1,
    }, {
      duration: 400,
      easing: 'easeOutBack',
    })
  }

  private animateChipsMovement(pot: number): void {
    // 筹码移动动画逻辑
  }

  getCardAnimation(index: number): CardAnimation | undefined {
    return this.cardAnimations.get(index)
  }

  update(): void {
    this.tweenEngine.update()
  }
}
```

### 3.6 缓动引擎

```typescript
// components/game/canvas/animations/TweenEngine.ts

type EasingFunction = (t: number) => number

const easings: Record<string, EasingFunction> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutBack: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

interface TweenOptions {
  duration: number
  easing?: keyof typeof easings
  onComplete?: () => void
}

export class Tween {
  private target: Record<string, number>
  private startValues: Record<string, number>
  private endValues: Record<string, number>
  private duration: number
  private easing: EasingFunction
  private startTime: number
  private onComplete?: () => void
  public isComplete = false

  constructor(
    target: Record<string, number>,
    endValues: Record<string, number>,
    options: TweenOptions
  ) {
    this.target = target
    this.endValues = endValues
    this.duration = options.duration
    this.easing = easings[options.easing || 'linear']
    this.onComplete = options.onComplete
    this.startTime = Date.now()

    // 记录起始值
    this.startValues = {}
    for (const key in endValues) {
      this.startValues[key] = target[key]
    }
  }

  update(): void {
    if (this.isComplete) return

    const elapsed = Date.now() - this.startTime
    const progress = Math.min(elapsed / this.duration, 1)
    const easedProgress = this.easing(progress)

    for (const key in this.endValues) {
      const start = this.startValues[key]
      const end = this.endValues[key]
      this.target[key] = start + (end - start) * easedProgress
    }

    if (progress >= 1) {
      this.isComplete = true
      this.onComplete?.()
    }
  }
}

export class TweenEngine {
  private tweens: Tween[] = []

  create(
    target: Record<string, number>,
    endValues: Record<string, number>,
    options: TweenOptions
  ): Tween {
    const tween = new Tween(target, endValues, options)
    this.tweens.push(tween)
    return tween
  }

  update(): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      this.tweens[i].update()
      if (this.tweens[i].isComplete) {
        this.tweens.splice(i, 1)
      }
    }
  }
}
```

---

## 4. 页面路由配置

### 4.1 app.config.ts

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
  // 云开发环境配置
  cloud: true,
})
```

### 4.2 游戏页面配置（横屏）

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

## 5. 状态管理设计

### 5.1 游戏状态 (useGameStore)

```typescript
// stores/useGameStore.ts
import { create } from 'zustand'
import type { GameState, GamePlayer, Card, GamePhase } from '@/types/game'

interface GameStoreState {
  // 游戏状态
  gameState: GameState | null
  isLoading: boolean
  error: string | null

  // 当前玩家信息
  myCards: Card[]
  mySeat: number | null
  myStatus: 'spectating' | 'waiting' | 'playing' | 'folded'

  // 操作相关
  canAction: boolean
  availableActions: string[]
  callAmount: number
  minRaise: number
  maxRaise: number

  // Actions
  setGameState: (state: GameState) => void
  setMyCards: (cards: Card[]) => void
  resetGame: () => void

  // 从数据库 Watch 更新
  handleGameUpdate: (data: any) => void
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  isLoading: false,
  error: null,
  myCards: [],
  mySeat: null,
  myStatus: 'spectating',
  canAction: false,
  availableActions: [],
  callAmount: 0,
  minRaise: 0,
  maxRaise: 0,

  setGameState: (gameState) => set({ gameState }),

  setMyCards: (myCards) => set({ myCards }),

  resetGame: () => set({
    gameState: null,
    myCards: [],
    myStatus: 'spectating',
    canAction: false,
  }),

  handleGameUpdate: (data) => {
    const { gameState, myCards, actionInfo } = data

    set({
      gameState,
      myCards: myCards || get().myCards,
      canAction: actionInfo?.canAction || false,
      availableActions: actionInfo?.availableActions || [],
      callAmount: actionInfo?.callAmount || 0,
      minRaise: actionInfo?.minRaise || 0,
      maxRaise: actionInfo?.maxRaise || 0,
    })
  },
}))
```

### 5.2 房间状态 (useRoomStore)

```typescript
// stores/useRoomStore.ts
import { create } from 'zustand'
import { roomService } from '@/services/room'
import type { Room, RoomPlayer } from '@/types/room'

interface RoomStoreState {
  rooms: Room[]
  currentRoom: Room | null
  players: RoomPlayer[]
  isLoading: boolean

  // Actions
  fetchRooms: (search?: string) => Promise<void>
  createRoom: (data: CreateRoomData) => Promise<Room>
  joinRoom: (roomId: string, buyIn: number) => Promise<void>
  leaveRoom: () => Promise<void>
  sitDown: (seatIndex: number) => Promise<void>
  standUp: () => Promise<void>

  // Watch 更新
  handleRoomUpdate: (room: Room) => void
  handlePlayersUpdate: (players: RoomPlayer[]) => void
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  players: [],
  isLoading: false,

  fetchRooms: async (search) => {
    set({ isLoading: true })
    try {
      const rooms = await roomService.list(search)
      set({ rooms })
    } finally {
      set({ isLoading: false })
    }
  },

  createRoom: async (data) => {
    const room = await roomService.create(data)
    set({ currentRoom: room })
    return room
  },

  joinRoom: async (roomId, buyIn) => {
    const result = await roomService.join(roomId, buyIn)
    set({ currentRoom: result.room, players: result.players })
  },

  leaveRoom: async () => {
    await roomService.leave()
    set({ currentRoom: null, players: [] })
  },

  sitDown: async (seatIndex) => {
    await roomService.sit(seatIndex)
  },

  standUp: async () => {
    await roomService.stand()
  },

  handleRoomUpdate: (room) => set({ currentRoom: room }),
  handlePlayersUpdate: (players) => set({ players }),
}))
```

---

## 6. 云函数调用服务

### 6.1 云开发初始化

```typescript
// services/cloud.ts
import Taro from '@tarojs/taro'

// 初始化云开发
export function initCloud() {
  if (!Taro.cloud) {
    console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    return
  }

  Taro.cloud.init({
    env: process.env.NODE_ENV === 'production'
      ? 'holdem-prod'
      : 'holdem-dev',
    traceUser: true,
  })
}

// 获取数据库实例
export function getDatabase() {
  return Taro.cloud.database()
}

// 调用云函数
export async function callFunction<T>(
  name: string,
  data: Record<string, any>
): Promise<T> {
  const result = await Taro.cloud.callFunction({
    name,
    data,
  })

  if (result.result?.error) {
    throw new Error(result.result.error.message)
  }

  return result.result as T
}
```

### 6.2 游戏服务

```typescript
// services/game.ts
import { callFunction, getDatabase } from './cloud'
import { useGameStore } from '@/stores/useGameStore'
import type { GameAction } from '@/types/game'

export const gameService = {
  // 开始游戏
  async start(roomId: string) {
    return callFunction<{ gameId: string }>('game', {
      action: 'start',
      roomId,
    })
  },

  // 执行游戏操作
  async performAction(roomId: string, action: GameAction, amount?: number) {
    return callFunction('game', {
      action: 'action',
      roomId,
      gameAction: action,
      amount,
    })
  },

  // 准备下一局
  async ready(roomId: string, isReady: boolean) {
    return callFunction('game', {
      action: 'ready',
      roomId,
      isReady,
    })
  },

  // 监听游戏状态（返回 watcher 用于取消监听）
  watchGame(gameId: string) {
    const db = getDatabase()

    return db.collection('games')
      .doc(gameId)
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs.length > 0) {
            useGameStore.getState().handleGameUpdate(snapshot.docs[0])
          }
        },
        onError: (err) => {
          console.error('game watch error:', err)
        },
      })
  },
}
```

---

## 7. 数据库监听 Hook

### 7.1 通用监听 Hook

```typescript
// hooks/useCloudWatch.ts
import { useEffect, useRef } from 'react'
import { getDatabase } from '@/services/cloud'

interface WatchOptions {
  collection: string
  docId?: string
  where?: Record<string, any>
  onChange: (data: any[]) => void
  onError?: (error: Error) => void
}

export function useCloudWatch(options: WatchOptions) {
  const watcherRef = useRef<any>(null)

  useEffect(() => {
    const db = getDatabase()
    let query = db.collection(options.collection)

    if (options.docId) {
      query = query.doc(options.docId)
    } else if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        query = query.where(key, '==', value)
      }
    }

    watcherRef.current = query.watch({
      onChange: (snapshot) => {
        options.onChange(snapshot.docs)
      },
      onError: (err) => {
        console.error('watch error:', err)
        options.onError?.(err)
      },
    })

    return () => {
      watcherRef.current?.close()
    }
  }, [options.collection, options.docId, JSON.stringify(options.where)])

  return watcherRef.current
}
```

### 7.2 游戏监听 Hook

```typescript
// hooks/useGameWatch.ts
import { useEffect } from 'react'
import { useGameStore } from '@/stores/useGameStore'
import { useCloudWatch } from './useCloudWatch'

export function useGameWatch(gameId: string | null) {
  const handleGameUpdate = useGameStore((s) => s.handleGameUpdate)

  useEffect(() => {
    if (!gameId) return

    const watcher = useCloudWatch({
      collection: 'games',
      docId: gameId,
      onChange: (docs) => {
        if (docs.length > 0) {
          handleGameUpdate(docs[0])
        }
      },
    })

    return () => watcher?.close()
  }, [gameId])
}
```

---

## 8. 游戏页面实现

### 8.1 游戏页面组件

```tsx
// pages/game/index.tsx
import { View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { GameCanvas } from '@/components/game/canvas/GameCanvas'
import { ActionBar } from '@/components/game/ui/ActionBar'
import { GameHeader } from '@/components/game/ui/GameHeader'
import { GameResult } from '@/components/game/ui/GameResult'
import { useGameStore } from '@/stores/useGameStore'
import { useRoomStore } from '@/stores/useRoomStore'
import { useGameWatch } from '@/hooks/useGameWatch'
import { gameService } from '@/services/game'
import './index.scss'

export default function GamePage() {
  const router = useRouter()
  const roomId = router.params.roomId

  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })
  const [showResult, setShowResult] = useState(false)

  const gameState = useGameStore((s) => s.gameState)
  const currentRoom = useRoomStore((s) => s.currentRoom)

  // 设置横屏
  useEffect(() => {
    Taro.setScreenOrientation({ orientation: 'landscape' })

    // 获取屏幕尺寸
    const info = Taro.getSystemInfoSync()
    setScreenSize({
      width: Math.max(info.windowWidth, info.windowHeight),
      height: Math.min(info.windowWidth, info.windowHeight),
    })

    return () => {
      Taro.setScreenOrientation({ orientation: 'portrait' })
    }
  }, [])

  // 监听游戏状态
  useGameWatch(gameState?._id || null)

  // 处理游戏操作
  const handleAction = async (action: string, amount?: number) => {
    if (!roomId) return
    await gameService.performAction(roomId, action as any, amount)
  }

  return (
    <View className="game-page">
      {/* Canvas 游戏画面 */}
      {screenSize.width > 0 && (
        <GameCanvas
          width={screenSize.width}
          height={screenSize.height}
        />
      )}

      {/* UI 层（覆盖在 Canvas 上） */}
      <GameHeader
        room={currentRoom}
        onLeave={() => Taro.navigateBack()}
      />

      <ActionBar
        onAction={handleAction}
      />

      {/* 结算弹窗 */}
      {showResult && (
        <GameResult
          onClose={() => setShowResult(false)}
          onNext={() => {/* 准备下一局 */}}
        />
      )}
    </View>
  )
}
```

### 8.2 游戏页面样式

```scss
// pages/game/index.scss
.game-page {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #0a1f15;
}

// Canvas 层
.game-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

// UI 层（在 Canvas 上方）
.game-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px;
}

.action-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
}
```

---

## 9. 样式设计

### 9.1 设计变量

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
$spacing-xs: 8px;
$spacing-sm: 16px;
$spacing-md: 24px;
$spacing-lg: 32px;
$spacing-xl: 48px;

// 圆角
$radius-sm: 8px;
$radius-md: 12px;
$radius-lg: 16px;
$radius-full: 9999px;

// 字体
$font-size-xs: 24px;    // 12px * 2 (Taro rpx)
$font-size-sm: 28px;
$font-size-md: 32px;
$font-size-lg: 36px;
$font-size-xl: 40px;
```

---

## 10. 性能优化

### 10.1 Canvas 优化

1. **离屏 Canvas**：将静态元素（牌桌背景）绑制到离屏 Canvas，减少重绘
2. **脏矩形更新**：只重绘变化的区域
3. **图片预加载**：游戏开始前加载所有卡牌图片
4. **对象池**：复用动画对象，减少 GC

### 10.2 包体积优化

1. **按需加载**：游戏页面使用分包
2. **图片压缩**：扑克牌图片使用 WebP 格式
3. **代码分割**：Canvas 渲染器按需引入

### 10.3 分包配置

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

---

## 11. 开发与调试

### 11.1 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（微信小程序）
pnpm dev:weapp

# 构建（微信小程序）
pnpm build:weapp

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

### 11.2 调试配置

```json
// project.config.json
{
  "appid": "your-appid",
  "projectname": "holdem",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "postcss": true,
    "minified": true
  },
  "cloudfunctionRoot": "cloudfunctions/"
}
```

---

## 12. 待办事项

- [ ] 创建 Taro 项目脚手架
- [ ] 实现 Canvas 渲染管理器
- [ ] 实现扑克牌渲染器
- [ ] 实现动画系统
- [ ] 实现登录流程
- [ ] 实现大厅页面
- [ ] 实现游戏房间
- [ ] 实现个人中心
- [ ] 云函数联调
- [ ] 横屏适配测试
- [ ] 真机调试
