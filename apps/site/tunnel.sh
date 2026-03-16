#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# 入口站点 (apps/site/) Cloudflare Tunnel 部署脚本
# 用法: bash apps/site/tunnel.sh [port]
# ─────────────────────────────────────────────────
set -euo pipefail

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-3001}"

echo "=== CodePilot 入口站点部署 ==="
echo "目录: $SITE_DIR"
echo "端口: $PORT"
echo ""

# 1. 清理残留进程（解决端口冲突问题）
echo "[1/4] 清理残留进程..."
pkill -f "cloudflared tunnel" 2>/dev/null && echo "  已停止旧 cloudflared" || true
fuser -k "$PORT/tcp" 2>/dev/null && echo "  已释放端口 $PORT" || true
sleep 1

# 2. 构建
echo "[2/4] 构建入口站点..."
cd "$SITE_DIR"
npm run build

# 3. 启动 Next.js 服务器
echo "[3/4] 启动服务器 (端口 $PORT)..."
PORT="$PORT" npx next start -p "$PORT" &
SITE_PID=$!
sleep 3

# 验证服务器启动
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
  echo "  ✗ 服务器启动失败"
  kill "$SITE_PID" 2>/dev/null || true
  exit 1
fi
echo "  ✓ 服务器运行中 (HTTP $HTTP_CODE, PID $SITE_PID)"

# 4. 启动 Cloudflare Tunnel
echo "[4/4] 启动 Cloudflare Tunnel..."
echo ""

# 前台运行 cloudflared，Ctrl+C 同时停止隧道和服务器
trap 'echo ""; echo "正在停止..."; kill $SITE_PID 2>/dev/null; exit 0' INT TERM
cloudflared tunnel --url "http://localhost:$PORT"
