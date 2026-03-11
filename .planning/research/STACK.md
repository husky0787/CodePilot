# Stack Research

**Domain:** E2B 沙箱云端部署 — 将 Next.js 桌面应用迁移到云沙箱环境
**Researched:** 2026-03-11
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| e2b (JS SDK) | ^2.14.1 | 沙箱生命周期管理（创建/暂停/恢复/销毁） | 官方主包，包含 Sandbox、Template、Commands、Filesystem 全部 API。`@e2b/sdk` 是旧包名，已统一到 `e2b`。**HIGH confidence** — npm 验证。 |
| @e2b/cli | ^2.7.2 | 本地开发时构建和测试沙箱模板 | 官方 CLI，支持 `e2b template build`、`e2b template init`、Build System 2.0 的 `Template.build()` 调用。**HIGH confidence** — npm 验证。 |
| Next.js | 16.1.6 | 沙箱内运行的 Web 应用（复用现有 CodePilot） | 与现有项目一致，无需切换。沙箱内以 `next dev` 或 `next start` 运行，通过 E2B 端口暴露。**HIGH confidence** — 已在用。 |
| Next.js | 16.x | 入口站点框架（独立项目） | 与主项目技术栈一致，降低维护成本。入口站部署到 Vercel，调用 E2B SDK 管理沙箱。**HIGH confidence**。 |
| @anthropic-ai/claude-code | latest | 沙箱内 Claude Code CLI | E2B 官方文档有 Claude Code 模板示例，使用 `npmInstall('@anthropic-ai/claude-code@latest', { g: true })` 全局安装。**HIGH confidence** — 官方示例验证。 |

### E2B Template 构建 (Build System 2.0)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| E2B Template API | SDK 内置 | 用代码定义沙箱模板，替代手写 Dockerfile | Build System 2.0 是当前推荐方式。比 e2b.Dockerfile 更快（缓存构建快 14 倍），可编程，支持 `Template().fromNodeImage().aptInstall().npmInstall()` 链式调用。**HIGH confidence** — 官方博客 + 文档验证。 |

**模板定义示例（TypeScript）：**

```typescript
import { Template } from 'e2b'

export const codepilotTemplate = Template()
  .fromNodeImage('24')                    // Node.js 24 基础镜像
  .aptInstall([
    'curl', 'git', 'ripgrep',            // Claude Code 依赖
    'build-essential', 'python3',          // better-sqlite3 编译依赖
  ])
  .npmInstall('@anthropic-ai/claude-code@latest', { g: true })
  // CodePilot 源码和依赖通过 copy + runCmd 安装
  .copy('package.json', '/app/package.json')
  .copy('package-lock.json', '/app/package-lock.json')
  .runCmd('cd /app && npm install --production')
  .copy('.next/', '/app/.next/')           // 预构建的 Next.js 产物
  .copy('src/', '/app/src/')
  .copy('public/', '/app/public/')
  .setEnvs({ NODE_ENV: 'production' })
  .setStartCmd(
    'cd /app && npx next start -p 3000',
    waitForURL('http://localhost:3000', 30_000)
  )
```

**构建脚本（build.ts）：**

```typescript
import { Template, defaultBuildLogger } from 'e2b'
import { codepilotTemplate } from './template'

Template.build(codepilotTemplate, 'codepilot-cloud', {
  cpuCount: 4,
  memoryMB: 4096,
  onBuildLogs: defaultBuildLogger(),
})
```

### 入口站点 (Portal)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x | 入口站 UI + API Routes | 统一技术栈。Server Actions 处理沙箱创建/恢复。 |
| Vercel | — | 入口站部署平台 | Next.js 原生支持，零配置部署，全球 CDN。E2B 自己的 dashboard 也用 Vercel。 |
| Tailwind CSS | 4.x | 入口站样式 | 与主项目一致。 |
| Radix UI | 1.x | 入口站组件 | 与主项目一致。 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-sqlite3 | ^12.6.2 | 沙箱内 SQLite 持久化（复用现有数据层） | 已在用。沙箱模板需要 `build-essential` + `python3` 以编译原生模块。E2B 基于 Debian，apt 安装即可。 |
| dotenv | ^16.x | 管理 E2B API Key 和环境变量 | 入口站本地开发时加载 `.env`。生产环境用 Vercel 环境变量。 |
| zod | ^3.x | 验证用户输入（API Key 格式、沙箱参数） | 入口站 API 路由验证。可选但推荐。 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| @e2b/cli | 本地构建和测试模板 | `npm install -g @e2b/cli`，需要 E2B API Key（`E2B_API_KEY` 环境变量）。 |
| E2B Dashboard | 在线监控沙箱状态、用量 | https://e2b.dev/dashboard，无需额外安装。 |

## Installation

