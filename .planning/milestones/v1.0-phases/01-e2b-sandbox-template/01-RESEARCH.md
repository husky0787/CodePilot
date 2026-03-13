# Phase 1: E2B Sandbox Template - Research

**Researched:** 2026-03-11
**Domain:** E2B 沙箱模板构建、Next.js Web 模式运行、Claude Agent SDK 集成
**Confidence:** MEDIUM-HIGH

## Summary

本阶段需要构建一个自定义 E2B 沙箱模板，预装全部运行时依赖，启动后用户通过公开 URL 即可访问完整 CodePilot Web UI。核心技术栈已明确：E2B 自定义模板（e2b.Dockerfile）+ Next.js dev server 绑定 0.0.0.0 + Claude Agent SDK（通过 `@anthropic-ai/claude-agent-sdk` npm 包）+ better-sqlite3 Linux 编译。

CodePilot 使用 Claude Agent SDK 而非直接调用 CLI 二进制——SDK 的 `query()` 函数在内部 spawn Claude Code CLI 子进程。因此沙箱内需要预装 Claude Code CLI（`npm install -g @anthropic-ai/claude-code`），且 CLI 路径必须在 `platform.ts` 的搜索路径上。认证通过 `ANTHROPIC_API_KEY` 环境变量注入，SDK 会自动传递给子进程。

E2B 端口暴露机制简单：`sandbox.getHost(3000)` 返回公开 hostname，格式为 `https://3000-{sandbox-id}.e2b.app`。Next.js 通过 `--hostname 0.0.0.0` 参数绑定所有网络接口，外部即可访问。

**Primary recommendation:** 使用 E2B CLI (`e2b template build`) 构建自定义模板，e2b.Dockerfile 基于 E2B 默认基础镜像，预装项目依赖和 Claude Code CLI，启动脚本执行 `npm run dev -- --hostname 0.0.0.0` 并轮询 `/api/health` 确认就绪。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 沙箱内使用 `npm run dev` (Dev Server) 模式运行，不做 standalone 生产构建
- 启动脚本轮询健康检查端点（如 /api/health），确认 Next.js + SQLite + Claude CLI 全部就绪后才标记沙箱可用
- CodePilot 版本更新时重建 E2B 模板，不做启动时 git pull
- 对模板体积无特殊要求，确保能跑即可
- 使用 E2B 提供的默认基础镜像（已预装 Node.js 等常用工具）
- better-sqlite3 在 Dockerfile 构建阶段编译（安装 build-essential/python3 等编译工具链），沙箱启动时无需再编译
- 不做多阶段构建或体积优化
- 在 Dockerfile 中预装 Claude Code CLI（npm install -g @anthropic-ai/claude-code@固定版本）
- 版本固定在 Dockerfile 中，更新时重建模板
- 用户 API Key 通过 E2B SDK 设置环境变量 ANTHROPIC_API_KEY 注入沙箱
- 必须跳过 CLI 首次运行的交互式授权流程（通过环境变量或预写配置文件）
- Next.js 绑定 0.0.0.0 通过启动参数 `--hostname 0.0.0.0` 实现，不修改 next.config.ts
- Electron 特有功能（安装向导、自动更新、原生对话框）静默降级，依赖现有 `?.` 守卫即可
- 不添加 Web 模式环境变量标志（如 CODEPILOT_WEB_MODE），现有守卫足够
- 不显示"云端模式"标识或额外品牌标记，与桌面版体验一致

### Claude's Discretion
- 健康检查端点的具体实现（新建路由 vs 复用现有端点）
- 启动脚本的具体 shell 逻辑和超时策略
- E2B Dockerfile 的具体层结构和缓存优化
- CLI 跳过授权的具体技术手段（环境变量 vs 配置文件预写）

### Deferred Ideas (OUT OF SCOPE)
无
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SAND-01 | CodePilot 以纯 Next.js Web 模式运行，所有 Electron IPC 调用优雅降级为 Web 替代方案 | 现有 `?.` 可选链守卫已覆盖所有 9 个 electronAPI 引用文件；`npm run dev` 本身就是纯 Web 模式 |
| SAND-02 | 自定义 E2B 沙箱模板预装 Node.js、Claude Code CLI、better-sqlite3、全部 CodePilot 依赖 | E2B e2b.Dockerfile 构建流程、基础镜像选择、better-sqlite3 编译依赖、Claude CLI 安装 |
| SAND-03 | 沙箱内 Next.js 绑定 `0.0.0.0` 并通过 E2B 端口暴露供外部浏览器访问 | `--hostname 0.0.0.0` 参数 + `sandbox.getHost(3000)` API |
| SAND-04 | 用户通过浏览器 URL 直接访问沙箱内完整的 CodePilot Chat/文件/工具 UI | 端口暴露 URL 格式 `https://3000-{id}.e2b.app`，健康检查确认可用性 |
</phase_requirements>

