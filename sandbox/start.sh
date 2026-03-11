#!/bin/bash
set -e

cd /home/user/codepilot

# 启动 Next.js dev server（后台运行，绑定 0.0.0.0 供外部访问）
npm run dev -- --hostname 0.0.0.0 &

# 轮询健康检查端点，确认 Next.js + SQLite + Claude CLI 全部就绪
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "ERROR: CodePilot failed to start within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

echo "CodePilot is ready (took ${WAITED}s)"

# 预热首页，触发 Next.js 按需编译，避免用户首次访问等待
curl -sf http://localhost:3000/ > /dev/null 2>&1 || true

# 保持前台运行（防止沙箱认为进程结束）
wait
