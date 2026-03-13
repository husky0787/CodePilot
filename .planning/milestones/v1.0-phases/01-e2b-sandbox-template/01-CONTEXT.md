# Phase 1: E2B Sandbox Template - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

构建预装全部运行时依赖的自定义 E2B 沙箱模板，启动后用户通过公开 URL 即可访问完整 CodePilot Web UI。涵盖 SAND-01 至 SAND-04 需求。入口站点（Phase 2）和持久化（Phase 3）不在本阶段范围内。

</domain>

<decisions>
## Implementation Decisions

### 运行模式
- 沙箱内使用 `npm run dev` (Dev Server) 模式运行，不做 standalone 生产构建
- 启动脚本轮询健康检查端点（如 /api/health），确认 Next.js + SQLite + Claude CLI 全部就绪后才标记沙箱可用
- CodePilot 版本更新时重建 E2B 模板，不做启动时 git pull
- 对模板体积无特殊要求，确保能跑即可

### 模板构建策略
- 使用 E2B 提供的默认基础镜像（已预装 Node.js 等常用工具）
- better-sqlite3 在 Dockerfile 构建阶段编译（安装 build-essential/python3 等编译工具链），沙箱启动时无需再编译
- 不做多阶段构建或体积优化

### Claude CLI 安装
- 在 Dockerfile 中预装 Claude Code CLI（npm install -g @anthropic-ai/claude-code@固定版本）
- 版本固定在 Dockerfile 中，更新时重建模板
- 用户 API Key 通过 E2B SDK 设置环境变量 ANTHROPIC_API_KEY 注入沙箱
- 必须跳过 CLI 首次运行的交互式授权流程（通过环境变量或预写配置文件）

### Web 模式适配
- Next.js 绑定 0.0.0.0 通过启动参数 `--hostname 0.0.0.0` 实现，不修改 next.config.ts
- Electron 特有功能（安装向导、自动更新、原生对话框）静默降级，依赖现有 `?.` 守卫即可
- 不添加 Web 模式环境变量标志（如 CODEPILOT_WEB_MODE），现有守卫足够
- 不显示"云端模式"标识或额外品牌标记，与桌面版体验一致

### Claude's Discretion
- 健康检查端点的具体实现（新建路由 vs 复用现有端点）
- 启动脚本的具体 shell 逻辑和超时策略
- E2B Dockerfile 的具体层结构和缓存优化
- CLI 跳过授权的具体技术手段（环境变量 vs 配置文件预写）

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `next.config.ts`: 已配置 `output: 'standalone'` 和 `serverExternalPackages: ['better-sqlite3', ...]`
- `src/lib/platform.ts`: Claude CLI 二进制发现逻辑，沙箱中需确保 CLI 在其搜索路径上
- `src/components/layout/InstallWizard.tsx`: 使用 `window.electronAPI?.install` 守卫，Web 模式自动跳过
- `src/hooks/useNativeFolderPicker.ts`: Electron 原生对话框使用，有 `?.` 守卫

### Established Patterns
- Electron IPC 调用全局使用 `?.` 可选链守卫，Web 模式下自动降级为 undefined
- API 路由在 `src/app/api/` 下，新建健康检查路由符合现有结构
- 数据库路径通过 `CLAUDE_GUI_DATA_DIR` 环境变量可配，沙箱中可指定
- API Key 存储在 SQLite `api_providers` 表中，同时 Electron main 会从 shell env 继承

### Integration Points
- E2B 端口暴露机制需映射 Next.js 默认端口 3000
- `platform.ts` 的 `findClaudeBinary()` 需确保沙箱中 CLI 路径可被发现
- `src/lib/db.ts` 的 better-sqlite3 需在 Linux x64 环境正常加载

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-e2b-sandbox-template*
*Context gathered: 2026-03-11*
