# Architecture Research

**Domain:** E2B 沙箱云端开发环境 (CodePilot Cloud)
**Researched:** 2026-03-11
**Confidence:** MEDIUM

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                      │
│  访问入口站点 → 输入 API Key → 点击启动 → 跳转到沙箱 URL               │
└──────────┬───────────────────────────────────┬───────────────────────┘
           │ (1) 创建/恢复沙箱                    │ (2) 直连沙箱内 Next.js
           ▼                                     ▼
┌─────────────────────┐              ┌──────────────────────────────────┐
│   入口站点 (Portal)   │              │       E2B 沙箱 (microVM)          │
│   Next.js on Vercel  │              │                                  │
│                     │              │  ┌────────────────────────────┐  │
│  ┌───────────────┐  │   E2B SDK   │  │  CodePilot (Next.js 16)    │  │
│  │ Landing Page  │  │ ──────────► │  │  standalone mode on :3000  │  │
│  │ API Key 输入  │  │  create /   │  │                            │  │
│  │ 沙箱管理 API  │──┤  pause /    │  │  ┌──────┐  ┌───────────┐  │  │
│  └───────────────┘  │  resume     │  │  │API层 │  │ SQLite DB │  │  │
│                     │              │  │  └──┬───┘  └───────────┘  │  │
│  ┌───────────────┐  │              │  │     │                     │  │
│  │ E2B SDK 调用  │  │              │  │     ▼                     │  │
│  │ 沙箱生命周期  │  │              │  │  ┌──────────────────┐     │  │
│  └───────────────┘  │              │  │  │ Claude Agent SDK  │     │  │
└─────────────────────┘              │  │  │ (claude CLI)      │     │  │
                                     │  │  └──────────────────┘     │  │
                                     │  └────────────────────────────┘  │
                                     │                                  │
                                     │  端口 3000 通过 E2B getHost 暴露   │
                                     │  URL: https://3000-{id}.e2b.app  │
                                     └──────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| 入口站点 (Portal) | Landing 页、API Key 收集、沙箱生命周期管理 | 独立 Next.js 项目，部署在 Vercel/Cloudflare |
| E2B SDK 层 | 创建/暂停/恢复/销毁沙箱 | Portal 的 API Routes 调用 `e2b` JS SDK |
| E2B 沙箱模板 | 预装 CodePilot + Node.js + Claude CLI 的自定义环境 | e2b.Dockerfile 定义，`e2b template build` 构建 |
| CodePilot Web | 完整的 CodePilot 功能（去除 Electron 层） | Next.js standalone 模式，直接在沙箱内运行 |
| SQLite 数据库 | 会话、消息、设置持久化 | better-sqlite3，数据在 `~/.codepilot/` |
| Claude Agent SDK | AI 对话核心 | 沙箱内预装 `claude` CLI，通过用户 API Key 调用 |

## Recommended Project Structure

```
codepilot-cloud/                    # 入口站点（独立仓库或 monorepo 子目录）
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Landing 页
│   │   ├── sandbox/
│   │   │   └── page.tsx            # 沙箱管理/等待页
│   │   └── api/
│   │       ├── sandbox/
│   │       │   ├── create/route.ts # 创建沙箱
│   │       │   ├── resume/route.ts # 恢复沙箱
│   │       │   ├── pause/route.ts  # 暂停沙箱
│   │       │   └── status/route.ts # 查询状态
│   │       └── health/route.ts     # 健康检查
│   ├── lib/
│   │   ├── e2b.ts                  # E2B SDK 封装
│   │   └── session.ts              # 沙箱会话管理（cookie/token → sandbox ID 映射）
│   └── components/
│       ├── ApiKeyForm.tsx          # API Key 输入表单
│       └── SandboxStatus.tsx       # 沙箱状态展示
├── package.json
└── e2b-template/                   # E2B 模板定义
    ├── e2b.toml                    # 模板配置（CPU、内存、启动命令）
    └── e2b.Dockerfile              # 沙箱环境 Dockerfile

codepilot-3/                        # 现有 CodePilot 仓库
├── src/                            # 主要改动：Electron 依赖的优雅降级
│   ├── lib/
│   │   └── env.ts                  # 新增：运行环境检测（electron/web/sandbox）
│   └── components/
│       └── layout/
│           └── AppShell.tsx        # 改动：条件隐藏 Electron-only 功能
├── next.config.ts                  # 已有 output: 'standalone'，无需改动
└── scripts/
    └── sandbox-entrypoint.sh       # 沙箱内启动脚本
```

### Structure Rationale

- **独立入口站点:** 关注点分离。Portal 负责沙箱编排，CodePilot 专注于应用功能。两者独立部署、独立迭代。
- **e2b-template/ 在入口站点仓库:** 模板定义与调用它的 SDK 代码放在一起，避免跨仓库构建依赖。
- **CodePilot 仓库改动最小化:** 只添加环境检测和条件降级，不拆分代码或改架构，保持桌面端和云端共用同一套代码。

