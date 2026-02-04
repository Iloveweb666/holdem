# 部署指南

## 方案一：Zeabur（推荐，最简单）

Zeabur 是国内友好的部署平台，中文界面，支持自定义域名。

### 步骤

1. **注册账号**
   - 访问 https://zeabur.com
   - 使用 GitHub 登录

2. **创建项目**
   - 点击 "New Project"
   - 选择区域（推荐：东京/新加坡，国内访问快）

3. **部署后端服务**
   - 点击 "Add Service" → "Git"
   - 选择你的 GitHub 仓库
   - **Root Directory**: `apps/server`
   - 等待构建完成
   - 记下生成的域名（如 `holdem-server-xxx.zeabur.app`）

4. **部署前端服务**
   - 点击 "Add Service" → "Git"
   - 选择同一仓库
   - **Root Directory**: `apps/web`
   - 添加环境变量：
     ```
     VITE_API_URL=https://你的后端域名
     ```
   - 等待构建完成

5. **绑定自定义域名**
   - 在服务设置中点击 "Domain"
   - 添加你的域名
   - 按提示配置 DNS CNAME 记录

### 费用
- 免费额度：每月 $5 免费额度
- 超出后按用量计费

---

## 方案二：Railway

Railway 是国际流行的部署平台，自动 HTTPS。

### 步骤

1. **注册账号**
   - 访问 https://railway.app
   - 使用 GitHub 登录

2. **创建项目**
   ```bash
   # 安装 Railway CLI（可选）
   npm install -g @railway/cli
   railway login
   ```

3. **从 GitHub 部署**
   - 点击 "New Project" → "Deploy from GitHub repo"
   - 选择仓库

4. **配置后端服务**
   - 点击 "Add Service" → 选择同一仓库
   - Settings → Root Directory: `apps/server`
   - Variables 添加：
     ```
     PORT=3000
     CORS_ORIGIN=https://你的前端域名
     ```

5. **配置前端服务**
   - 点击 "Add Service" → 选择同一仓库
   - Settings → Root Directory: `apps/web`
   - Variables 添加：
     ```
     VITE_API_URL=https://你的后端域名
     ```

6. **生成域名**
   - 每个服务点击 Settings → Generate Domain
   - 或绑定自定义域名

### 费用
- 免费试用：$5 初始额度
- Hobby Plan：$5/月

---

## 方案三：Docker + 云服务器

完全控制，适合生产环境。

### 前置要求
- 一台云服务器（阿里云/腾讯云 ECS，推荐 2核4G）
- 已安装 Docker 和 Docker Compose
- 域名已解析到服务器 IP

### 步骤

1. **服务器准备**
   ```bash
   # 安装 Docker（Ubuntu/Debian）
   curl -fsSL https://get.docker.com | sh

   # 安装 Docker Compose
   sudo apt install docker-compose-plugin

   # 启动 Docker
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

2. **上传代码**
   ```bash
   # 在服务器上克隆代码
   git clone https://github.com/你的用户名/holdem.git
   cd holdem
   ```

3. **配置环境变量**
   ```bash
   # 编辑 docker-compose 环境变量
   vi docker/docker-compose.yml

   # 修改 CORS_ORIGIN 为你的域名
   # CORS_ORIGIN=https://your-domain.com
   ```

4. **构建并启动**
   ```bash
   # 构建镜像
   docker compose -f docker/docker-compose.yml build

   # 启动服务
   docker compose -f docker/docker-compose.yml up -d

   # 查看日志
   docker compose -f docker/docker-compose.yml logs -f
   ```

5. **配置 Nginx（可选，用于 HTTPS）**
   ```bash
   # 安装 Certbot 获取 SSL 证书
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

6. **访问测试**
   - 前端：http://your-server-ip (或 https://your-domain.com)
   - 后端健康检查：http://your-server-ip:3000/health

### 费用
- 阿里云 ECS 2核4G：约 ¥50-100/月
- 域名：约 ¥50-100/年
- SSL 证书：Let's Encrypt 免费

---

## 环境变量配置

### 前端 (apps/web)
| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_URL` | 后端 API 地址 | `https://api.example.com` |

### 后端 (apps/server)
| 变量 | 说明 | 示例 |
|------|------|------|
| `PORT` | 监听端口 | `3000` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `CORS_ORIGIN` | 允许的前端域名 | `https://example.com` |
| `NODE_ENV` | 环境 | `production` |

---

## 域名配置

### DNS 记录示例
```
# A 记录（直接指向服务器）
@     A      123.45.67.89

# CNAME 记录（指向平台域名）
www   CNAME  holdem-web-xxx.zeabur.app
api   CNAME  holdem-server-xxx.zeabur.app
```

### 推荐域名方案
- 前端：`www.example.com` 或 `example.com`
- 后端：`api.example.com`

---

## 常见问题

### Q: CORS 错误怎么解决？
确保后端的 `CORS_ORIGIN` 环境变量设置为前端的完整域名（包含协议）。

### Q: WebSocket 连接失败？
1. 确保 nginx 配置了 WebSocket 代理（参考 `docker/nginx/nginx.conf`）
2. 检查防火墙是否开放了相应端口

### Q: 构建失败？
1. 检查 Node.js 版本是否 >= 22
2. 检查 pnpm 版本是否 >= 9
3. 查看构建日志定位具体错误
