#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}=== Plano — 一键启动 ===${NC}"
echo ""

# ── 1. 检查 Docker ─────────────────────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}✗ Docker 未运行，请先启动 Docker Desktop 后重试${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker 已就绪${NC}"

# ── 2. 确定 compose 命令 ───────────────────────────────────────────────────────
if docker compose version > /dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo -e "${RED}✗ 未找到 docker compose / docker-compose 命令${NC}"
  exit 1
fi

# ── 3. 检查宿主机 Ollama 是否可访问 ───────────────────────────────────────────
echo -e "${YELLOW}→ 检查 Ollama 服务（localhost:11434）...${NC}"
if curl -s --max-time 3 http://localhost:11434 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Ollama 服务已就绪${NC}"
else
  echo -e "${RED}✗ 无法连接到 localhost:11434，请确认 Ollama 正在运行${NC}"
  echo -e "  启动命令：${YELLOW}ollama serve${NC}"
  exit 1
fi

# ── 4. 创建数据目录 ────────────────────────────────────────────────────────────
mkdir -p data
echo -e "${GREEN}✓ 数据目录就绪 (./data)${NC}"

# ── 5. 构建并启动服务 ──────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}→ 构建镜像并启动服务...${NC}"
$COMPOSE up -d --build

# ── 6. 完成 ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}=== 启动成功！===${NC}"
echo ""
echo -e "  📱 应用地址：   ${GREEN}http://localhost:3001${NC}"
echo -e "  🤖 Ollama API： ${GREEN}http://localhost:11434${NC}  (宿主机)"
echo ""
echo -e "  常用命令："
echo -e "    查看日志：  ${YELLOW}$COMPOSE logs -f app${NC}"
echo -e "    停止服务：  ${YELLOW}$COMPOSE down${NC}"
echo -e "    重启服务：  ${YELLOW}$COMPOSE restart app${NC}"
echo ""