## Architectural Patterns

### Pattern 1: Electron 功能优雅降级

**What:** CodePilot 目前有 9 个文件引用 `window.electronAPI`。在 Web/沙箱模式下，这些 API 不存在，需要提供 fallback。
**When to use:** 任何引用 Electron IPC 的地方。
**Trade-offs:** 保持单一代码库（优点），但需要在每个调用点加条件判断（轻微复杂度增加）。

**Example:**
```typescript
// src/lib/env.ts
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function isSandbox(): boolean {
  return process.env.NEXT_PUBLIC_RUNTIME === 'sandbox';
}

// src/hooks/useNativeFolderPicker.ts — 现有代码改造
export function useNativeFolderPicker() {
  if (isElectron()) {
    return window.electronAPI!.dialog.openFolder;
  }
  // Web fallback: <input type="file" webkitdirectory />
  return webFolderPicker;
}
```

**受影响文件清单（9 个）：**
- `src/hooks/useNativeFolderPicker.ts` — 文件夹选择 fallback
- `src/components/settings/AssistantWorkspaceSection.tsx` — 工作区路径选择
- `src/components/layout/InstallWizard.tsx` — 沙箱内跳过安装向导
- `src/components/layout/ChatListPanel.tsx` — 可能涉及 shell.openPath
- `src/components/layout/ConnectionStatus.tsx` — 版本信息显示
- `src/components/layout/AppShell.tsx` — 整体布局条件渲染
- `src/components/bridge/BridgeSection.tsx` — Bridge 状态检查
- `src/app/chat/[id]/page.tsx` — 聊天页

### Pattern 2: E2B 沙箱作为不透明计算单元

**What:** Portal 只管沙箱的生命周期（创建/暂停/恢复/销毁），不与沙箱内部的 CodePilot 应用做任何数据交互。用户浏览器通过 E2B 公开 URL 直连沙箱内的 Next.js。
**When to use:** 这是本项目的核心架构决策。
**Trade-offs:** 极其简单（Portal 不需要代理流量），但 Portal 无法感知用户在沙箱内的行为（无法做使用统计等）。

**Example:**
```typescript
// Portal: src/lib/e2b.ts
import { Sandbox } from 'e2b';

export async function createCodePilotSandbox(apiKey: string) {
  const sandbox = await Sandbox.create('codepilot-template', {
    timeoutMs: 30 * 60 * 1000,  // 30 分钟
    autoPause: true,
    envs: {
      ANTHROPIC_API_KEY: apiKey,
    },
  });

  // 等待 Next.js 启动
  const host = sandbox.getHost(3000);
  return {
    sandboxId: sandbox.sandboxId,
    url: `https://${host}`,
  };
}
```

### Pattern 3: 自定义 E2B 模板预热启动

**What:** 通过自定义 e2b.Dockerfile 预装所有依赖，使用 `startCmd` 在沙箱就绪时自动启动 Next.js，最大限度缩短用户等待时间。
**When to use:** 必须，否则每次创建沙箱都要 `npm install`，用户等待时间不可接受。
**Trade-offs:** 模板构建慢（一次性），但沙箱启动快（秒级）。模板需要在 CodePilot 更新时重新构建。

**Example:**
```dockerfile
# e2b-template/e2b.Dockerfile
FROM node:21-slim

# 预装 Claude CLI
RUN npm install -g @anthropic-ai/claude-code

# 安装系统依赖（better-sqlite3 编译需要）
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 复制 CodePilot 代码并构建
WORKDIR /app
COPY codepilot/ .
RUN npm ci
RUN npm run build

# 启动命令将在 e2b.toml 中配置
```

```toml
# e2b-template/e2b.toml
[template]
name = "codepilot-template"
start_cmd = "cd /app && node .next/standalone/server.js"
cpu_count = 4
memory_mb = 4096

[template.wait_for_url]
url = "http://localhost:3000"
```

## Data Flow

### 沙箱创建流程

```
用户浏览器
    │
    │  (1) 输入 API Key，点击 "启动"
    ▼
Portal API (POST /api/sandbox/create)
    │
    │  (2) 调用 E2B SDK: Sandbox.create('codepilot-template', { envs: { ANTHROPIC_API_KEY } })
    ▼
E2B 平台
    │
    │  (3) 启动 microVM（~200ms），执行 start_cmd
    │      沙箱内 Next.js server 启动（~3-5s）
    ▼
Portal API
    │
    │  (4) 获取 sandbox.getHost(3000) → 公开 URL
    │      返回 { sandboxId, url } 给浏览器
    ▼