```bash
# 入口站项目（新建独立项目）
npx create-next-app@latest codepilot-portal --typescript --tailwind --app
cd codepilot-portal
npm install e2b zod

# E2B CLI（全局安装，用于构建模板）
npm install -g @e2b/cli

# 在 CodePilot 主项目中添加模板构建脚本
# （不需要额外安装，e2b 包已包含 Template API）
npm install e2b  # 添加到 devDependencies
```

## E2B 核心 API 速查

### 沙箱生命周期

```typescript
import { Sandbox } from 'e2b'

// 创建沙箱
const sandbox = await Sandbox.create('codepilot-cloud', {
  envs: { ANTHROPIC_API_KEY: userApiKey },
  timeoutMs: 3600_000,  // 1 小时超时（Pro 最长 24 小时）
})

// 获取外部访问 URL
const host = sandbox.getHost(3000)
const url = `https://${host}`  // e.g. https://3000-xxx.e2b.app

// 暂停（保留完整状态：文件系统 + 内存 + 进程）
const sandboxId = sandbox.sandboxId
await sandbox.betaPause()  // ~4s per 1GB RAM

// 恢复（自动从暂停状态恢复）
const resumed = await Sandbox.connect(sandboxId)

// 销毁
await sandbox.kill()

// 列出所有暂停的沙箱
const paused = await Sandbox.list({ query: { state: ['paused'] } })
```

### 端口暴露

```typescript
// URL 格式：https://{port}-{sandboxId}.e2b.app
const host = sandbox.getHost(3000)

