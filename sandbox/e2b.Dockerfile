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

# 构建时代理（显式设为 ENV 确保 RUN 步骤可用）
ARG BUILD_PROXY=""
ENV HTTP_PROXY=${BUILD_PROXY} HTTPS_PROXY=${BUILD_PROXY} http_proxy=${BUILD_PROXY} https_proxy=${BUILD_PROXY}

# 跳过 Electron 和 Playwright 二进制下载（沙箱中不需要桌面运行时）
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 预下载 node headers 供 node-gyp 编译 native 模块（避免 npx node-gyp install 版本不兼容）
RUN NODE_VER=$(node -v) && \
    mkdir -p /root/.cache/node-gyp/${NODE_VER#v}/include && \
    curl -sL https://nodejs.org/download/release/${NODE_VER}/node-${NODE_VER}-headers.tar.gz | \
    tar xz --strip-components=1 -C /root/.cache/node-gyp/${NODE_VER#v}/include && \
    echo "9" > /root/.cache/node-gyp/${NODE_VER#v}/installVersion

# 安装全部依赖（dev server 需要 typescript/tailwindcss 等），重试一次以应对网络抖动
RUN npm install || npm install

# 复制项目源码
COPY . .

# 预装 Claude Code CLI（固定版本，更新时重建模板）
RUN npm install -g @anthropic-ai/claude-code@1.0.17

# 预创建 Claude 配置目录，避免首次运行时的权限问题
RUN mkdir -p /home/user/.claude /home/user/.codepilot

# 运行时清除代理（E2B 沙箱可直连外网）
ENV HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy="" no_proxy=""

# 设置数据目录环境变量
ENV CLAUDE_GUI_DATA_DIR=/home/user/.codepilot

# 复制启动脚本
COPY sandbox/start.sh /home/user/start.sh
RUN chmod +x /home/user/start.sh
