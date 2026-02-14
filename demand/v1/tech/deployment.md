# 部署技术方案 - Zeabur 云平台

> 版本：v1.0
> 更新日期：2026-02-11

---

## 1. 部署架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        微信小程序客户端                          │
│                    (用户手机上的小程序)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS / WSS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Zeabur 云平台                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    holdem-server                         │   │
│  │                  (Fastify 后端服务)                       │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ REST API │  │WebSocket │  │   JWT    │              │   │
│  │  │ /api/*   │  │  /ws/*   │  │   认证   │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│                             │ Prisma                             │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL                            │   │
│  │                  (Zeabur 托管数据库)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      微信小程序平台                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  小程序代码包托管                         │   │
│  │              (上传审核后自动分发)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 服务清单

| 服务 | 平台 | 说明 |
|------|------|------|
| holdem-server | Zeabur | Fastify 后端服务 |
| PostgreSQL | Zeabur | 托管数据库 |
| 小程序代码 | 微信平台 | 客户端代码包 |

---

## 2. Zeabur 后端部署

### 2.1 项目配置

**zbpack.json**（根目录）：

```json
{
  "build_command": "pnpm build",
  "start_command": "pnpm --filter @holdem/server start",
  "output_dir": "apps/server/dist"
}
```

或使用 **zeabur.yaml**：

```yaml
build:
  type: nodejs
  command: pnpm install && pnpm build
start:
  command: node apps/server/dist/index.js
```

### 2.2 部署步骤

1. **创建项目**
   - 登录 [Zeabur 控制台](https://zeabur.com)
   - 点击 **Create Project**
   - 选择区域（建议选择离目标用户近的区域）

2. **添加后端服务**
   - 点击 **Add Service** → **Git**
   - 选择 GitHub 仓库
   - Zeabur 自动检测 Node.js 项目

3. **添加 PostgreSQL**
   - 点击 **Add Service** → **Marketplace**
   - 搜索 **PostgreSQL** 并添加
   - 复制连接字符串

4. **配置环境变量**
   - 在后端服务的 **Variables** 中添加：

```
DATABASE_URL=<PostgreSQL 连接字符串>
JWT_SECRET=<生成的随机密钥>
WX_APPID=<微信小程序 AppID>
WX_SECRET=<微信小程序 AppSecret>
CORS_ORIGIN=*
NODE_ENV=production
```

5. **绑定域名**
   - 点击 **Domains** → **Generate Domain**
   - 或绑定自定义域名
   - 记录域名用于小程序配置

### 2.3 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| DATABASE_URL | 是 | PostgreSQL 连接字符串 |
| JWT_SECRET | 是 | JWT 签名密钥（建议 32 位以上随机字符串） |
| WX_APPID | 是 | 微信小程序 AppID |
| WX_SECRET | 是 | 微信小程序 AppSecret |
| CORS_ORIGIN | 否 | 允许的跨域来源（默认 *） |
| PORT | 否 | 服务端口（Zeabur 自动分配） |
| NODE_ENV | 否 | 环境标识（production） |

### 2.4 数据库迁移

部署后需要执行数据库迁移：

**方案一：本地执行迁移**

```bash
# 设置生产环境数据库 URL
export DATABASE_URL="postgresql://..."

# 执行迁移
pnpm --filter @holdem/database prisma migrate deploy
```

**方案二：在部署时自动执行**

修改 `zbpack.json`：

```json
{
  "build_command": "pnpm build && pnpm --filter @holdem/database prisma migrate deploy",
  "start_command": "pnpm --filter @holdem/server start"
}
```

---

## 3. 微信小程序部署

### 3.1 前置准备

1. **注册微信小程序**
   - 访问 [微信公众平台](https://mp.weixin.qq.com)
   - 注册并完成认证

2. **获取 AppID 和 AppSecret**
   - 登录公众平台 → 开发管理 → 开发设置
   - 复制 AppID(wx5c05cc4785438416) 和 AppSecret(6b066b3b9156746d63e975680e8f74a1)

3. **配置服务器域名**
   - 开发管理 → 开发设置 → 服务器域名
   - 添加以下域名：

   | 类型 | 域名 |
   |------|------|
   | request 合法域名 | https://your-api.zeabur.app |
   | socket 合法域名 | wss://your-api.zeabur.app |

### 3.2 构建与上传

```bash
# 1. 构建小程序代码
pnpm --filter @holdem/miniapp build:weapp

# 2. 使用微信开发者工具上传
# - 打开微信开发者工具
# - 导入项目：apps/miniapp/dist
# - 填写 AppID
# - 点击「上传」
```

### 3.3 审核与发布

1. **提交审核**
   - 登录微信公众平台
   - 管理 → 版本管理 → 开发版本
   - 点击「提交审核」

2. **审核要点**
   - 确保小程序功能完整可用
   - 用户协议和隐私政策齐全
   - 不包含敏感内容
   - 无诱导分享行为

3. **发布上线**
   - 审核通过后，点击「发布」
   - 用户即可搜索使用

### 3.4 环境配置

```typescript
// apps/miniapp/src/constants/api.ts

// 根据环境切换 API 地址
const ENV = process.env.NODE_ENV

export const API_BASE_URL = ENV === 'production'
  ? 'https://holdem-api.zeabur.app'
  : 'http://localhost:3000'

export const WS_BASE_URL = ENV === 'production'
  ? 'wss://holdem-api.zeabur.app'
  : 'ws://localhost:3000'
```

---

## 4. CI/CD 自动化

### 4.1 GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Build
        run: pnpm build

      # Zeabur 会自动检测 main 分支推送并部署
      # 以下步骤为可选的构建验证
```

### 4.2 Zeabur 自动部署

Zeabur 默认支持自动部署：
1. 关联 GitHub 仓库后，每次 `main` 分支推送自动触发部署
2. 可在 Zeabur 控制台查看部署日志
3. 支持回滚到历史版本

---

## 5. 域名与 SSL

### 5.1 Zeabur 默认域名

- 自动提供 `*.zeabur.app` 域名
- 自动配置 SSL 证书
- 示例：`holdem-api.zeabur.app`

### 5.2 自定义域名

1. **添加域名**
   - 在 Zeabur 控制台点击 **Domains**
   - 添加自定义域名，如 `api.holdem.com`

2. **DNS 配置**
   - 在域名注册商处添加 CNAME 记录
   - 指向 Zeabur 提供的地址

3. **SSL 证书**
   - Zeabur 自动申请和续期 Let's Encrypt 证书
   - 无需手动配置

---

## 6. 监控与日志

### 6.1 Zeabur 内置监控

- **实时日志**：控制台直接查看
- **CPU/内存监控**：服务详情页面
- **请求统计**：内置分析

### 6.2 应用日志

```typescript
// 使用 Fastify 内置日志
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined
  }
})

// 请求日志
fastify.addHook('onRequest', async (request) => {
  request.log.info({ url: request.url, method: request.method })
})

// 错误日志
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  reply.status(500).send({ error: 'Internal Server Error' })
})
```

### 6.3 健康检查

```typescript
// 简单健康检查
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: Date.now() }
})

// 深度健康检查（包含数据库）
fastify.get('/health/ready', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'ready',
      database: 'connected',
      timestamp: Date.now()
    }
  } catch (error) {
    throw { statusCode: 503, message: 'Database unavailable' }
  }
})
```

---

## 7. 扩容与高可用

### 7.1 水平扩容

Zeabur 支持水平扩容：
- 控制台 → 服务 → **Scale** → 调整实例数量
- 自动负载均衡

### 7.2 WebSocket 注意事项

多实例部署时 WebSocket 需要考虑：

**方案一：Sticky Session**
- Zeabur 默认支持
- 同一用户的请求路由到同一实例

**方案二：Redis Pub/Sub（推荐）**

```typescript
// 添加 Redis 用于跨实例消息同步
import Redis from 'ioredis'

const pub = new Redis(process.env.REDIS_URL)
const sub = new Redis(process.env.REDIS_URL)

// 发布消息到其他实例
function broadcastToRoom(roomId: string, message: any) {
  pub.publish(`room:${roomId}`, JSON.stringify(message))
}

// 订阅其他实例的消息
sub.psubscribe('room:*', (err) => {
  if (err) console.error(err)
})

sub.on('pmessage', (pattern, channel, message) => {
  const roomId = channel.split(':')[1]
  const data = JSON.parse(message)
  // 转发给本地连接的用户
  localBroadcast(roomId, data)
})
```

---

## 8. 备份与恢复

### 8.1 数据库备份

**Zeabur 自动备份**：
- 每日自动备份
- 保留 7 天
- 一键恢复

**手动备份**：

```bash
# 导出数据
pg_dump $DATABASE_URL > backup.sql

# 恢复数据
psql $DATABASE_URL < backup.sql
```

### 8.2 灾难恢复

1. **数据库恢复**
   - 从 Zeabur 备份恢复
   - 或使用 pg_dump 备份文件

2. **服务恢复**
   - Zeabur 支持一键回滚到历史版本
   - Git 仓库包含完整代码

---

## 9. 成本估算

### 9.1 Zeabur 定价

| 资源 | 免费额度 | 超出部分 |
|------|----------|----------|
| 计算资源 | $5/月 | 按需计费 |
| 数据库 | 1GB 存储 | $0.1/GB/月 |
| 带宽 | 100GB | $0.1/GB |

### 9.2 预估月成本

| 项目 | 预估成本 |
|------|----------|
| 后端服务（基础配置） | $5-10 |
| PostgreSQL（5GB） | $0.5 |
| 域名 | $0（使用免费域名）|
| **总计** | **~$10/月** |

---

## 10. 部署检查清单

### 10.1 上线前检查

- [ ] 环境变量配置正确
- [ ] 数据库迁移已执行
- [ ] 域名已配置并验证
- [ ] SSL 证书有效
- [ ] 健康检查端点可访问
- [ ] 微信服务器域名已配置
- [ ] 小程序已提交审核

### 10.2 上线后验证

- [ ] API 接口正常响应
- [ ] WebSocket 连接正常
- [ ] 微信登录流程正常
- [ ] 游戏核心流程可玩
- [ ] 监控告警正常

---

## 11. 常见问题

### Q1: 部署后数据库连接失败

**原因**：DATABASE_URL 未正确配置

**解决**：
1. 检查环境变量是否设置
2. 确保使用 Zeabur 提供的内部连接字符串
3. 检查 PostgreSQL 服务是否正常运行

### Q2: WebSocket 连接断开

**原因**：Zeabur 默认超时时间

**解决**：
1. 实现客户端心跳机制（30秒）
2. 配置 WebSocket keepalive

### Q3: 小程序无法访问后端

**原因**：域名未在微信后台配置

**解决**：
1. 在微信公众平台添加服务器域名
2. 确保使用 HTTPS
3. 域名需要备案（大陆服务器）

### Q4: 微信登录失败

**原因**：AppSecret 配置错误

**解决**：
1. 检查 WX_APPID 和 WX_SECRET 是否正确
2. 确保环境变量已重新部署生效
3. 检查微信接口调用日志

---

## 12. 待办事项

- [ ] 配置 Zeabur 项目
- [ ] 添加 PostgreSQL 服务
- [ ] 配置环境变量
- [ ] 执行数据库迁移
- [ ] 绑定自定义域名
- [ ] 注册微信小程序
- [ ] 配置服务器域名
- [ ] 提交小程序审核
- [ ] 设置监控告警
- [ ] 制定备份策略
