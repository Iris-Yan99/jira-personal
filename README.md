# Plano

基于 AI 的个人任务管理 Web 应用。技术栈：React + Vite + Tailwind（前端）、Node.js + Express（后端）、SQLite（数据库）、Ollama（本地 AI）。

---

## 🪟 Windows 快速安裝教程（給非開發者）

### 第一步：安裝 Docker Desktop
1. 打開瀏覽器，訪問 https://www.docker.com/products/docker-desktop/
2. 點擊 "Download for Windows" 下載安裝包
3. 雙擊安裝，一路點「Next」
4. 安裝完成後重啟電腦
5. 重啟後打開 Docker Desktop，等待它完全啟動（任務欄出現鯨魚圖標）

### 第二步：下載 Plano
1. 打開瀏覽器，訪問 https://github.com/Iris-Yan99/jira-personal
2. 點擊綠色 "Code" 按鈕 → "Download ZIP"
3. 解壓到桌面

### 第三步：啟動應用
1. 打開「開始菜單」搜索 "PowerShell"，右鍵「以管理員身份運行」
2. 輸入以下指令（複製貼上）：
   ```
   cd Desktop\jira-personal
   docker compose up -d --build
   ```
3. 等待約 5-10 分鐘（首次需要下載 AI 模型，約 5GB）
4. 看到 "Started" 後，打開瀏覽器訪問 http://localhost:3001

### 之後每次使用（不需要 PowerShell）

第一次設定完成後，以後只需要：
1. 打開 Docker Desktop
2. 點左側選單 "Containers"
3. 找到 `jira-personal`，點 ▶ **Start**
4. 打開瀏覽器訪問 http://localhost:3001

關閉時點 ■ **Stop** 即可，完全不需要命令列。

### 常見問題
- **Docker 沒啟動？** 確認任務欄有鯨魚圖標，且狀態是 "Running"
- **頁面打不開？** 等多幾分鐘，AI 模型還在下載中
- **想關閉應用？** 在 Docker Desktop 點 ■ Stop，或在 PowerShell 輸入 `docker compose down`
- **Docker 報虛擬化錯誤？** 需要在 BIOS 開啟 CPU 虛擬化功能（Intel VT-x / AMD-V）。重啟電腦時按 F2 或 Del 進入 BIOS，找到 Virtualization 選項並開啟，保存後重啟即可

---

## 🍎 macOS 快速安裝教程（給非開發者）

### 第一步：安裝 Docker Desktop
1. 打開瀏覽器，訪問 https://www.docker.com/products/docker-desktop/
2. 根據你的 Mac 型號選擇版本下載：
   - M1/M2/M3/M4 晶片（Apple Silicon）→ 選 "Mac with Apple Chip"
   - Intel 晶片 → 選 "Mac with Intel Chip"（不確定的話：蘋果菜單 → 關於本機，看「晶片」或「處理器」）
3. 打開下載的 `.dmg` 文件，把 Docker 拖入 Applications
4. 打開 Docker Desktop，等待頂部菜單欄出現鯨魚圖標
5. 首次啟動會要求輸入 Mac 密碼授權，點「確定」

### 第二步：下載 Plano
1. 打開瀏覽器，訪問 https://github.com/Iris-Yan99/jira-personal
2. 點擊綠色 "Code" 按鈕 → "Download ZIP"
3. 解壓到桌面（雙擊 ZIP 文件即可）

### 第三步：啟動應用
1. 打開「終端機」（Spotlight 搜索 "Terminal" 或在「應用程式 → 工具程式」中找到）
2. 輸入以下指令（複製貼上）：
   ```
   cd ~/Desktop/jira-personal-main
   docker compose up -d --build
   ```
3. 等待約 5-10 分鐘（首次需要下載 AI 模型，約 5GB）
4. 看到 "Started" 後，打開瀏覽器訪問 http://localhost:3001

### 之後每次使用（不需要終端機）

