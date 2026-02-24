# 部署技术方案 - 微信云开发

> 版本：v1.1
> 更新日期：2026-02-24

---

## 1. 部署架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        开发者本地                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   微信开发者工具                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ 小程序代码    │  │   云函数     │  │  云数据库    │  │   │
│  │  │   编辑/预览   │  │  编辑/上传   │  │  管理/调试   │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ 上传/部署
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       微信云开发平台                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      云开发环境                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   云函数      │  │   云数据库    │  │   云存储     │  │   │
│  │  │  auth/user/  │  │  users/rooms │  │  images/     │  │   │
│  │  │  room/game   │  │  /games/...  │  │  avatars/    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ 服务调用
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        用户手机                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    微信小程序                            │   │
│  │                   德州扑克游戏                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 部署组件

| 组件 | 部署位置 | 说明 |
|------|----------|------|
| 小程序前端 | 微信服务器 | 通过开发者工具上传 |
| 云函数 | 云开发环境 | 通过开发者工具/CLI 上传 |
| 云数据库 | 云开发环境 | 自动托管 |
| 云存储 | 云开发环境 | 自动托管 |

---

## 2. 环境配置

### 2.1 创建云开发环境

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入 **开发管理** → **云开发**
3. 开通云开发，创建环境：

| 环境 | 环境 ID | 用途 |
|------|---------|------|
| 开发环境 | holdem-dev | 开发测试 |
| 生产环境 | holdem-prod | 正式使用 |

### 2.2 环境配置

```typescript
// miniprogram/src/services/cloud.ts
import Taro from '@tarojs/taro'

export function initCloud() {
  Taro.cloud.init({
    // 根据构建环境选择云环境
    env: process.env.NODE_ENV === 'production'
      ? 'holdem-prod'    // 生产环境 ID
      : 'holdem-dev',    // 开发环境 ID
    traceUser: true,
  })
}
```

### 2.3 project.config.json

```json
{
  "appid": "wx5c05cc4785438416",
  "projectname": "holdem",
  "description": "德州扑克小程序",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "postcss": true,
    "minified": true,
    "newFeature": true
  },
  "cloudfunctionTemplateRoot": "cloudfunctionTemplate/",
  "condition": {}
}
```

---

## 3. 云函数部署

### 3.1 云函数目录结构

```
cloudfunctions/
├── auth/
│   ├── index.ts
│   ├── handlers/
│   ├── package.json
│   └── tsconfig.json
├── user/
│   └── ...
├── room/
│   └── ...
├── game/
│   └── ...
└── shared/              # 共享代码（不单独部署）
    └── ...
```

### 3.2 云函数 package.json

```json
{
  "name": "auth",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0"
  },
  "scripts": {
    "build": "tsc"
  }
}
```

### 3.3 云函数 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./",
    "rootDir": "./",
    "declaration": false
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 3.4 部署云函数

**方式一：微信开发者工具**

1. 打开微信开发者工具
2. 右键点击云函数目录（如 `auth`）
3. 选择 **上传并部署：云端安装依赖**

**方式二：云开发 CLI**

```bash
# 安装 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署单个云函数
tcb fn deploy auth --envId holdem-dev

# 部署所有云函数
tcb fn deploy --envId holdem-dev
```

### 3.5 云函数配置

在云开发控制台配置云函数：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| 超时时间 | 10 秒 | 游戏操作需要时间 |
| 内存 | 256 MB | 默认即可 |
| 环境变量 | - | 如需可配置 |

---

## 4. 云数据库部署

### 4.1 创建集合

在微信开发者工具或云开发控制台创建集合：

```
集合列表:
├── users
├── user_statistics
├── rooms
├── room_players
├── games
├── player_cards
└── game_history
```

### 4.2 创建索引

在云开发控制台 → 数据库 → 索引管理：

**users 集合**:
```
{ "openid": 1 }  // 唯一索引
```

**rooms 集合**:
```
{ "code": 1 }    // 唯一索引
{ "status": 1 }
{ "createdAt": -1 }
```

**room_players 集合**:
```
{ "roomId": 1, "userId": 1 }     // 唯一索引
{ "roomId": 1, "seatIndex": 1 }  // 唯一索引（部分：seatIndex 不为 null）
{ "userId": 1 }
```

