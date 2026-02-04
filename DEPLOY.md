# 部署指南

本项目使用自定义 Dockerfile，支持 Zeabur、Railway 等平台一键部署。

## Zeabur 部署（推荐）

Zeabur 是国内友好的部署平台，中文界面，自动 HTTPS。

### 部署步骤

#### 1. 准备工作
- 访问 https://zeabur.com 并使用 GitHub 登录
- 点击 **New Project** 创建项目
- 选择区域（推荐：东京/新加坡，国内访问快）

#### 2. 部署后端服务
1. 点击 **Add Service** → **Git** → 选择 `holdem` 仓库
2. **Root Directory**: 留空（从根目录部署）
3. 等待构建完成
4. 点击 **Variables** 添加环境变量：
   ```
   APP_TYPE=server
   PORT=3000
   CORS_ORIGIN=*
   ```
5. 点击 **Networking** → **Generate Domain** 生成域名
6. 记下后端域名（如 `holdem-xxx.zeabur.app`）

#### 3. 部署前端服务
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

#### 4. 更新后端 CORS（重要）
部署前端后，回到后端服务，更新 `CORS_ORIGIN` 为前端域名：
```
CORS_ORIGIN=https://你的前端域名
```

### 费用
- 免费额度：每月 $5
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

# 房间列表
GET https://你的后端域名/api/rooms

# 房间详情
GET https://你的后端域名/api/rooms/:id

# 创建房间
POST https://你的后端域名/api/rooms

# 加入房间
POST https://你的后端域名/api/rooms/:id/join

# WebSocket 连接
WS wss://你的后端域名/ws/game/:roomId?playerId=xxx
```

### 验证部署
1. 访问后端健康检查：`https://后端域名/health`
   - 应返回：`{"status":"ok","timestamp":...}`

2. 访问前端首页：`https://前端域名`
   - 应看到德州扑克大厅界面

---

## 环境变量说明

### 前端 (APP_TYPE=web)
| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `APP_TYPE` | 是 | 服务类型 | `web` |
| `VITE_API_URL` | 是 | 后端 API 地址 | `https://api.example.com` |

### 后端 (APP_TYPE=server)
| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `APP_TYPE` | 是 | 服务类型 | `server` |
| `PORT` | 否 | 监听端口，默认 3000 | `3000` |
| `CORS_ORIGIN` | 是 | 允许的前端域名 | `https://example.com` |

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

```bash
# 克隆代码
git clone https://github.com/Iloveweb666/holdem.git
cd holdem

# 使用 docker-compose
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d

# 查看日志
docker compose -f docker/docker-compose.yml logs -f
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
