# 部署指南

本项目使用自定义 Dockerfile，支持 Zeabur、Railway 等平台一键部署。

## Zeabur 部署（推荐）

Zeabur 是国内友好的部署平台，中文界面，自动 HTTPS。

### 部署步骤

#### 1. 准备工作

- 访问 https://zeabur.com 并使用 GitHub 登录
- 点击 **New Project** 创建项目
- 选择区域（推荐：东京/新加坡，国内访问快）

#### 2. 部署 PostgreSQL 数据库

1. 点击 **Add Service** → **Marketplace** → **PostgreSQL**
2. 等待数据库创建完成
3. 点击数据库服务，复制 **Connection String**（形如 `postgresql://user:pass@host:5432/db`）

#### 3. 部署后端服务

1. 点击 **Add Service** → **Git** → 选择 `holdem` 仓库
2. **Root Directory**: 留空（从根目录部署）
3. 等待构建完成
4. 点击 **Variables** 添加环境变量：
   ```
   APP_TYPE=server
   PORT=3000
   CORS_ORIGIN=*
   DATABASE_URL=<粘贴数据库连接字符串>
   JWT_SECRET=<随机生成的密钥，如 openssl rand -base64 32>
   ```
5. 点击 **Networking** → **Generate Domain** 生成域名
6. 记下后端域名（如 `holdem-xxx.zeabur.app`）

#### 4. 部署前端服务

1. 点击 **Add Service** → **Git** → 选择同一仓库
2. **Root Directory**: 留空
3. 等待构建完成
4. 点击 **Variables** 添加环境变量：
   ```
   APP_TYPE=web
   VITE_API_URL=https://你的后端域名
   ```
   > 例如：`VITE_API_URL=https://holdem-xxx.zeabur.app`
5. 点击 **Networking** → **Generate Domain** 生成域名

#### 5. 更新后端 CORS（重要）

部署前端后，回到后端服务，更新 `CORS_ORIGIN` 为前端域名：

```
CORS_ORIGIN=https://你的前端域名
```

### 费用

- 免费额度：每月 $5
- PostgreSQL 数据库也计入用量
- 超出按用量计费

---

## 访问服务

### 前端访问

部署完成后，通过 Zeabur 生成的域名访问前端：

```
https://你的前端域名
```

页面功能：

- `/` - 游戏大厅，查看房间列表
- `/game` - 游戏房间，进行德州扑克游戏
- `/profile` - 个人资料页面

### 后端 API

后端提供 REST API 和 WebSocket 服务：

```
# 健康检查
GET https://你的后端域名/health

# ========== 认证相关 ==========

# 用户注册
POST https://你的后端域名/api/auth/register
Body: { "email": "user@example.com", "password": "123456", "name": "用户名" }

# 用户登录
POST https://你的后端域名/api/auth/login
Body: { "email": "user@example.com", "password": "123456" }

# 获取当前用户（需要 Token）
GET https://你的后端域名/api/auth/me
Header: Authorization: Bearer <token>

# ========== 用户相关 ==========

# 获取用户信息
GET https://你的后端域名/api/users/:id

# 获取用户统计
GET https://你的后端域名/api/users/:id/stats

# 获取用户对局历史
GET https://你的后端域名/api/users/:id/games

# ========== 房间相关 ==========

# 房间列表
GET https://你的后端域名/api/rooms

# 房间详情
GET https://你的后端域名/api/rooms/:id

# 创建房间（需要 Token）
POST https://你的后端域名/api/rooms
Header: Authorization: Bearer <token>
Body: { "name": "房间名", "smallBlind": 10, "bigBlind": 20 }

# 加入房间（需要 Token）
POST https://你的后端域名/api/rooms/:id/join
Header: Authorization: Bearer <token>
Body: { "buyIn": 1000 }

# 离开房间（需要 Token）
POST https://你的后端域名/api/rooms/:id/leave

# ========== 游戏相关 ==========

# 获取游戏状态
GET https://你的后端域名/api/game/:roomId/state

# 开始游戏（需要 Token）
POST https://你的后端域名/api/game/:roomId/start

# 执行动作（需要 Token）
POST https://你的后端域名/api/game/:roomId/action
Body: { "actionType": "CALL", "amount": 20 }

# WebSocket 连接
WS wss://你的后端域名/ws/game/:roomId?playerId=xxx
```