**games 集合**:
```
{ "roomId": 1 }
{ "roomId": 1, "createdAt": -1 }
```

**game_history 集合**:
```
{ "userId": 1, "playedAt": -1 }
{ "openid": 1 }
```

### 4.3 配置安全规则

在云开发控制台 → 数据库 → 安全规则：

```json
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

---

## 5. 云存储部署

### 5.1 上传游戏资源

将游戏资源上传到云存储：

```
cloud://holdem-dev.xxxx/
├── images/
│   ├── cards/           # 扑克牌图片
│   │   ├── 2c.png
│   │   ├── 2d.png
│   │   ├── ...
│   │   └── back.png
│   ├── chips/           # 筹码图片
│   │   ├── chip-red.png
│   │   ├── chip-blue.png
│   │   └── chip-green.png
│   ├── table/           # 牌桌背景
│   │   └── felt.png
│   └── avatars/         # 默认头像
│       └── default.png
└── icons/               # 图标
    ├── lobby.png
    └── profile.png
```

### 5.2 上传方式

**方式一：云开发控制台**

1. 进入云开发控制台 → 存储
2. 新建文件夹
3. 上传文件

**方式二：CLI 批量上传**

```bash
# 上传整个目录
tcb storage upload ./assets/images cloud://images --envId holdem-dev
```

### 5.3 获取资源 URL

```typescript
// 方式一：使用 fileID
const fileID = 'cloud://holdem-dev.xxxx/images/cards/As.png'

// 方式二：获取临时链接
const result = await Taro.cloud.getTempFileURL({
  fileList: [fileID]
})
const url = result.fileList[0].tempFileURL
```

---

## 6. 小程序部署

### 6.1 构建小程序

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev:weapp

# 生产构建
pnpm build:weapp
```

### 6.2 上传代码

1. 打开微信开发者工具
2. 导入项目 `miniprogram/dist`
3. 点击 **上传** 按钮
4. 填写版本号和描述

### 6.3 体验版/开发版（朋友局）

由于不需要正式上架，使用**开发版/体验版**即可：

1. **添加体验者**
   - 登录微信公众平台
   - 管理 → 成员管理 → 添加体验者
   - 输入朋友的微信号
   - 最多可添加 **100** 名体验者

2. **生成体验版二维码**
   - 版本管理 → 开发版本
   - 选择一个版本，设为体验版
   - 生成二维码分享给朋友

3. **朋友扫码使用**
   - 朋友扫描体验版二维码
   - 同意授权后即可使用

---

## 7. 多环境管理

### 7.1 环境区分

| 环境 | 云环境 ID | 用途 | 数据 |
|------|-----------|------|------|
| 开发 | holdem-dev | 本地开发调试 | 测试数据 |
| 生产 | holdem-prod | 朋友实际使用 | 真实数据 |

### 7.2 环境切换

```typescript
// 根据编译时环境变量切换
const ENV_ID = process.env.TARO_ENV === 'production'
  ? 'holdem-prod'
  : 'holdem-dev'

Taro.cloud.init({ env: ENV_ID })
```

### 7.3 构建命令

```json
// package.json
{
  "scripts": {
    "dev:weapp": "taro build --type weapp --watch",
    "build:weapp": "cross-env NODE_ENV=production taro build --type weapp"
  }
}
```

---

## 8. 持续集成（可选）

### 8.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Cloud Functions

on:
  push:
    branches: [main]
    paths:
      - 'cloudfunctions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install CLI
        run: npm install -g @cloudbase/cli

      - name: Deploy Cloud Functions
        env:
          TCB_SECRET_ID: ${{ secrets.TCB_SECRET_ID }}
          TCB_SECRET_KEY: ${{ secrets.TCB_SECRET_KEY }}
        run: |
          tcb login --apiKeyId $TCB_SECRET_ID --apiKey $TCB_SECRET_KEY
          tcb fn deploy --envId holdem-prod
```

### 8.2 本地脚本

```bash
#!/bin/bash
# deploy.sh

