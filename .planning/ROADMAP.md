# Roadmap: CodePilot Cloud

## Overview

将 CodePilot 从 Electron 桌面应用迁移到 E2B 云沙箱，分四个阶段交付：先剥离 Electron 依赖让 CodePilot 在浏览器中独立运行，再构建 E2B 沙箱模板，然后搭建入口站点让用户一键启动沙箱，最后添加持久化和生产加固。每个阶段严格依赖前一阶段的产出。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Web Mode Adaptation** - 剥离 Electron 耦合，CodePilot 以纯 Next.js 模式在浏览器中完整运行
- [ ] **Phase 2: E2B Sandbox Template** - 构建预装全部依赖的自定义 E2B 沙箱模板，一键启动 CodePilot
- [ ] **Phase 3: Portal Entry Site** - 独立入口站点，用户输入 API Key 即可创建并进入云端沙箱
- [ ] **Phase 4: Persistence & Hardening** - 沙箱自动暂停/恢复、端口转发面板、生产环境加固

## Phase Details

### Phase 1: Web Mode Adaptation
**Goal**: CodePilot 在任意浏览器中以纯 Next.js Web 模式完整运行，不依赖 Electron shell
**Depends on**: Nothing (first phase)
**Requirements**: SAND-01, SAND-03, SAND-04
**Success Criteria** (what must be TRUE):
  1. 用户通过浏览器访问 `http://localhost:3000` 能看到完整的 CodePilot Chat/文件/工具 UI，无 JS 报错
  2. 所有 Electron IPC 调用（文件夹选择、shell.openPath、自动更新等）在 Web 模式下优雅降级，不阻塞核心功能
  3. Next.js 绑定 `0.0.0.0` 时外部浏览器可正常访问全部页面
  4. InstallWizard 在 Web/沙箱模式下自动跳过，用户直接进入主界面
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: E2B Sandbox Template
**Goal**: 自定义 E2B 沙箱模板预装全部运行时依赖，启动后用户通过公开 URL 即可访问完整 CodePilot
**Depends on**: Phase 1
**Requirements**: SAND-02
**Success Criteria** (what must be TRUE):
  1. E2B 沙箱从模板启动后 30 秒内，CodePilot Web UI 可通过沙箱公开 URL 访问
  2. 沙箱内 Claude Code CLI 可正常完成一轮完整对话（发送消息 -> 流式响应 -> 工具调用）
  3. better-sqlite3 在沙箱 Linux 环境中正常工作，会话历史和配置持久写入 SQLite
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Portal Entry Site
**Goal**: 用户通过独立入口站点输入 API Key，一键创建沙箱并跳转到云端 CodePilot
**Depends on**: Phase 2
**Requirements**: PORT-01, PORT-02, PORT-03, LIFE-03
**Success Criteria** (what must be TRUE):
  1. 用户访问入口站点看到 Landing 页面，包含产品介绍、API Key 输入框和"启动沙箱"按钮
  2. 用户输入 Anthropic API Key 并点击启动后，浏览器在 30 秒内跳转到可用的 CodePilot 沙箱
  3. 用户关闭浏览器后重新访问入口站点，可恢复之前暂停的沙箱（通过 cookie/localStorage）
  4. 用户可输入多个 AI Provider 的 API Key（Anthropic/OpenAI/Google），全部注入沙箱环境变量
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Persistence & Hardening
**Goal**: 沙箱在用户空闲后自动保存状态，CodePilot 提供端口转发面板，整体达到可发布质量
**Depends on**: Phase 3
**Requirements**: LIFE-01, LIFE-02
**Success Criteria** (what must be TRUE):
  1. 用户空闲超过设定时间后，沙箱自动暂停并保存完整文件系统和进程状态
  2. 用户恢复暂停的沙箱后，之前的对话历史、文件修改和配置全部保留
  3. CodePilot UI 中新增端口转发面板，展示沙箱内暴露的端口及可点击的预览链接
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Web Mode Adaptation | 0/? | Not started | - |
| 2. E2B Sandbox Template | 0/? | Not started | - |
| 3. Portal Entry Site | 0/? | Not started | - |
| 4. Persistence & Hardening | 0/? | Not started | - |