第一次設定完成後，以後只需要：
1. 打開 Docker Desktop
2. 點左側選單 "Containers"
3. 找到 `jira-personal-main`，點 ▶ **Start**
4. 打開瀏覽器訪問 http://localhost:3001

關閉時點 ■ **Stop** 即可。

### 常見問題
- **Docker 沒啟動？** 確認菜單欄有鯨魚圖標，且圖標靜止（轉圈表示還在啟動中）
- **頁面打不開？** 等多幾分鐘，AI 模型還在下載中
- **想關閉應用？** 在 Docker Desktop 點 ■ Stop
- **提示「無法打開，因為無法驗證開發者」？** 前往「系統設置 → 隱私與安全性」，點「仍要打開」即可

---

## 启动方式

### 方式一：Docker 一键部署（推荐）

**前提：** 已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# 克隆项目
git clone <repo-url> && cd jira-personal

# 一键启动（首次会构建镜像 + 下载 Ollama 模型，约 5GB）
./start.sh
```

启动后访问：**http://localhost:3001**

**手动操作：**

```bash
# 构建并启动所有服务
docker compose up -d --build

# 手动拉取 AI 模型（如 start.sh 未自动完成）
docker compose exec ollama ollama pull qwen3-vl:8b-instruct

# 查看日志
docker compose logs -f app
docker compose logs -f ollama

# 停止服务
docker compose down

# 停止并删除数据卷（慎用，会删除 Ollama 模型缓存）
docker compose down -v
```

---

### 方式二：本地开发（热更新）

**前提：** Node.js 18+、[Ollama](https://ollama.com) 已安装并运行

```bash
# 1. 安装依赖
npm run install:all

# 2. 下载 AI 模型（首次）
ollama pull qwen3-vl:8b-instruct

# 3. 启动开发服务器（前后端同时启动，支持热更新）
npm run dev
```

- 前端（Vite）：http://localhost:5173  ← 开发时使用这个地址
- 后端（Express API）：http://localhost:3001

---

### 方式三：Docker 开发模式（全容器热更新）

如需在 Docker 内进行开发（源码变更自动重启）：

```bash
docker compose -f docker-compose.dev.yml up
```

- 前端：http://localhost:5173
- 后端：http://localhost:3001
- 源码挂载进容器，修改后自动生效

---

## 环境变量

通过 `.env` 文件或 `docker-compose.yml` 的 `environment` 字段配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端服务端口 |
| `NODE_ENV` | `development` | 运行环境（`production` 时 Express 托管前端静态文件） |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama 服务地址（Docker 内为 `http://ollama:11434`） |
| `OLLAMA_MODEL` | `qwen3-vl:8b-instruct` | 使用的 AI 模型名称 |

---

## 数据持久化

- **SQLite 数据库**：存储在 `./data/tasks.db`，通过 Docker volume 挂载到宿主机，重建容器不丢失数据
- **Ollama 模型**：存储在 Docker named volume `ollama_data`，重建容器不需要重新下载

---

## 项目结构

```
jira-personal/
├── client/                # React 前端
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   └── utils/         # API 工具、冲突检测
│   └── vite.config.js
├── routes/                # Express API 路由
│   ├── ai.js              # Ollama AI 接口
│   ├── tasks.js
│   ├── logs.js
│   ├── reports.js
│   └── task-logs.js
├── data/                  # SQLite 数据库（gitignored）
├── db.js                  # 数据库初始化
├── server.js              # Express 入口
├── Dockerfile             # 多阶段构建
├── docker-compose.yml     # 生产部署
├── docker-compose.dev.yml # 开发模式
└── start.sh               # 一键启动脚本
```

---

## 部署到云服务器

```bash
# 在云服务器上（需要已安装 Docker）
git clone <repo-url> && cd jira-personal
./start.sh

# 若服务器有公网 IP，将 localhost 替换为服务器 IP 访问
# 建议配置 Nginx 反向代理 + HTTPS（Let's Encrypt）
```

**Nginx 反向代理示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## License

© 2026 Iris Labs. All rights reserved.
Built by Iris.