# 构建云函数 TypeScript
for dir in cloudfunctions/*/; do
  if [ -f "$dir/tsconfig.json" ]; then
    echo "Building $dir..."
    cd "$dir"
    npm run build
    cd ../..
  fi
done

# 部署
tcb fn deploy --envId holdem-prod

echo "Deploy completed!"
```

---

## 9. 监控与日志

### 9.1 云开发控制台监控

- **云函数监控**：调用次数、错误率、耗时
- **数据库监控**：读写次数、容量
- **存储监控**：流量、容量

### 9.2 云函数日志

```typescript
// 云函数中记录日志
export async function main(event, context) {
  console.log('收到请求:', JSON.stringify(event))

  try {
    const result = await doSomething()
    console.log('处理成功:', result)
    return { data: result }
  } catch (error) {
    console.error('处理失败:', error)
    return { error: { message: error.message } }
  }
}
```

查看日志：
- 云开发控制台 → 云函数 → 日志

### 9.3 错误告警

云开发控制台支持配置告警：
- 云函数错误率超过阈值
- 数据库容量超过阈值

---

## 10. 费用说明

### 10.1 云开发免费额度

| 资源 | 免费额度/月 | 说明 |
|------|-------------|------|
| 云函数调用 | 100 万次 | 朋友局绰绰有余 |
| 云函数资源使用量 | 10 万 GBs | |
| 云数据库读取 | 5 万次/天 | |
| 云数据库写入 | 3 万次/天 | |
| 数据库存储 | 2 GB | |
| 云存储容量 | 5 GB | |
| 云存储下载 | 5 GB/月 | |
| CDN 流量 | 5 GB/月 | |

### 10.2 朋友局成本估算

假设 10 人朋友局，每天玩 2 小时，每小时 10 局：

| 资源 | 估算用量/月 | 免费额度 | 是否超出 |
|------|-------------|----------|----------|
| 云函数调用 | ~18000 次 | 100 万次 | ❌ |
| 数据库读取 | ~3000 次/天 | 5 万次/天 | ❌ |
| 数据库写入 | ~1000 次/天 | 3 万次/天 | ❌ |
| 数据库存储 | ~50 MB | 2 GB | ❌ |

**结论：朋友局场景完全在免费额度内，零成本。**

---

## 11. 部署检查清单

### 11.1 首次部署

- [ ] 注册微信小程序账号
- [ ] 开通云开发
- [ ] 创建云开发环境（dev/prod）
- [ ] 创建数据库集合
- [ ] 配置数据库索引
- [ ] 配置数据库安全规则
- [ ] 上传云存储资源
- [ ] 部署所有云函数
- [ ] 构建并上传小程序
- [ ] 添加体验者
- [ ] 生成体验版二维码

### 11.2 更新部署

- [ ] 更新云函数（如有改动）
- [ ] 更新云存储资源（如有改动）
- [ ] 构建并上传新版本小程序
- [ ] 设置新版本为体验版

### 11.3 验证清单

- [ ] 登录功能正常
- [ ] 创建房间正常
- [ ] 加入房间正常
- [ ] 游戏流程正常
- [ ] 实时同步正常
- [ ] 签到功能正常
- [ ] 历史记录正常

---

## 12. 常见问题

### Q1: 云函数部署失败

**可能原因**：
1. 依赖安装失败
2. TypeScript 编译错误
3. 云环境配额不足

**解决方案**：
1. 检查 `package.json` 依赖版本
2. 本地运行 `npm run build` 验证编译
3. 检查云开发控制台配额

### Q2: 数据库 Watch 不生效

**可能原因**：
1. 安全规则限制
2. 监听字段不正确
3. 连接数超限

**解决方案**：
1. 检查安全规则是否允许读取
2. 确认监听的 collection 和 doc ID
3. 检查是否有未关闭的 watcher

### Q3: 云存储图片加载慢

**可能原因**：
1. 图片过大
2. 未使用 CDN

**解决方案**：
1. 压缩图片（WebP 格式）
2. 云存储默认启用 CDN

### Q4: 体验者无法使用

**可能原因**：
1. 未添加为体验者
2. 体验版未设置
3. 小程序审核设置

**解决方案**：
1. 在成员管理中添加体验者
2. 设置某个版本为体验版
3. 确认体验者微信号正确

---

## 13. 待办事项

- [ ] 注册/配置微信小程序
- [ ] 开通云开发
- [ ] 创建开发/生产环境
- [ ] 部署云函数
- [ ] 配置数据库
- [ ] 上传云存储资源
- [ ] 添加朋友为体验者
- [ ] 生成体验版二维码
- [ ] 验证所有功能
- [ ] 文档完善
