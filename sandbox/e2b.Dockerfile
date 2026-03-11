FROM e2bdev/base:latest

# 安装 better-sqlite3 编译工具链
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录（E2B 默认用户为 user）
WORKDIR /home/user/codepilot

# 复制 package.json 和 lock 文件（利用 Docker 层缓存）
COPY package.json package-lock.json ./

# 安装依赖（包括 better-sqlite3 native 编译）
RUN npm install

# 复制项目源码
COPY . .

# 预装 Claude Code CLI（固定版本，更新时重建模板）
RUN npm install -g @anthropic-ai/claude-code@1.0.17

# 预创建 Claude 配置目录，避免首次运行时的权限问题
RUN mkdir -p /home/user/.claude /home/user/.codepilot

# 设置数据目录环境变量
ENV CLAUDE_GUI_DATA_DIR=/home/user/.codepilot

# 复制启动脚本
COPY sandbox/start.sh /home/user/start.sh
RUN chmod +x /home/user/start.sh
