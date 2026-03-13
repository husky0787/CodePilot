# Phase 3: Persistence & Hardening - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

沙箱在用户空闲后自动暂停并保存状态，用户恢复后数据完整保留。CodePilot UI 新增端口转发面板展示沙箱内暴露的端口。入口站点增加生产加固（超时管理、限流、错误处理、日志）。涵盖 LIFE-01、LIFE-02 需求。用户账号体系、付费系统不在本阶段范围内。

</domain>

<decisions>
## Implementation Decisions

### 空闲检测与自动暂停
- 空闲超时时间固定 15 分钟
- 客户端心跳检测：CodePilot 前端定期发 heartbeat 到入口站 API，入口站跟踪最后活动时间
- 使用 E2B betaPause 暂停机制，保存文件系统和进程状态（#884 文件丢失风险通过测试验证 + 保护措施应对）
- 暂停前 2 分钟弹出倒计时警告栏，用户可点击延长
- 沙箱最大生命周期 24 小时，到期前警告用户保存工作，到期后强制暂停

### 端口转发面板
- 放在 AppShell 右侧面板新增 "Ports" tab，与现有 Files tab 并列
- 端口发现方式：沙箱内定期运行 ss/netstat 扫描监听端口，通过 API 返回结果
- 点击端口链接在新浏览器 tab 打开 E2B 端口公开 URL
- 仅在云端（E2B 沙箱）模式下显示 Ports tab，桌面版不显示

### 生产加固
- 沙箱超时管理：24 小时强制上限，入口站自动清理过期沙箱
- IP 级限流：每个 IP 每小时最多创建 N 个沙箱，防止滥用 E2B 资源
- 错误处理增强：沙箱创建/恢复失败时自动重试 1-2 次，仍失败则显示明确错误提示和建议操作
- 监控方案：console 日志 + Vercel 自带 Function Logs，零额外成本

### Claude's Discretion
- 心跳间隔和具体 heartbeat API 设计
- betaPause 保护措施的具体实现（如暂停前 flush、校验恢复完整性）
- 端口扫描频率和 API 端点设计
- 云端模式检测的具体实现方式（环境变量 vs URL 判断）
- IP 限流的具体阈值和实现方式（内存 vs KV）
- 倒计时警告和到期警告的具体 UI 实现
- 过期沙箱清理的触发方式（定时 vs 访问时清理）

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/site/src/lib/e2b.ts`: 已有 `createSandbox()`、`checkSandbox()` 封装，可扩展 pause/resume 方法
- `apps/site/src/lib/sandbox-storage.ts`: localStorage 沙箱 ID 管理，可扩展存储暂停状态
- `apps/site/src/components/cloud/SandboxRestore.tsx`: 已有沙箱恢复 UI 组件
- `apps/site/src/app/api/sandbox/status/route.ts`: 沙箱状态检查 API，可扩展暂停/恢复操作
- `src/components/layout/AppShell.tsx`: 右侧面板已有 resizable panel + tab 结构，可新增 Ports tab
- `src/app/api/health/route.ts`: 沙箱内健康检查端点，心跳可复用

### Established Patterns
- AppShell 使用 PanelContext 管理面板状态，右侧面板支持多 tab
- API Routes 在 `src/app/api/` 和 `apps/site/src/app/api/` 下，RESTful 风格
- Electron IPC 使用 `?.` 可选链守卫，云端检测可用类似模式
- E2B SDK `Sandbox.create()` / `Sandbox.connect()` 已有使用模式

### Integration Points
- 心跳 API 需添加到 `apps/site/src/app/api/sandbox/` 下
- 端口扫描 API 需添加到 CodePilot 主应用 `src/app/api/` 下
- Ports tab 需集成到 AppShell 右侧面板
- 云端模式检测需要在前端判断是否显示 Ports tab 和心跳逻辑
- betaPause/resume 需扩展 `apps/site/src/lib/e2b.ts`

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

*Phase: 03-persistence-hardening*
*Context gathered: 2026-03-13*