用户浏览器
    │
    │  (5) 重定向到 https://3000-{sandboxId}.e2b.app
    │      直连沙箱内 CodePilot
    ▼
沙箱内 CodePilot (Next.js)
    │
    │  (6) 正常运行：聊天、文件、插件等功能
    │      通过 Claude Agent SDK 调用 AI（使用用户的 API Key）
    ▼
Anthropic API / 其他 AI 提供商
```

### 沙箱暂停/恢复流程

```
超时触发 或 用户主动暂停
    │
    │  E2B autoPause: 沙箱自动暂停
    │  保存完整内存 + 文件系统状态
    │  暂停耗时 ~4s/GiB RAM
    ▼
用户回访 Portal
    │
    │  (1) Portal 检测到已有暂停的沙箱（通过 sandboxId cookie）
    │  (2) 调用 Sandbox.connect(sandboxId) 自动恢复
    │      恢复耗时 ~1s
    ▼
沙箱恢复运行
    │
    │  Next.js 进程、SQLite 数据、所有状态完整恢复
    │  用户浏览器重新连接
    ▼
```

### 沙箱内数据流（与现有 CodePilot 完全一致）

```
用户输入 → MessageInput 组件
         → POST /api/chat/messages (沙箱内 localhost)
         → claude-client.ts → Claude Agent SDK SSE 流
         → stream-session-manager.ts 管理流
         → useSSEStream hook 订阅
         → MessageList 渲染
         → db.ts 持久化到 SQLite (沙箱内文件系统)
```

### Key Data Flows

1. **API Key 传递:** 用户在 Portal 输入 → Portal 通过 E2B SDK `envs` 注入到沙箱环境变量 → CodePilot 读取 `process.env.ANTHROPIC_API_KEY`。Key 不存储在 Portal 端。
2. **沙箱会话映射:** Portal 将 `sandboxId` 存入浏览器 cookie 或 localStorage → 用户回访时自动恢复对应沙箱。
3. **沙箱内所有数据:** 完全在沙箱内闭环（SQLite + 文件系统），通过 E2B 暂停/恢复机制持久化，不外泄到 Portal。

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 并发沙箱 | 当前架构足够。Portal 是无状态 Next.js，E2B 管理所有沙箱。 |
| 100-1000 并发沙箱 | 关注 E2B API 配额和费用。Portal 添加简单队列防止突发创建。考虑沙箱超时策略优化。 |
| 1000+ 并发沙箱 | 需要 E2B Enterprise 计划。Portal 可能需要 Redis 做会话映射缓存。考虑多区域部署。 |

### Scaling Priorities

1. **First bottleneck: E2B 配额和成本。** 每个沙箱是一个 microVM（4 CPU / 4GB RAM），并发成本线性增长。通过 autoPause 降低闲置成本。
2. **Second bottleneck: 沙箱启动时间。** 虽然 microVM 启动 ~200ms，但 Next.js 冷启动需 3-5s。使用预热模板和 `standalone` 模式（已配置）最小化启动时间。

## Anti-Patterns

### Anti-Pattern 1: Portal 代理沙箱流量

**What people do:** 让 Portal 做反向代理，将用户请求转发到沙箱内 Next.js。
**Why it's wrong:** 增加延迟、增加 Portal 负载、SSE 流可能超时、WebSocket 代理复杂。E2B 已经提供公开 URL，无需再代理。
**Do this instead:** 用户浏览器直连沙箱 URL（`https://3000-{id}.e2b.app`）。Portal 只负责沙箱生命周期管理。

### Anti-Pattern 2: 每次启动沙箱时安装依赖

**What people do:** 使用通用 Node.js 模板，在沙箱启动时 `npm install && npm run build`。
**Why it's wrong:** 用户等待 2-5 分钟不可接受。网络不稳定时安装可能失败。浪费沙箱运行时间（计费）。
**Do this instead:** 自定义 E2B 模板，预装所有依赖和构建产物。沙箱启动时只需执行 `node server.js`。

### Anti-Pattern 3: 在 Portal 存储用户 API Key

**What people do:** 将 API Key 存入 Portal 数据库，后续请求从数据库读取。
**Why it's wrong:** 增加安全风险、需要加密存储、合规负担重、数据泄露后果严重。
**Do this instead:** API Key 通过 E2B SDK envs 直接注入沙箱环境变量，不经过 Portal 持久化。用户回访时，暂停的沙箱已包含环境变量，无需重新输入。

### Anti-Pattern 4: 为沙箱模式大幅重构 CodePilot 代码

