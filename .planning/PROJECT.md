# CodePilot Cloud — E2B 沙箱云端开发环境

## What This Is

将 CodePilot（Claude Code 的桌面 GUI 客户端）部署到 E2B 云沙箱中，让用户无需安装即可通过浏览器使用完整的 CodePilot 功能。独立的 Next.js 入口站点提供一键启动、沙箱恢复和生命周期管理。

## Core Value

用户通过浏览器一键获得完整的 CodePilot 云端开发环境，无需本地安装任何东西。

## Requirements

### Validated

- ✓ E2B 沙箱适配 — CodePilot 以 Web 模式在 E2B 沙箱中运行，Electron IPC 自动降级 — v1.0
- ✓ 沙箱模板 — 预装 Node.js、Claude Code CLI、better-sqlite3、全部依赖 — v1.0
- ✓ 浏览器直连 — Next.js 绑定 0.0.0.0，通过 E2B 端口暴露供外部访问 — v1.0
- ✓ 完整 UI — 用户通过浏览器 URL 访问完整 Chat/文件/工具 UI — v1.0
- ✓ 入口站点 — Landing 页 + 一键启动沙箱按钮 — v1.0
- ✓ 沙箱创建 — E2B SDK 创建实例，注入 API Key，返回访问 URL — v1.0
- ✓ 沙箱恢复 — localStorage 记录沙箱 ID，支持恢复暂停沙箱 — v1.0
- ✓ 自动暂停 — 空闲超时自动暂停，保存完整文件系统和进程状态 — v1.0
- ✓ 端口转发面板 — 展示沙箱端口及可点击的 E2B 公开 URL — v1.0
- ✓ 多 Provider Key — 用户在沙箱内 Settings 配置多个 AI Provider Key — v1.0

### Active

(Next milestone requirements TBD — run `/gsd:new-milestone` to define)

### Out of Scope

- Electron 桌面端改造 — 沙箱环境直接用 Next.js Web 模式，不需要 Electron
- noVNC/远程桌面方案 — 已确认使用浏览器直连 Next.js 方案，轻量低延迟
- 平台代理 API Key — 用户自带 Key，不做计费系统，合规风险低
- 用户注册/登录体系 — v1 不做用户账号系统，增加数月工作量
- 移动端适配 — 优先桌面浏览器体验，云端 IDE 移动端体验差
- 7x24 常驻沙箱 — E2B 最长 24h，违背沙箱模型
- 实时协作 — 复杂度极高，无限推迟

## Context

**v1.0 已发布。** ~64,647 行 TypeScript 代码。
Tech stack: Next.js App Router + E2B SDK + better-sqlite3。
入口站点与 CodePilot 主体同仓库，通过路由分离。

**架构特点：**
- CodePilot 本身是 Next.js 全栈应用，Electron 只是壳
- E2B 沙箱运行 `next start` 生产模式（dev 模式 OOM）
- 沙箱生命周期：心跳续期 → 空闲警告 → 自动暂停 → 按需恢复
- 24h 最大生存期，服务端 cleanup-on-access 清理

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 浏览器直连而非 noVNC | 轻量、低延迟，CodePilot 本身就是 Next.js 应用 | ✓ Good |
| 独立 Next.js 入口站点 | 关注点分离，入口站和 CodePilot 主体独立部署 | ✓ Good |
| 用户自带 API Key | 简化架构，无需计费系统，降低合规风险 | ✓ Good |
| E2B 原生持久化 | 利用 E2B pause/resume 功能，无需额外存储方案 | ✓ Good |
| 去掉 Electron 层 | 沙箱环境无需桌面壳，直接用 Next.js Web 模式 | ✓ Good |
| dev→prod 模式 | npm run dev 在 1024MB 沙箱中 OOM，改为 build + start | ✓ Good |
| Claude CLI 版本固定 | Dockerfile 中固定版本号，更新时重建模板 | ✓ Good |
| fetch 验证 API Key | 使用 count_tokens 端点，不引入 @anthropic-ai/sdk | ✓ Good |
| API Key 移至沙箱内设置 | LIFE-03 决策：入口不输 Key，进沙箱后在 Settings 配置 | ✓ Good |
| pause() 优先于 betaPause() | 运行时 fallback 兼容 E2B SDK 版本 | ✓ Good |
| 心跳仅从 portal tab 发送 | E2B timeout (~30min) 作为 tab 关闭后的 fallback | ✓ Good |

## Constraints

- **Tech Stack**: 入口站点使用 Next.js，与主项目技术栈一致
- **E2B 依赖**: 沙箱运行时依赖 E2B 平台，需要 E2B API Key
- **Claude Code CLI**: 沙箱中必须安装 Claude Code CLI 才能使用核心 AI 功能
- **原生模块**: better-sqlite3 需要在沙箱的 Linux 环境中编译
- **端口暴露**: E2B 沙箱需要暴露 Next.js 端口供外部浏览器访问
- **内存限制**: 1024MB 沙箱，必须使用生产模式

---
*Last updated: 2026-03-13 after v1.0 milestone*
