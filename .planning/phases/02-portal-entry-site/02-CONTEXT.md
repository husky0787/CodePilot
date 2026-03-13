# Phase 2: Portal Entry Site - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

独立入口站点，用户输入 Anthropic API Key 即可一键创建 E2B 沙箱并跳转到云端 CodePilot。支持恢复已有沙箱。涵盖 PORT-01、PORT-02、PORT-03、LIFE-03 需求。Landing 页设计（视觉/内容）由 Claude 自行决定。沙箱持久化和端口转发面板属于 Phase 3。

</domain>

<decisions>
## Implementation Decisions

### 站点架构
- 在现有 `apps/site`（fumadocs 文档站）基础上扩展，不新建独立项目
- Landing 页作为 `apps/site/src/app/page.tsx`，E2B 后端 API 在 `apps/site/src/app/api/sandbox/`
- 部署到 Vercel，API Routes 自动变 Serverless Functions
- 先用 Vercel 默认域名（.vercel.app），后续再绑定自定义域名
- E2B API Key 存在 Vercel 服务端环境变量中，用户不可见，平台方承担沙箱费用

### API Key 输入交互
- Landing 页只显示 Anthropic API Key 输入框（必填），其他 Provider Key 可在进入沙箱后通过 CodePilot 设置页配置
- API Key 不保存在浏览器 localStorage，每次访问重新输入（安全优先）
- 点击"启动沙箱"后，服务端先用 Key 发送轻量级 API 请求验证有效性，验证通过后再创建沙箱
- Key 验证失败时在前端显示明确错误提示

### 启动等待体验
- 在入口站内显示启动进度状态（创建沙箱→启动服务→就绪），确认沙箱可用后再跳转
- 不立即跳转到沙箱 URL，避免用户看到连接失败页面
- 沙箱启动预计 ~30 秒

### 沙箱恢复流程
- 通过 localStorage 记录沙箱 ID，回访时自动检查沙箱状态
- 沙箱仍活跃时，显示"恢复上次沙箱"和"创建新沙箱"两个选项
- 恢复沙箱不需要重新输入 API Key（沙箱环境变量仍存在）
- 沙箱已过期或不可用时，静默清除 localStorage 中的旧 ID，显示正常的新建流程，不额外提示

### Claude's Discretion
- Landing 页的视觉设计、内容结构和文案调性
- API Key 验证的具体实现方式（调用哪个 Anthropic API 端点）
- 启动进度的具体 UI 实现（进度条/步骤指示器/动画）
- localStorage 中沙箱 ID 的数据结构
- 错误处理和边界情况的具体 UX

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/site/`: 已有 Next.js + Tailwind + shadcn 基础设施，fumadocs 文档站，端口 3001
- `apps/site/package.json`: 已有 framer-motion、lucide-react、shadcn 等 UI 依赖
- E2B 模板 ID `9114lthidrvmoik0fcdw`（来自 `e2b.toml`）
- 主项目 `src/app/api/health/route.ts`：沙箱健康检查端点，可用于轮询沙箱就绪状态

### Established Patterns
- monorepo workspace 结构：`apps/*` 和 `packages/*`
- Next.js App Router + API Routes 模式
- shadcn/ui + Radix UI 组件体系
- Tailwind CSS 样式系统

### Integration Points
- E2B SDK (`e2b` npm 包) 需添加到 `apps/site/package.json`
- 沙箱创建时需注入 `ANTHROPIC_API_KEY` 环境变量（E2B SDK `Sandbox.create()` 的 envs 参数）
- 沙箱公开 URL 通过 E2B SDK 的 `sandbox.getHost(3000)` 获取
- 沙箱启动脚本 `/home/user/start.sh` 已配置，健康检查端点 `/api/health` 已就绪

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

*Phase: 02-portal-entry-site*
*Context gathered: 2026-03-13*