### 验证部署

1. 访问后端健康检查：`https://后端域名/health`
   - 应返回：`{"status":"ok","timestamp":...}`

2. 测试用户注册：
   ```bash
   curl -X POST https://后端域名/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"123456","name":"测试用户"}'
   ```
   - 应返回用户信息和 JWT token

3. 访问前端首页：`https://前端域名`
   - 应看到德州扑克大厅界面

---

## 环境变量说明

### 前端 (APP_TYPE=web)

| 变量           | 必填 | 说明          | 示例                      |
| -------------- | ---- | ------------- | ------------------------- |
| `APP_TYPE`     | 是   | 服务类型      | `web`                     |
| `VITE_API_URL` | 是   | 后端 API 地址 | `https://api.example.com` |

### 后端 (APP_TYPE=server)

| 变量           | 必填 | 说明                     | 示例                                         |
| -------------- | ---- | ------------------------ | -------------------------------------------- |
| `APP_TYPE`     | 是   | 服务类型                 | `server`                                     |
| `PORT`         | 否   | 监听端口，默认 3000      | `3000`                                       |
| `CORS_ORIGIN`  | 是   | 允许的前端域名           | `https://example.com`                        |
| `DATABASE_URL` | 是   | PostgreSQL 数据库连接串  | `postgresql://user:pass@host:5432/holdem`    |
| `JWT_SECRET`   | 是   | JWT 签名密钥（生产环境必须修改） | `your-super-secret-key`                |

---

## 绑定自定义域名

### Zeabur 配置

1. 在服务页面点击 **Networking**
2. 点击 **Custom Domain**
3. 输入你的域名（如 `poker.example.com`）
4. 按提示在域名服务商配置 DNS

### DNS 配置示例

```
# CNAME 记录
poker    CNAME  holdem-web-xxx.zeabur.app
api      CNAME  holdem-server-xxx.zeabur.app
```

---

## Docker 本地部署

如果需要在自己的服务器部署：

### 1. 启动 PostgreSQL

```bash
docker run -d \
  --name holdem-db \
  -e POSTGRES_USER=holdem \
  -e POSTGRES_PASSWORD=holdem123 \
  -e POSTGRES_DB=holdem \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. 构建并启动服务

```bash
# 克隆代码
git clone https://github.com/Iloveweb666/holdem.git
cd holdem

# 构建镜像
docker build -t holdem .

# 启动后端
docker run -d \
  --name holdem-server \
  -e APP_TYPE=server \
  -e PORT=3000 \
  -e DATABASE_URL=postgresql://holdem:holdem123@host.docker.internal:5432/holdem \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ORIGIN=http://localhost \
  -p 3000:3000 \
  holdem

# 启动前端
docker run -d \
  --name holdem-web \
  -e APP_TYPE=web \
  -e VITE_API_URL=http://localhost:3000 \
  -p 80:3000 \
  holdem
```

### 3. 运行数据库迁移

```bash
# 进入后端容器执行迁移
docker exec -it holdem-server sh
cd /app/packages/database
npx prisma migrate deploy
```

访问地址：

- 前端：http://localhost
- 后端：http://localhost:3000

---

## 常见问题

### Q: 页面白屏或 API 请求失败？

检查前端的 `VITE_API_URL` 是否正确设置为后端域名。

### Q: CORS 错误？

确保后端的 `CORS_ORIGIN` 设置为前端的完整域名（包含 `https://`）。

### Q: 构建失败？

1. 确保从**根目录**部署（Root Directory 留空）
2. 确保设置了 `APP_TYPE` 环境变量
3. 查看构建日志定位具体错误

### Q: WebSocket 连接失败？

Zeabur 自动支持 WebSocket，确保使用 `wss://` 协议。

### Q: 数据库连接失败？

1. 检查 `DATABASE_URL` 格式是否正确
2. 确保数据库服务已启动
3. 如果是 Zeabur，确保复制了完整的连接字符串

### Q: JWT 认证失败？

1. 确保设置了 `JWT_SECRET` 环境变量
2. 生产环境必须使用强密钥
3. Token 过期时间为 7 天，过期后需重新登录