**What people do:** 创建 CodePilot 的 "Web 版" 分支，删除所有 Electron 相关代码。
**Why it's wrong:** 维护两套代码，桌面端和云端功能分歧越来越大。
**Do this instead:** 用 `isElectron()` 条件判断做优雅降级。9 个文件的改动量非常小，保持单一代码库。

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| E2B Platform | JS SDK (`e2b` package) 在 Portal API Routes 中调用 | 需要 E2B API Key（`E2B_API_KEY` 环境变量） |
| Anthropic API | 沙箱内 Claude Agent SDK 直接调用 | 使用用户自带的 API Key，通过环境变量注入 |
| Vercel/Cloudflare | Portal 部署平台 | 无状态部署，标准 Next.js |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Portal <-> E2B Platform | E2B JS SDK (REST + gRPC) | Portal 是唯一调用 E2B SDK 的组件 |
| Portal <-> 用户浏览器 | HTTP API + 重定向 | API Key 提交 → 返回沙箱 URL → 浏览器跳转 |
| 用户浏览器 <-> 沙箱 | 直连 HTTPS (E2B 公开 URL) | Portal 不参与此通信，零中间层 |
| 沙箱内 CodePilot <-> AI API | HTTPS 出站 | 沙箱默认允许互联网访问 |
| 沙箱内 CodePilot 前端 <-> 后端 | localhost:3000 (Next.js SSR + API Routes) | 与现有架构完全一致 |

## Build Order (依赖关系与建议实施顺序)

构建各组件的依赖关系如下：

```
(1) Electron 降级层     ← 无外部依赖，可立即开始
    │
    ▼
(2) E2B 自定义模板      ← 依赖 (1) 完成后 CodePilot 能在纯 Web 下运行
    │
    ▼
(3) Portal 入口站点     ← 依赖 (2) 的模板 ID
    │
    ▼
(4) 持久化与回访       ← 依赖 (3) 的沙箱管理能力
```

**Phase 1: Electron 优雅降级**
- 添加 `src/lib/env.ts` 环境检测
- 改造 9 个 `electronAPI` 引用文件
- 验证 `npm run dev` 在普通浏览器中可用（不依赖 Electron）
- 无外部依赖，可立即开始

**Phase 2: E2B 沙箱模板**
- 编写 `e2b.Dockerfile` 预装 Node.js + Claude CLI + CodePilot
- 配置 `e2b.toml`（CPU、内存、启动命令、端口等待）
- `e2b template build` 构建并测试
- 验证沙箱内 Next.js 可通过公开 URL 访问
- 依赖 Phase 1 完成

**Phase 3: Portal 入口站点**
- 搭建独立 Next.js 项目
- 实现 Landing 页 + API Key 表单
- 实现沙箱创建/查询 API Routes
- 用户流程：输入 Key → 创建沙箱 → 跳转到沙箱 URL
- 依赖 Phase 2 的模板 ID

**Phase 4: 持久化与生产化**
- 启用 E2B autoPause
- 实现沙箱恢复流程（cookie/localStorage 记住 sandboxId）
- 沙箱状态管理（运行中/已暂停/已过期）
- 错误处理与用户引导

## E2B 平台关键参数

| Parameter | Recommended Value | Rationale |
|-----------|-------------------|-----------|
| CPU | 4 cores | Next.js + Claude SDK + better-sqlite3 编译 |
| Memory | 4096 MB | Next.js standalone + SQLite WAL |
| Timeout | 30 min | 合理的活跃会话时间 |
| Auto-pause | true | 节省成本，自动保存状态 |
| Base image | node:21-slim (Debian) | E2B 要求 Debian 系，Node 21 匹配项目需求 |
| Pause retention | 最长 30 天（E2B 限制） | 用户可在 30 天内恢复 |

## Sources

- [E2B Documentation](https://e2b.dev/docs) — 官方文档首页
- [E2B Sandbox Persistence](https://e2b.dev/docs/sandbox/persistence) — 暂停/恢复/快照机制
- [E2B Sandbox Internet Access](https://e2b.dev/docs/sandbox/internet-access) — 端口暴露和公开 URL
- [E2B Sandbox Templates](https://e2b.dev/docs/sandbox-template) — 自定义模板构建
- [E2B Next.js Template Example](https://e2b.dev/docs/template/examples/nextjs) — 官方 Next.js 模板示例
- [E2B Fragments](https://github.com/e2b-dev/fragments) — E2B 官方 Next.js + AI 参考架构
- [E2B GitHub](https://github.com/e2b-dev/E2B) — SDK 源码与架构细节
- [E2B Persistence Bug #884](https://github.com/e2b-dev/E2B/issues/884) — 多次暂停/恢复的文件丢失问题（2025 年报告）
- [AI Sandbox Comparison 2026](https://lifo.sh/blog/ai-sandbox-comparison-2026) — E2B vs 竞品对比

---
*Architecture research for: CodePilot Cloud -- E2B 沙箱云端开发环境*
*Researched: 2026-03-11*