## Standard Stack

### Core
| Library / Tool | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| E2B CLI (`@e2b/cli`) | latest | 构建和管理沙箱模板 | E2B 官方 CLI 工具 |
| E2B SDK (`e2b`) | latest | 从代码创建/管理沙箱实例 | E2B 官方 JS SDK |
| `@anthropic-ai/claude-agent-sdk` | ^0.2.62 | Claude Code 集成 | 项目已使用，SDK 内部 spawn CLI |
| `@anthropic-ai/claude-code` | 固定版本 | CLI 二进制，SDK 子进程 | Agent SDK 的运行时依赖 |
| Next.js | 16.1.6 | Web 服务器和 UI 框架 | 项目现有技术栈 |
| better-sqlite3 | ^12.6.2 | 本地持久化 | 项目现有技术栈 |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `build-essential` | better-sqlite3 native 编译 | Dockerfile 构建阶段 |
| `python3` | node-gyp 编译依赖 | Dockerfile 构建阶段 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| E2B CLI 模板构建 | E2B Build System 2.0 (代码式构建) | 2.0 更简单但更新较新，文档较少，CLI 方式更成熟稳定 |
| Dev Server 模式 | Standalone 生产构建 | 用户已决定使用 dev mode，避免生产构建的复杂性 |

**Installation (Portal 项目, Phase 2 才需要):**
```bash
npm install e2b
npm install -g @e2b/cli
```

**模板项目文件 (Phase 1 核心产物):**
```
e2b-template/
├── e2b.Dockerfile        # 自定义沙箱模板定义
├── e2b.toml              # E2B 模板配置（build 自动生成）
└── start.sh              # 沙箱启动脚本
```

## Architecture Patterns

### Recommended Project Structure
```
sandbox/                    # 新目录，存放 E2B 模板相关文件
├── e2b.Dockerfile          # 沙箱模板 Dockerfile
├── start.sh                # 启动脚本（轮询健康检查）
└── README.md               # 模板构建和使用说明
src/app/api/health/route.ts # 已存在的健康检查端点（可能需增强）
```

### Pattern 1: E2B 自定义模板 Dockerfile
**What:** 使用 e2b.Dockerfile 定义沙箱环境，基于 E2B 默认基础镜像
**When to use:** 需要自定义沙箱内预装软件时
**Example:**
```dockerfile
# Source: E2B 官方文档 https://e2b.dev/docs/sandbox-template
FROM e2bdev/base:latest

# 安装 better-sqlite3 编译工具链
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY . /home/user/codepilot
WORKDIR /home/user/codepilot

# 安装项目依赖（包括 better-sqlite3 native 编译）
RUN npm install

# 预装 Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code@<固定版本>

# 复制启动脚本
COPY sandbox/start.sh /home/user/start.sh
RUN chmod +x /home/user/start.sh
```

### Pattern 2: 启动脚本 + 健康检查轮询
**What:** 启动 Next.js dev server 并轮询 /api/health 直到就绪
**When to use:** 沙箱 start command 需要确认服务完全启动
**Example:**
```bash
#!/bin/bash
set -e

cd /home/user/codepilot

# 启动 Next.js dev server（后台运行）
npm run dev -- --hostname 0.0.0.0 &

# 轮询健康检查
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "ERROR: Next.js failed to start within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

echo "CodePilot is ready (took ${WAITED}s)"

# 保持前台运行（防止沙箱认为进程结束）
wait
```

### Pattern 3: E2B 端口暴露
**What:** 通过 E2B SDK 获取沙箱内服务的公开 URL
**When to use:** 需要从外部浏览器访问沙箱内服务时
**Example:**
```typescript
// Source: E2B 官方文档 https://e2b.dev/docs/sandbox/internet-access
import { Sandbox } from 'e2b';

const sandbox = await Sandbox.create('codepilot-template', {
  envs: {
    ANTHROPIC_API_KEY: userApiKey,
  },
});

const host = sandbox.getHost(3000);
const url = `https://${host}`;
// url 格式: https://3000-{sandbox-id}.e2b.app
```

### Pattern 4: Claude Agent SDK 认证流
**What:** CodePilot 通过 Agent SDK 与 Claude 通信，SDK 内部 spawn CLI 子进程
**When to use:** 理解沙箱内认证链路
**Detail:**
```
用户 API Key → E2B SDK envs → 沙箱 process.env.ANTHROPIC_API_KEY
  → Next.js 继承 env → claude-client.ts sdkEnv 构建
  → Agent SDK query() options.env → CLI 子进程 env
  → CLI 使用 ANTHROPIC_API_KEY 直接认证（跳过 OAuth）