// 限制公开访问（需要 token 才能访问）
const sandbox = await Sandbox.create('codepilot-cloud', {
  network: { allowPublicTraffic: false },
})
// 请求时附带 token
fetch(`https://${host}`, {
  headers: { 'e2b-traffic-access-token': sandbox.trafficAccessToken },
})
```

### 文件操作

```typescript
// 上传文件到沙箱
const uploadUrl = sandbox.uploadUrl('/workspace/file.txt')
// 下载沙箱文件
const downloadUrl = sandbox.downloadUrl('/workspace/file.txt')
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| E2B Build System 2.0 (Template API) | e2b.Dockerfile 传统方式 | 如果需要极其复杂的环境配置（多阶段构建、自定义 apt 源），Dockerfile 灵活性更高。但 BS2.0 已支持 `fromDockerfile()` 迁移。 |
| `next start`（生产模式） | `next dev`（开发模式） | 开发模式有 HMR 但吃更多内存和 CPU。生产模式更省资源，沙箱成本更低。推荐生产模式。 |
| Vercel（入口站部署） | Cloudflare Pages / Fly.io | Vercel 对 Next.js 支持最好。如果需要更低成本或更多全球 PoP，可考虑 Cloudflare。 |
| betaPause/connect（持久化） | 每次新建沙箱 | 暂停/恢复保留完整状态（文件 + 进程 + 内存），用户体验远优于每次冷启动。但 betaPause 还在 beta，有已知的多次 pause/resume 后文件丢失 bug。 |
| better-sqlite3（复用现有） | 去掉 SQLite，用内存或远程 DB | 复用现有代码最省事。沙箱 pause/resume 会保留文件系统，SQLite 数据自然持久化。切换到远程 DB 改动太大。 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@e2b/sdk` | 旧包名，已被 `e2b` 主包取代。npm 上最后更新 4 个月前（v2.5.0），功能落后于 `e2b`（v2.14.1）。 | `e2b` |
| noVNC / 远程桌面方案 | 重量级，延迟高，CodePilot 本身就是 Web 应用，无需远程桌面。 | 直接暴露 Next.js 端口，浏览器直连。 |
| Docker-in-Docker / 自建沙箱 | 运维负担极大，安全隔离难做。E2B 提供现成基础设施。 | E2B 托管沙箱。 |
| Electron 层 | 沙箱是 Linux 无头环境，无法运行 Electron GUI。且用户通过浏览器访问，不需要桌面壳。 | Next.js Web 模式，剥离 Electron IPC/preload 依赖。 |
| e2b-code-interpreter | 这是 E2B 的代码执行器 SDK，适用于运行代码片段（Python notebook 场景），不适合运行完整 Web 应用。 | `e2b` 主包的 Sandbox API。 |
| Supabase/Postgres（入口站 v1） | v1 不做用户账号系统，无需数据库。沙箱 ID 可以临时存在客户端 localStorage 或 URL 参数中。 | 无数据库。未来加用户系统时再引入。 |

## Stack Patterns by Variant

**如果用户只需短期使用（< 1 小时）：**
- 创建沙箱 -> 用户使用 -> 超时自动暂停 -> 不恢复
- 无需持久化逻辑
- 最简单的实现路径

**如果用户需要长期项目（跨会话）：**
- 创建沙箱 -> 主动 betaPause() -> 存储 sandboxId
- 下次访问通过 Sandbox.connect() 恢复
- 需要入口站记住 sandboxId（localStorage 或后端数据库）
- 注意 betaPause 的已知 bug（多次 pause/resume 后文件可能丢失）

**如果需要限制沙箱访问（安全场景）：**
- `network: { allowPublicTraffic: false }` 禁止公开访问
- 请求时附带 `e2b-traffic-access-token`
- 入口站做代理转发，用户不直接持有沙箱 URL

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| e2b@2.14.1 | Node.js >= 18 | E2B SDK 要求 Node 18+。 |
| Next.js 16.1.6 | Node.js >= 18.18 | 沙箱模板用 Node 24 镜像，满足要求。 |
| better-sqlite3@12.6.2 | Node.js 18-24 | 需要 `build-essential` + `python3` 编译原生模块。E2B 沙箱是 Debian 基础，apt 安装即可。 |
| @e2b/cli@2.7.2 | e2b@2.x | CLI 和 SDK 主版本一致，API 兼容。 |
| Template Build System 2.0 | e2b@2.3.0+ | SDK 2.3.0 起支持 `Template()` 链式 API。 |

## E2B 平台限制

| 限制 | Hobby (免费) | Pro ($150/月) |
|------|-------------|---------------|
| 单次运行时长 | 1 小时 | 24 小时 |
| 并发沙箱数 | 20 | 更多（可定制） |
| 暂停保留期 | 30 天 | 30 天 |
| 按秒计费 | $100 一次性额度 | ~$0.05/小时/vCPU |
| 自定义 CPU/RAM | 不支持 | 支持 |

## 关键架构决策

### 1. 沙箱内运行模式：`next start`（生产）vs `next dev`（开发）

**推荐：`next start` 生产模式。**
- `next dev` 占用更多内存（HMR、增量编译），沙箱成本更高
- 用户不需要修改 CodePilot 源码，不需要 HMR
- 预构建 `.next/` 产物打入模板，启动更快
- 如果需要沙箱内编辑代码（未来功能），再考虑 dev 模式

### 2. Electron IPC 降级策略

CodePilot 有 Electron preload 依赖（`window.electronAPI`）。沙箱中无 Electron，需要：
- 检测运行环境（`typeof window.electronAPI === 'undefined'`）
- 对 Electron-only 功能（自动更新、原生菜单、文件对话框）做 Web 降级或隐藏
- `src/lib/platform.ts` 已有平台检测逻辑，可扩展

### 3. 用户 API Key 传递

- 用户在入口站输入 API Key
- 入口站通过 `Sandbox.create({ envs: { ANTHROPIC_API_KEY: key } })` 注入
- Key 只存在于沙箱环境变量中，入口站不持久化
- 沙箱 pause/resume 会保留环境变量

## Sources

- [E2B 官方文档 — 互联网访问与端口暴露](https://e2b.dev/docs/sandbox/internet-access) — getHost() API、端口暴露格式、流量控制 **HIGH confidence**
- [E2B SDK Reference — Sandbox 类](https://e2b.dev/docs/sdk-reference/js-sdk/v2.8.4/sandbox) — 完整 API 方法列表 **HIGH confidence**
- [E2B 官方文档 — 沙箱持久化](https://e2b.dev/docs/sandbox/persistence) — betaPause/connect、自动暂停、状态转换 **HIGH confidence**
- [E2B 官方文档 — 自定义模板](https://e2b.dev/docs/sandbox-template) — Template API、Build System 2.0 **HIGH confidence**
- [E2B 官方博客 — Build System 2.0](https://e2b.dev/blog/introducing-build-system-2-0) — BS2.0 与旧方式对比、性能提升 **HIGH confidence**
- [E2B 官方模板示例 — Claude Code](https://e2b.dev/docs/template/examples/claude-code) — Claude Code 安装模板 **HIGH confidence**
- [E2B 官方模板示例 — Next.js App](https://e2b.dev/docs/template/examples/nextjs) — Next.js 沙箱模板配置 **HIGH confidence**
- [E2B 定价页](https://e2b.dev/pricing) — 平台限制和计费 **HIGH confidence**
- [npm: e2b@2.14.1](https://www.npmjs.com/package/e2b) — 最新版本验证 **HIGH confidence**
- [npm: @e2b/cli@2.7.2](https://www.npmjs.com/package/@e2b/cli) — CLI 最新版本 **HIGH confidence**
- [GitHub Issue #884 — betaPause 文件丢失 bug](https://github.com/e2b-dev/E2B/issues/884) — 已知问题 **MEDIUM confidence**（bug 可能已修复）
- [E2B Dashboard 仓库](https://github.com/e2b-dev/dashboard) — Next.js 16 + React 19 + Supabase + Vercel **MEDIUM confidence**

---
*Stack research for: E2B sandbox cloud deployment for CodePilot*
*Researched: 2026-03-11*
