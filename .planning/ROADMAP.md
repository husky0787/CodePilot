# Roadmap: CodePilot Cloud

## Overview

将 CodePilot 部署到 E2B 云沙箱，分三个阶段交付：构建 E2B 沙箱模板让 CodePilot 在沙箱中运行（含必要的 Web 模式微调），搭建入口站点让用户一键启动沙箱，最后添加持久化和生产加固。每个阶段严格依赖前一阶段的产出。

> **已验证：** CodePilot 通过 `npm run dev` 已能在纯浏览器中正常运行，Electron IPC 调用均有 `?.` 守卫自动降级。原 Phase 1 (Web Mode Adaptation) 已无需单独执行，必要的小调整（0.0.0.0 绑定等）合并到 Phase 1。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: E2B Sandbox Template** - 构建预装全部依赖的自定义 E2B 沙箱模板，一键启动 CodePilot
- [ ] **Phase 2: Portal Entry Site** - 独立入口站点，用户输入 API Key 即可创建并进入云端沙箱
- [ ] **Phase 3: Persistence & Hardening** - 沙箱自动暂停/恢复、端口转发面板、生产环境加固
- [ ] **Phase 4: Retroactive Verification & Traceability Fix** - 补充 Phase 1/2 的 VERIFICATION.md，修复 SAND-04 traceability
- [x] **Phase 5: createdAt Cleanup Integration** - 修复 createdAt 参数传递，贯通 24h 服务端清理流程 (completed 2026-03-13)

## Phase Details

### Phase 1: E2B Sandbox Template
**Goal**: 自定义 E2B 沙箱模板预装全部运行时依赖，启动后用户通过公开 URL 即可访问完整 CodePilot
**Depends on**: Nothing (first phase)
**Requirements**: SAND-01, SAND-02, SAND-03, SAND-04
**Success Criteria** (what must be TRUE):
  1. E2B 沙箱从模板启动后 30 秒内，CodePilot Web UI 可通过沙箱公开 URL 访问
  2. 沙箱内 Claude Code CLI 可正常完成一轮完整对话（发送消息 -> 流式响应 -> 工具调用）
  3. better-sqlite3 在沙箱 Linux 环境中正常工作，会话历史和配置持久写入 SQLite
  4. Next.js 绑定 `0.0.0.0`，外部浏览器通过 E2B 端口暴露可正常访问全部页面
  5. Web 模式下无阻塞性 JS 报错，Electron 特有功能（安装向导、自动更新）自动降级
**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — 健康检查增强 + E2B 沙箱模板文件创建
- [ ] 01-02-PLAN.md — E2B 模板构建 + 端到端沙箱验证

### Phase 2: Portal Entry Site
**Goal**: 用户通过独立入口站点输入 API Key，一键创建沙箱并跳转到云端 CodePilot
**Depends on**: Phase 1
**Requirements**: PORT-01, PORT-02, PORT-03, LIFE-03
**Success Criteria** (what must be TRUE):
  1. 用户访问入口站点看到 Landing 页面，包含产品介绍、API Key 输入框和"启动沙箱"按钮
  2. 用户输入 Anthropic API Key 并点击启动后，浏览器在 30 秒内跳转到可用的 CodePilot 沙箱
  3. 用户关闭浏览器后重新访问入口站点，可恢复之前暂停的沙箱（通过 cookie/localStorage）
  4. Landing 页只输入 Anthropic API Key（其他 Provider Key 在沙箱内 CodePilot 设置页配置，per CONTEXT.md 锁定决策 LIFE-03）
**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — E2B SDK 安装 + API Key 验证 + 沙箱创建/状态 API Routes + 单元测试
- [ ] 02-02-PLAN.md — Landing 页面 + Cloud 组件（表单/进度/恢复）+ 端到端集成

### Phase 3: Persistence & Hardening
**Goal**: 沙箱在用户空闲后自动保存状态，CodePilot 提供端口转发面板，整体达到可发布质量
**Depends on**: Phase 2
**Requirements**: LIFE-01, LIFE-02
**Success Criteria** (what must be TRUE):
  1. 用户空闲超过设定时间后，沙箱自动暂停并保存完整文件系统和进程状态
  2. 用户恢复暂停的沙箱后，之前的对话历史、文件修改和配置全部保留
  3. CodePilot UI 中新增端口转发面板，展示沙箱内暴露的端口及可点击的预览链接
**Plans:** 3 plans

Plans:
- [ ] 03-01-PLAN.md — 沙箱生命周期后端（pause/resume 库函数 + 心跳/暂停/恢复 API + 限流 + 单元测试）
- [ ] 03-02-PLAN.md — 沙箱生命周期前端（空闲警告 + 心跳集成 + SandboxRestore 恢复 + 状态 API 增强）
- [ ] 03-03-PLAN.md — 端口转发面板（端口扫描 API + PortsPanel 组件 + RightPanel 集成）

### Phase 4: Retroactive Verification & Traceability Fix
**Goal**: 为 Phase 1 和 Phase 2 补充 VERIFICATION.md，修复 SAND-04 的 traceability 状态
**Depends on**: Phase 3
**Requirements**: SAND-01, SAND-02, SAND-03, SAND-04, PORT-01, PORT-02, PORT-03, LIFE-03
**Gap Closure:** Closes gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Phase 01 目录下存在 VERIFICATION.md，覆盖 SAND-01~04 全部需求的验证
  2. Phase 02 目录下存在 VERIFICATION.md，覆盖 PORT-01~03, LIFE-03 全部需求的验证
  3. REQUIREMENTS.md 中 SAND-04 状态从 `[ ] Pending` 更新为 `[x] Complete`
**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — Phase 1 VERIFICATION.md 撰写 + SAND-04 traceability 修复
- [ ] 04-02-PLAN.md — Phase 2 VERIFICATION.md 撰写

### Phase 5: createdAt Cleanup Integration
**Goal**: 修复 createdAt 参数传递链路，使服务端 24h 清理逻辑生效
**Depends on**: Phase 4
**Requirements**: LIFE-01
**Gap Closure:** Closes gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. SandboxLauncher.tsx 向 status API 传递 createdAt 查询参数
  2. SandboxRestore.tsx 向 status API 传递 createdAt 查询参数
  3. 服务端 24h cleanup-on-access 逻辑可被触发（非死代码）
**Plans:** 1/1 plans complete

Plans:
- [ ] 05-01-PLAN.md — 修复 SandboxLauncher + SandboxRestore 的 createdAt 参数传递 + 测试

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. E2B Sandbox Template | 0/2 | Planning complete | - |
| 2. Portal Entry Site | 0/2 | Planning complete | - |
| 3. Persistence & Hardening | 0/3 | Planning complete | - |
| 4. Retroactive Verification & Traceability Fix | 0/2 | Planning complete | - |
| 5. createdAt Cleanup Integration | 1/1 | Complete   | 2026-03-13 |