```

### Anti-Patterns to Avoid
- **在 Dockerfile 中 `npm run build`：** 用户决定使用 dev mode，不需要生产构建
- **启动时 `git pull`：** 用户决定版本更新通过重建模板实现
- **添加 CODEPILOT_WEB_MODE 环境变量：** 用户决定不添加，现有守卫足够
- **修改 next.config.ts 绑定地址：** 通过 CLI 参数 `--hostname 0.0.0.0` 实现

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 沙箱环境构建 | 自定义 Docker 部署流程 | E2B `e2b template build` | E2B 处理镜像注册、快照、启动优化 |
| 端口暴露和公开 URL | 自建反向代理/隧道 | E2B `sandbox.getHost(port)` | E2B 自动提供 HTTPS 公开 URL |
| CLI 认证 | 自写 OAuth 流程 | `ANTHROPIC_API_KEY` 环境变量 | SDK headless 模式下自动使用 env key |
| 健康检查 | 自定义 TCP 探测 | HTTP GET `/api/health` | 项目已有此端点，返回 `{"status":"ok"}` |

**Key insight:** E2B 平台已处理了沙箱启动、网络暴露、文件系统快照等基础设施问题，只需关注模板内容定义。

## Common Pitfalls

### Pitfall 1: Claude Code CLI 首次运行交互式授权
**What goes wrong:** CLI 首次运行时弹出交互式 OAuth 登录流程，沙箱内无人操作导致卡死
**Why it happens:** CLI 默认需要 OAuth 授权，即使设置了 ANTHROPIC_API_KEY，interactive mode 仍可能要求 `/login`
**How to avoid:** CodePilot 不直接运行 CLI interactive mode——它使用 Agent SDK 的 `query()` 函数，该函数通过 `options.env` 传递 `ANTHROPIC_API_KEY`，CLI 子进程在 headless/SDK 模式下会自动使用 API key 而不触发 OAuth。但需注意：
  1. 确保沙箱 env 中有 `ANTHROPIC_API_KEY`
  2. 确保没有残留的 `~/.config/claude-code/` 配置导致冲突
  3. 如果仍遇到问题，可预写 `~/.claude/.credentials.json` 或设置 `CLAUDE_CODE_SKIP_AUTH=1`（需验证此变量是否存在）
**Warning signs:** 沙箱启动后 Claude 对话功能返回认证错误

### Pitfall 2: better-sqlite3 编译环境不匹配
**What goes wrong:** better-sqlite3 native 模块在 Dockerfile 构建时编译的架构/Node 版本与运行时不匹配
**Why it happens:** E2B 基础镜像的 Node.js 版本可能与项目期望不一致
**How to avoid:**
  1. 在 Dockerfile 中确认 Node.js 版本（`node --version`）
  2. `npm install` 时 better-sqlite3 会自动编译 native 模块
  3. 确保编译工具链（build-essential, python3）在 `npm install` 之前安装
  4. `serverExternalPackages: ['better-sqlite3']` 已在 next.config.ts 中配置
**Warning signs:** 启动时报 `Cannot find module 'better-sqlite3'` 或 `NODE_MODULE_VERSION mismatch`

### Pitfall 3: Next.js Dev Server 启动缓慢
**What goes wrong:** 沙箱内 dev server 编译首页需要较长时间，超过 30 秒 SLA
**Why it happens:** dev mode 首次访问时才编译页面（按需编译），沙箱冷启动叠加编译时间
**How to avoid:**
  1. 启动脚本的 MAX_WAIT 设置为 60 秒
  2. 健康检查确认 server 监听后，额外请求首页触发预编译
  3. 考虑在启动脚本中 `curl http://localhost:3000/` 预热首页
**Warning signs:** 健康检查通过但首次访问白屏等待 10+ 秒

### Pitfall 4: E2B 基础镜像只支持 Debian 系
**What goes wrong:** 使用 Alpine 或其他非 Debian 基础镜像导致构建失败
**Why it happens:** E2B 要求只使用 Debian-based 镜像
**How to avoid:** 使用 `e2bdev/base:latest`（E2B 官方默认基础镜像）
**Warning signs:** `e2b template build` 报镜像不兼容错误

### Pitfall 5: 沙箱内文件路径和权限
**What goes wrong:** 项目文件放在 root 目录，或权限不对导致 SQLite 无法写入
**Why it happens:** Dockerfile 默认以 root 运行，而应用期望在用户 home 目录
**How to avoid:**
  1. WORKDIR 设置为 `/home/user/codepilot`（E2B 默认用户为 `user`）
  2. 设置 `CLAUDE_GUI_DATA_DIR` 环境变量指向可写目录
  3. 确保 `~/.codepilot/` 目录可创建和写入
**Warning signs:** SQLite `SQLITE_CANTOPEN` 错误

## Code Examples

### E2B Dockerfile 完整示例
```dockerfile
# Source: E2B 文档 + 项目需求分析
FROM e2bdev/base:latest

# 安装 better-sqlite3 编译工具链
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /home/user/codepilot

# 复制 package.json 和 lock 文件（利用 Docker 层缓存）
COPY package.json package-lock.json ./

# 安装依赖（包括 better-sqlite3 native 编译）
RUN npm install

# 复制项目源码
COPY . .

# 预装 Claude Code CLI（固定版本）
RUN npm install -g @anthropic-ai/claude-code@1.0.0

# 复制启动脚本
COPY sandbox/start.sh /home/user/start.sh
RUN chmod +x /home/user/start.sh
```

### 健康检查增强（可选）
```typescript
// Source: 项目已有 src/app/api/health/route.ts，可增强为深度检查
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { findClaudeBinary } from '@/lib/platform';

export async function GET() {
  try {
    // 检查 SQLite 是否可用
    const db = getDb();
    db.prepare('SELECT 1').get();

    // 检查 Claude CLI 是否可发现
    const claudePath = findClaudeBinary();

    return NextResponse.json({
      status: 'ok',
      sqlite: true,
      claude_cli: !!claudePath,
      claude_path: claudePath || null,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 503 }
    );
  }
}
```

### E2B 模板构建命令
```bash
# 初始化模板（首次）
cd sandbox/
e2b template init

# 构建模板（指定启动命令）
e2b template build \
  -n "codepilot" \
  -c "/home/user/start.sh" \
  --dockerfile e2b.Dockerfile

# 构建后 e2b.toml 自动生成，包含 template_id
```

### 沙箱创建示例（Phase 2 使用，此处仅做验证参考）
```typescript
import { Sandbox } from 'e2b';

// 从模板创建沙箱
const sandbox = await Sandbox.create('codepilot', {
  envs: {
    ANTHROPIC_API_KEY: 'sk-ant-...',
    CLAUDE_GUI_DATA_DIR: '/home/user/.codepilot',
  },
});

// 获取公开 URL
const host = sandbox.getHost(3000);
console.log(`CodePilot URL: https://${host}`);
// Output: https://3000-i62mff4ahtrdfdkyn2esc.e2b.app

// 可选：限制访问
const sandbox2 = await Sandbox.create('codepilot', {
  network: { allowPublicTraffic: false },
  envs: { ANTHROPIC_API_KEY: '...' },
});
// 需要 e2b-traffic-access-token header 才能访问
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| E2B CLI-only 模板构建 | Build System 2.0（代码式构建） | 2025 | 无需 Dockerfile，通过 SDK 代码定义模板；但 CLI 方式仍完全支持 |
| Claude Code CLI OAuth 登录 | API Key + headless mode | 一直支持 | `-p` 模式 + `ANTHROPIC_API_KEY` 跳过 OAuth |
| E2B `e2b.Dockerfile` 仅支持旧版 | Legacy Dockerfile + 新版 SDK 并存 | 2025 | 两种方式共存，CLI 模板构建文档可能引用旧版路径 |

**Deprecated/outdated:**
- E2B 旧版 `template_file` 概念（现在统一为 `e2b.Dockerfile`）
- Claude Code CLI 旧版认证问题（2.0.37+ 修复了部分 API key 检测问题）

## Open Questions

1. **E2B 基础镜像预装的 Node.js 版本**
   - What we know: E2B `e2bdev/base` 预装 Node.js 和常用工具
   - What's unclear: 具体预装的 Node.js 版本号，是否为 LTS，是否与项目 Next.js 16 / React 19 兼容
   - Recommendation: 在 Dockerfile 中添加 `RUN node --version && npm --version` 验证，必要时手动安装指定版本

2. **Claude Code CLI 在 SDK 模式下的首次运行行为**
   - What we know: Agent SDK `query()` spawn CLI 子进程，通过 `options.env` 传递 `ANTHROPIC_API_KEY`
   - What's unclear: CLI 子进程首次在沙箱中运行时是否会创建 `~/.claude/` 配置目录、是否有 welcome 提示、是否需要预写 settings
   - Recommendation: 构建模板后实际测试一轮完整对话，观察 CLI 行为。如有问题，在 Dockerfile 中预创建 `~/.claude/` 和必要配置文件

3. **E2B 沙箱 start command 的进程管理**
   - What we know: `e2b template build -c "command"` 设置启动命令
   - What's unclear: 如果启动命令进程退出（如 Node crash），E2B 是否自动重启，或沙箱直接标记为不可用
   - Recommendation: 启动脚本用 `wait` 保持前台，不要让主进程退出

4. **网络延迟和 WebSocket 兼容性**
   - What we know: E2B 提供 HTTPS 公开 URL，支持 HTTP 和 WebSocket
   - What's unclear: SSE（Server-Sent Events，CodePilot 用于消息流）是否在 E2B 网络代理下正常工作
   - Recommendation: 早期测试验证 SSE 流式响应是否正常通过 E2B 代理

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | tsx + node:test (单元)、Playwright (E2E) |
| Config file | `package.json` scripts 部分 |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAND-01 | Electron IPC 优雅降级 | smoke | `npm run test:smoke` (验证 Web 模式无 JS 报错) | 已有冒烟测试框架 |
| SAND-02 | 模板预装依赖完整 | manual-only | `e2b template build` 构建验证 + 手动启动沙箱 | 无 — 需手动验证 |
| SAND-03 | Next.js 绑定 0.0.0.0 + 端口暴露 | manual-only | 启动沙箱后 curl 公开 URL | 无 — 需手动验证 |
| SAND-04 | 浏览器访问完整 UI | manual-only | 启动沙箱后浏览器访问验证 | 无 — 需手动验证 |

### Sampling Rate
- **Per task commit:** `npm run test`（确保代码改动不破坏类型检查和单元测试）
- **Per wave merge:** `npm run test` + 手动 `e2b template build` 验证
- **Phase gate:** 完整沙箱启动测试（构建模板 -> 创建沙箱 -> 访问 URL -> Claude 对话）

### Wave 0 Gaps
- [ ] `sandbox/e2b.Dockerfile` — SAND-02 核心产物
- [ ] `sandbox/start.sh` — 启动脚本 + 健康检查轮询
- [ ] E2B CLI 安装: `npm install -g @e2b/cli` — 本地构建模板所需
- [ ] E2B API Key 配置: `E2B_API_KEY` 环境变量 — 构建和测试模板所需

## Sources

### Primary (HIGH confidence)
- [E2B Sandbox Template 文档](https://e2b.dev/docs/sandbox-template) - 模板构建流程
- [E2B Internet Access / Port 暴露](https://e2b.dev/docs/sandbox/internet-access) - `getHost()` API 和 URL 格式
- [E2B 环境变量](https://e2b.dev/docs/sandbox/environment-variables) - `envs` 参数注入
- [Claude Code Headless 文档](https://code.claude.com/docs/en/headless) - `-p` 模式和 API key 认证
- 项目源码 `src/lib/claude-client.ts` - SDK 使用方式和 env 构建逻辑
- 项目源码 `src/lib/platform.ts` - CLI 二进制发现路径
- 项目源码 `src/app/api/health/route.ts` - 已有健康检查端点

### Secondary (MEDIUM confidence)
- [E2B CLI 模板命令](https://e2b.dev/docs/sdk-reference/cli/v2.2.2/template) - `e2b template build` 选项
- [E2B 基础镜像](https://e2b.dev/docs/template/base-image) - `e2bdev/base` 镜像信息
- [Claude Code GitHub Issues](https://github.com/anthropics/claude-code/issues/27900) - Interactive mode 与 API key 的已知问题

### Tertiary (LOW confidence)
- E2B Build System 2.0（新功能，文档仍在完善中，本阶段不使用）
- Claude Code CLI `CLAUDE_CODE_SKIP_AUTH` 环境变量（未在官方文档中确认，需验证）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - E2B 和 Claude SDK 文档明确，项目现有代码可直接分析
- Architecture: MEDIUM-HIGH - E2B 模板构建模式明确，但启动脚本和健康检查细节需实际验证
- Pitfalls: MEDIUM - better-sqlite3 编译和 CLI 认证问题有社区报告，但具体沙箱环境需实测

**Research date:** 2026-03-11
**Valid until:** 2026-04-10 (30 days - E2B 和 Claude Code CLI 更新较快)
